import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand">MarketMind AI</h1>
          <p className="text-sm text-slate-500">O CFO Inteligente para Vendedores de Marketplace</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
        <footer className="mt-6 flex justify-center gap-4 text-xs text-slate-400">
          <Link href="/legal/terms" className="hover:text-brand">Termos</Link>
          <Link href="/legal/privacy" className="hover:text-brand">Privacidade</Link>
          <Link href="/legal/cookies" className="hover:text-brand">Cookies</Link>
        </footer>
      </div>
    </main>
  );
}
