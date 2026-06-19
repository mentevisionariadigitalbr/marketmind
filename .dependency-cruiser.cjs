/**
 * Validação arquitetural (Sprint 2.7). Regra de dependência:
 *   apps/* -> integration-core/marketplace-core -> kernel
 * Nenhuma app pode depender de outra app.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-workers-to-api',
      severity: 'error',
      comment: 'apps/workers NÃO pode importar apps/api.',
      from: { path: '^apps/workers' },
      to: { path: '^apps/api' },
    },
    {
      name: 'no-api-to-workers',
      severity: 'error',
      comment: 'apps/api NÃO pode importar apps/workers.',
      from: { path: '^apps/api' },
      to: { path: '^apps/workers' },
    },
    {
      name: 'no-web-to-apps',
      severity: 'error',
      comment: 'apps/web NÃO pode importar apps/api ou apps/workers.',
      from: { path: '^apps/web' },
      to: { path: '^apps/(api|workers)' },
    },
    {
      name: 'packages-no-apps',
      severity: 'error',
      comment: 'packages/* NÃO podem depender de apps/*.',
      from: { path: '^packages' },
      to: { path: '^apps' },
    },
    {
      name: 'core-no-app-frameworks-leak',
      severity: 'error',
      comment: 'integration-core/kernel não dependem de apps.',
      from: { path: '^packages/(kernel|integration-core|marketplace-core)' },
      to: { path: '^apps' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Sem dependências circulares.',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    exclude: { path: '(\\.spec\\.ts$|/dist/|/test/|__fixtures__)' },
  },
};
