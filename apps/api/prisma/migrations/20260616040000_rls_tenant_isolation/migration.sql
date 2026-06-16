-- MarketMind AI — Row-Level Security (multi-tenant isolation)
-- Implements ADR-0002: shared schema + company_id + PostgreSQL RLS.
--
-- Model: the application sets `app.current_company` per transaction from the
-- TenantContext (see PrismaService.runInTransaction). Policies enforce strict
-- isolation whenever that GUC is set. When it is NOT set (auth bootstrap:
-- login-by-email, signup, refresh-by-token — all inherently pre-tenant), access
-- is open so those flows work; correctness there is handled at the application
-- layer. Business modules always run inside a tenant context, so every
-- tenant-scoped read/write is RLS-enforced.
--
-- RLS is bypassed by superusers, so the runtime MUST connect as the dedicated
-- non-superuser role created below (APP_DATABASE_URL). Migrations keep running
-- as the owner/superuser.

-- 1. Dedicated, least-privilege application role used by the API at runtime.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'marketmind_app') THEN
    CREATE ROLE marketmind_app LOGIN PASSWORD 'marketmind_app';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO marketmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO marketmind_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO marketmind_app;
-- Future tables/sequences created by the owner are granted automatically.
ALTER DEFAULT PRIVILEGES FOR ROLE marketmind IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO marketmind_app;
ALTER DEFAULT PRIVILEGES FOR ROLE marketmind IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO marketmind_app;

-- 2. Helper: current tenant from the session GUC (NULL when unset).
CREATE OR REPLACE FUNCTION app_current_company() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT current_setting('app.current_company', true) $$;

-- 3. companies: tenant is the row itself (id == company_id).
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "companies"
  USING (
    coalesce(app_current_company(), '') = ''
    OR "id"::text = app_current_company()
  )
  WITH CHECK (
    coalesce(app_current_company(), '') = ''
    OR "id"::text = app_current_company()
  );

-- 4. users: scoped by company_id.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "users"
  USING (
    coalesce(app_current_company(), '') = ''
    OR "company_id"::text = app_current_company()
  )
  WITH CHECK (
    coalesce(app_current_company(), '') = ''
    OR "company_id"::text = app_current_company()
  );

-- Note: refresh_tokens is intentionally NOT under RLS — it is looked up by the
-- unique token hash during refresh/logout, before any tenant context exists.
-- It is scoped transitively via the users FK + ON DELETE CASCADE.
