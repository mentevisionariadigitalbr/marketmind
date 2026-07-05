-- MarketMind AI — registra o marketplace MANUAL (canal de vendas manuais/CSV).
-- Separado da migration do enum (o valor precisa estar commitado antes de usar).

INSERT INTO "marketplaces" ("id", "code", "name", "created_at")
VALUES (gen_random_uuid(), 'MANUAL', 'Manual / Outros', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
