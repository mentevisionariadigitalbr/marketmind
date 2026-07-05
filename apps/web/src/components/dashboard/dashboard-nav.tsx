'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string; icon: string };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: 'Visão geral',
    items: [{ href: '/dashboard', label: 'Overview', icon: '▣' }],
  },
  {
    title: 'Catálogo',
    items: [
      { href: '/dashboard/products', label: 'Produtos', icon: '☷' },
      { href: '/dashboard/costs', label: 'Custos dos Produtos', icon: '₵' },
      { href: '/dashboard/categories', label: 'Categorias', icon: '◳' },
      { href: '/dashboard/channels', label: 'Canais', icon: '🛒' },
    ],
  },
  {
    title: 'Operação',
    items: [
      { href: '/dashboard/inventory', label: 'Estoque', icon: '▤' },
      { href: '/dashboard/inventory/reposicao', label: 'Reposição', icon: '📦' },
      { href: '/dashboard/purchases', label: 'Compras', icon: '🧾' },
      { href: '/dashboard/suppliers', label: 'Fornecedores', icon: '🚚' },
    ],
  },
  {
    title: 'Inteligência',
    items: [
      { href: '/dashboard/alerts', label: 'Alertas', icon: '⚠' },
      { href: '/dashboard/abc', label: 'Curva ABC', icon: '▮' },
      { href: '/dashboard/top-products', label: 'Top Produtos', icon: '★' },
      { href: '/dashboard/pricing', label: 'Precificação', icon: '🏷' },
      { href: '/dashboard/roi', label: 'ROI', icon: '↩' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { href: '/dashboard/finance/dre', label: 'DRE', icon: '∑' },
      { href: '/dashboard/finance/cashflow', label: 'Fluxo de Caixa', icon: '💵' },
      { href: '/dashboard/finance/expenses', label: 'Despesas', icon: '↧' },
      { href: '/dashboard/finance/taxes', label: 'Alíquotas', icon: '％' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { href: '/dashboard/settings/integrations', label: 'Integrações', icon: '🔌' },
      { href: '/dashboard/settings/team', label: 'Equipe', icon: '👥' },
      { href: '/dashboard/settings/billing', label: 'Cobrança', icon: '💳' },
      { href: '/dashboard/settings/reports', label: 'Relatórios e-mail', icon: '✉' },
      { href: '/dashboard/settings', label: 'Configurações', icon: '⚙' },
    ],
  },
];

function NavLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span aria-hidden className="text-base">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {SECTIONS.map((section, i) => (
        <div key={section.title} className="contents md:block">
          <p
            className={`px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 max-md:hidden ${i === 0 ? '' : 'mt-3'}`}
          >
            {section.title}
          </p>
          {section.items.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>
      ))}
    </nav>
  );
}
