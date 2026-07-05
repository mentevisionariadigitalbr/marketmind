import Link from 'next/link';

/** Layout público dos documentos legais (sem sessão). */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold text-brand">MarketMind AI</Link>
          <nav className="flex gap-4 text-sm text-slate-600">
            <Link href="/legal/terms" className="hover:text-brand">Termos</Link>
            <Link href="/legal/privacy" className="hover:text-brand">Privacidade</Link>
            <Link href="/legal/cookies" className="hover:text-brand">Cookies</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
    </div>
  );
}
