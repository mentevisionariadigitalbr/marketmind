import { DomainError } from '@marketmind/kernel';
import { MarketplaceCode } from './marketplace-code';
import { MarketplaceAdapter, MarketplaceProvider } from './marketplace-adapter';
import { MarketplaceAccountRef } from './marketplace-account';

export class MarketplaceUnsupportedError extends DomainError {
  constructor(code: string) {
    super(`Marketplace "${code}" não suportado/registrado.`, 'MARKETPLACE_UNSUPPORTED');
  }
}

/**
 * Registry central de marketplaces. Novos marketplaces (Shopee/Amazon/Magalu)
 * são adicionados via `register()` — SEM alterar código existente (Open/Closed).
 */
export class MarketplaceRegistry {
  private readonly providers = new Map<MarketplaceCode, MarketplaceProvider>();

  register(provider: MarketplaceProvider): this {
    this.providers.set(provider.code, provider);
    return this;
  }

  has(code: MarketplaceCode): boolean {
    return this.providers.has(code);
  }

  resolve(code: MarketplaceCode): MarketplaceProvider {
    const provider = this.providers.get(code);
    if (!provider) throw new MarketplaceUnsupportedError(code);
    return provider;
  }

  adapterFor(code: MarketplaceCode): MarketplaceAdapter {
    return this.resolve(code).createAdapter();
  }

  list(): MarketplaceCode[] {
    return [...this.providers.keys()];
  }
}

/** Resolve o adapter correto a partir de uma conta. */
export class MarketplaceFactory {
  constructor(private readonly registry: MarketplaceRegistry) {}

  forAccount(account: MarketplaceAccountRef): MarketplaceAdapter {
    return this.registry.adapterFor(account.marketplaceCode);
  }

  forCode(code: MarketplaceCode): MarketplaceAdapter {
    return this.registry.adapterFor(code);
  }
}
