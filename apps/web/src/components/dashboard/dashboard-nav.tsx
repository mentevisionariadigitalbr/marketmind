'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS: { href: string; label: string; icon: string }[] = [
  { href: '/dashboard', label: 'Overview', icon: '▣' },
  { href: '/dashboard/products', label: 'Produtos', icon: '☷' },
  { href: '/dashboard/costs', label: 'Custos dos Produtos', icon: '₵' },
  { href: '/dashboard/inventory', label: 'Estoque', icon: '▤' },
  { href: '/dashboard/categories', label: 'Categorias', icon: '◳' },
  { href: '/dashboard/abc', label: 'Curva ABC', icon: '▮' },
  { href: '/dashboard/top-products', label: 'Top Produtos', icon: '★' },
  { href: '/dashboard/alerts', label: 'Alertas', icon: '⚠' },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span aria-hidden className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
