import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'MarketMind · Admin' };

/** Shell da área de admin (distinto do app do cliente). A proteção forte é feita
 *  pelo middleware (cookie separado) + PlatformAdminGuard na API. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
