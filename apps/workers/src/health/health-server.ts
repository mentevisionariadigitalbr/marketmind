import { createServer, Server } from 'node:http';
import { BullMqQueueProvider, MetricsRegistry } from '@marketmind/queue';
import { PrismaService } from '../../../api/src/shared/prisma/prisma.service';

async function checkDb(prisma: PrismaService): Promise<boolean> {
  try {
    await prisma.db.$queryRawUnsafe('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Servidor HTTP mínimo de saúde/observabilidade do worker:
 *  - /liveness  : o processo está vivo
 *  - /readiness : pronto para receber carga (PG + Redis ok) — /health = alias
 *  - /metrics   : exposição Prometheus
 */
export function startHealthServer(deps: {
  port: number;
  prisma: PrismaService;
  provider: BullMqQueueProvider;
  metrics: MetricsRegistry;
}): Server {
  const server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0];

    if (url === '/liveness') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'alive' }));
      return;
    }

    if (url === '/metrics') {
      res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4' });
      res.end(deps.metrics.prometheus());
      return;
    }

    if (url === '/health' || url === '/readiness') {
      void Promise.all([checkDb(deps.prisma), deps.provider.ping().catch(() => false)]).then(
        ([postgres, redis]) => {
          const ok = postgres && redis;
          res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ status: ok ? 'ok' : 'degraded', checks: { postgres, redis } }));
        },
      );
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  server.listen(deps.port);
  return server;
}
