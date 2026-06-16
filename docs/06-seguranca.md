# 06 — Segurança & Compliance

## 1. Autenticação & Autorização

- **JWT** de acesso curto (15 min) + **refresh token rotativo** (httpOnly, secure, sameSite),
  persistido com hash e invalidado a cada uso (detecção de reuso → revoga sessão).
- **Google OAuth** para login social; conta vinculada por `google_id`.
- **RBAC** com `roles`/`permissions` por tenant; guard declarativo `@RequirePermission('finance:read')`.
- Senhas com **argon2id**.

## 2. Multi-tenant / Isolamento

- `company_id` obrigatório em dados tenant-scoped.
- **PostgreSQL Row-Level Security** como linha de defesa primária (não confia só na aplicação).
- `TenantContext` via `AsyncLocalStorage` define `SET LOCAL app.current_company` por transação.
- Testes e2e específicos provando que tenant A não acessa dados de B.

## 3. Criptografia

- **Em trânsito:** TLS 1.2+ ponta a ponta (Cloudflare na borda).
- **Em repouso:** banco criptografado (Supabase) + tokens de marketplace e segredos de webhook
  criptografados em coluna (`*_enc`) com chave gerenciada (KMS/variável de ambiente rotacionável).
- Segredos nunca em log nem em repositório (gestão via secret manager).

## 4. OWASP Top 10 — mitigações

| Risco | Mitigação |
|-------|-----------|
| A01 Broken Access Control | RBAC + RLS + testes de isolamento de tenant. |
| A02 Cryptographic Failures | argon2id, TLS, colunas criptografadas, KMS. |
| A03 Injection | Prisma (queries parametrizadas), validação Zod/class-validator em toda entrada. |
| A04 Insecure Design | Threat modeling por bounded context; ports/adapters reduzem superfície. |
| A05 Security Misconfiguration | Helmet, CORS restritivo, headers seguros, imagens mínimas. |
| A06 Vulnerable Components | Renovate/Dependabot + `pnpm audit` no CI. |
| A07 Auth Failures | Rate limit em login, lockout, refresh rotativo, MFA (roadmap). |
| A08 Data Integrity | Verificação de assinatura de webhooks; idempotência. |
| A09 Logging Failures | Logs estruturados + `audit_logs` + alertas de anomalia. |
| A10 SSRF | Allowlist de destinos em integrações/webhooks de saída. |

## 5. Rate Limiting & Abuso

- Rate limit por IP e por tenant (Redis) nas rotas públicas e de auth.
- Throttle específico para endpoints de IA (controle de custo de tokens).
- Proteção de webhooks por assinatura + janela de timestamp.

## 6. LGPD

- **Minimização:** PII de clientes finais (nome, documento) armazenada com **hash**; dado bruto
  só quando estritamente necessário e com base legal.
- **Direitos do titular:** endpoints de exportação e exclusão (direito ao esquecimento) por tenant.
- **Trilha de auditoria:** `audit_logs` registra acesso e alteração de dados sensíveis.
- **Retenção:** políticas configuráveis; expurgo agendado de dados expirados.
- **Subprocessadores:** OpenAI, Supabase, provedores de notificação — listados em política de privacidade.
- **DPA & consentimento:** termos e consentimento versionados.

## 7. Auditoria & Observabilidade de segurança

- `audit_logs`: ator, ação, entidade, diff, IP, timestamp.
- Alertas para: múltiplas falhas de login, uso de refresh token revogado, acesso cross-tenant negado.
- Revisão de logs sem PII sensível (mascaramento).

## 8. SDLC seguro

- Revisão de código obrigatória + `security-review` no pipeline.
- SAST/secret-scanning no CI (bloqueia merge com segredo vazado).
- Ambientes isolados (dev/staging/prod) com segredos distintos.
- Backups automáticos + teste periódico de restore (runbook documentado).
