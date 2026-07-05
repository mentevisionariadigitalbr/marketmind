-- MarketMind AI — Super-admin de plataforma (Fase 7, Inc.1). Identidade SEPARADA
-- do RBAC de tenant: sem company_id, JWT com segredo próprio. Tabela global, SEM
-- RLS (não contém dados de cliente — como plans/marketplaces).

CREATE TABLE "platform_admins" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- A role de app pode autenticar admins (ler/atualizar lastLogin). Sem RLS.
GRANT SELECT, INSERT, UPDATE ON "platform_admins" TO marketmind_app;
