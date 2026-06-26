import Link from 'next/link';
import { AdminLogoutButton } from './admin-logout-button';

const NAV = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/companies', label: 'Empresas' },
  { href: '/admin/plans', label: 'Planos' },
  { href: '/admin/health', label: 'Saúde' },
  { href: '/admin/audit', label: 'Auditoria' },
];

/** Cabeçalho do backoffice (distinto do app do cliente). */
export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-slate-800">MarketMind · Admin</span>
          <nav className="flex gap-3 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-slate-600 hover:text-brand">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">{email}</span>
          <AdminLogoutButton />
        </div>
      </div>
    </header>
  );
}
