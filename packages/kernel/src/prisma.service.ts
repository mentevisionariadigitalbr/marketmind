import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { getTenant } from './tenant-context';

/** Armazena o client da transação corrente para que os repositórios o reutilizem. */
const txStorage = new AsyncLocalStorage<Prisma.TransactionClient>();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * Referência ao Proxy do PrismaClient. O PrismaClient devolve um Proxy que
   * materializa os delegates de modelo (`user`, `role`, ...); dentro de um getter,
   * `this` é o alvo do Proxy (sem delegates). Capturamos o Proxy aqui (após super,
   * `this` JÁ é o Proxy) para que `db` devolva um client com delegates.
   */
  private readonly self: PrismaClient;

  constructor() {
    // Em runtime a API conecta com a role de menor privilégio (sujeita ao RLS).
    // Migrations seguem usando DATABASE_URL (owner). Ver ADR-0002.
    const url = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
    super(url ? { datasourceUrl: url } : {});
    this.self = this;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Client a ser usado nas queries: o da transação corrente (se houver) ou o raiz. */
  get db(): Prisma.TransactionClient {
    return txStorage.getStore() ?? (this.self as unknown as Prisma.TransactionClient);
  }

  /**
   * Executa `work` dentro de uma transação. Transações aninhadas reusam a corrente
   * (mesma unidade de trabalho), evitando deadlocks.
   *
   * Quando há um TenantContext ativo, fixa `app.current_company` na conexão da
   * transação (escopo local — `set_config(..., true)`), ativando as policies de
   * Row-Level Security para todas as queries tenant-scoped da unidade de trabalho.
   */
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (txStorage.getStore()) {
      return work();
    }
    const tenant = getTenant();
    return this.$transaction(async (client) => {
      if (tenant) {
        await client.$executeRaw`SELECT set_config('app.current_company', ${tenant.companyId}, true)`;
      }
      return txStorage.run(client as Prisma.TransactionClient, work);
    });
  }
}
