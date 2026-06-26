-- MarketMind AI — Multi-marketplace (Fase 3, Inc.4): canal manual.
-- Permite consolidar vendas de fora do ML (loja física, outro marketplace, CSV).

ALTER TYPE "MarketplaceCode" ADD VALUE IF NOT EXISTS 'MANUAL';
