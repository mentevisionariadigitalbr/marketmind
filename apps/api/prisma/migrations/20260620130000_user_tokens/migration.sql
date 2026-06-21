-- MarketMind AI — Tokens de uso único (Fase 4): reset de senha + verificação. RLS.

CREATE TYPE "UserTokenType" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION');

CREATE TABLE "user_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "type" "UserTokenType" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_tokens_token_hash_key" ON "user_tokens"("token_hash");
CREATE INDEX "user_tokens_user_id_type_idx" ON "user_tokens"("user_id", "type");
CREATE INDEX "user_tokens_company_id_idx" ON "user_tokens"("company_id");

ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grant + RLS (mesmo padrão do projeto).
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_tokens" TO marketmind_app;

ALTER TABLE "user_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_tokens" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "user_tokens"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
