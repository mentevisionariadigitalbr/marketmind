# ADR-0001 — Monorepo com Turborepo + pnpm

**Status:** Aceito · **Data:** 2026-06-15

## Contexto

O produto tem API (NestJS), workers, web (Next.js), mobile (React Native) e um SDK próprio do
Mercado Livre. Esses artefatos compartilham contratos (DTOs/Zod), design system e configuração.
Precisamos de consistência de tipos ponta a ponta e build incremental.

## Decisão

Monorepo único com **pnpm workspaces** + **Turborepo** para orquestração e cache de tarefas.
`apps/*` para deployáveis; `packages/*` para código compartilhado (contracts, sdk, ui, config).

## Alternativas consideradas

- **Polyrepo:** isolamento forte, mas duplicação de contratos e versionamento custoso entre repos.
- **Nx:** poderoso, porém mais opinativo e pesado do que precisamos agora.

## Consequências

- (+) Tipos compartilhados api↔web↔mobile sem publicar pacotes.
- (+) Cache de build/test acelera CI.
- (−) Disciplina de boundaries entre packages é responsabilidade do time (lint de import).
- (−) Pipelines precisam de filtros por workspace afetado.
