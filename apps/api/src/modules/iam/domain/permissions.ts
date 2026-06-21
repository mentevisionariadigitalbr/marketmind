/**
 * Catálogo central de permissões do MarketMind AI e o mapeamento dos papéis de
 * sistema. Fonte única usada tanto pelo seed (popula o banco) quanto pelo runtime
 * (claims do token e guard @RequirePermissions).
 */

export const PERMISSIONS = {
  DASHBOARD_READ: 'dashboard:read',
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  PRICING_READ: 'pricing:read',
  PRICING_WRITE: 'pricing:write',
  INTEGRATION_READ: 'integration:read',
  INTEGRATION_WRITE: 'integration:write',
  AI_USE: 'ai:use',
  COMPETITION_READ: 'competition:read',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_WRITE: 'notifications:write',
  COMPANY_READ: 'company:read',
  COMPANY_WRITE: 'company:write',
  IAM_READ: 'iam:read',
  IAM_WRITE: 'iam:write',
  AUDIT_READ: 'audit:read',
  BILLING_READ: 'billing:read',
  BILLING_MANAGE: 'billing:manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDef {
  key: PermissionKey;
  description: string;
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: PERMISSIONS.DASHBOARD_READ, description: 'Ver o dashboard executivo' },
  { key: PERMISSIONS.FINANCE_READ, description: 'Ver DRE, fluxo de caixa e finanças' },
  { key: PERMISSIONS.FINANCE_WRITE, description: 'Lançar/editar dados financeiros' },
  { key: PERMISSIONS.INVENTORY_READ, description: 'Ver estoque e previsões' },
  { key: PERMISSIONS.INVENTORY_WRITE, description: 'Ajustar estoque e reposição' },
  { key: PERMISSIONS.PRICING_READ, description: 'Ver precificação' },
  { key: PERMISSIONS.PRICING_WRITE, description: 'Definir preços e regras' },
  { key: PERMISSIONS.INTEGRATION_READ, description: 'Ver integrações de marketplace' },
  { key: PERMISSIONS.INTEGRATION_WRITE, description: 'Conectar/gerir contas de marketplace' },
  { key: PERMISSIONS.AI_USE, description: 'Usar a IA executiva e agentes' },
  { key: PERMISSIONS.COMPETITION_READ, description: 'Ver monitoramento de concorrência' },
  { key: PERMISSIONS.NOTIFICATIONS_READ, description: 'Ver alertas e notificações' },
  { key: PERMISSIONS.NOTIFICATIONS_WRITE, description: 'Configurar canais de alerta' },
  { key: PERMISSIONS.COMPANY_READ, description: 'Ver dados da empresa' },
  { key: PERMISSIONS.COMPANY_WRITE, description: 'Editar dados/assinatura da empresa' },
  { key: PERMISSIONS.IAM_READ, description: 'Ver usuários, papéis e permissões' },
  { key: PERMISSIONS.IAM_WRITE, description: 'Convidar usuários e gerir papéis' },
  { key: PERMISSIONS.AUDIT_READ, description: 'Ver trilha de auditoria' },
  { key: PERMISSIONS.BILLING_READ, description: 'Ver plano, assinatura e faturas' },
  { key: PERMISSIONS.BILLING_MANAGE, description: 'Assinar, trocar plano e gerir pagamento' },
];

export const SYSTEM_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

const ALL_KEYS: PermissionKey[] = PERMISSION_CATALOG.map((p) => p.key);

/** Permissões concedidas a cada papel de sistema. */
export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleName, PermissionKey[]> = {
  // Dono da conta: tudo.
  OWNER: ALL_KEYS,
  // Admin: tudo, exceto gerir papéis/usuários, dados da empresa e a assinatura.
  ADMIN: ALL_KEYS.filter(
    (k) =>
      k !== PERMISSIONS.IAM_WRITE &&
      k !== PERMISSIONS.COMPANY_WRITE &&
      k !== PERMISSIONS.BILLING_MANAGE,
  ),
  // Membro: somente leitura operacional + uso da IA.
  MEMBER: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.PRICING_READ,
    PERMISSIONS.INTEGRATION_READ,
    PERMISSIONS.COMPETITION_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.COMPANY_READ,
    PERMISSIONS.AI_USE,
  ],
};

export const SYSTEM_ROLE_DESCRIPTIONS: Record<SystemRoleName, string> = {
  OWNER: 'Dono da conta — acesso total.',
  ADMIN: 'Administrador — opera tudo, exceto papéis e dados da empresa.',
  MEMBER: 'Membro — acesso de leitura e uso da IA.',
};
