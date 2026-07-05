-- MarketMind AI — Verificação de e-mail (Fase 4): coluna não-bloqueante em users.
-- Nulo = e-mail não verificado. A tabela users já possui RLS por empresa.

ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMPTZ(6);
