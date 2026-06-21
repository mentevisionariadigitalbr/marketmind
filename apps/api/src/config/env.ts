import { z } from 'zod';

/**
 * Validação tipada do ambiente. Falha rápido no boot se algo estiver ausente.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Conexão de migrations/owner. Tem privilégio total (superuser no dev).
  DATABASE_URL: z.string().url(),
  // Conexão de runtime da API: role de menor privilégio, sujeita ao RLS (ADR-0002).
  // Opcional — se ausente, cai em DATABASE_URL (sem isolamento por RLS no dev).
  APP_DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  // OAuth Google — audiência esperada do ID token (opcional até configurar o app).
  GOOGLE_CLIENT_ID: z.string().optional(),
  // Chave para cifrar tokens de marketplace em repouso (AES-256-GCM via scrypt).
  TOKEN_ENCRYPTION_KEY: z.string().min(16),
  // Integração Mercado Livre (opcional até configurar o app no painel do ML).
  ML_CLIENT_ID: z.string().optional(),
  ML_CLIENT_SECRET: z.string().optional(),
  ML_REDIRECT_URI: z.string().optional(),
  // Rate limiting (Sprint 3.2). Janela em ms + limite global por IP.
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(300),
  // Restrição do /metrics (Sprint 3.2). Se definido, exige Bearer <token>.
  // Sem token, o acesso é liberado apenas de loopback/rede interna.
  METRICS_TOKEN: z.string().optional(),
  // E-mail transacional (Fase 4). Sem RESEND_API_KEY, usa NoopEmailSender.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${issues}`);
  }
  return parsed.data;
}
