import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { LogoutButton } from '@/components/logout-button';
import { EmailVerificationBanner } from '@/components/email-verification-banner';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      {!session.user.emailVerifiedAt && <EmailVerificationBanner />}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-lg font-bold text-brand">
              MarketMind AI
            </Link>
            <span className="hidden text-sm text-slate-400 sm:inline">·</span>
            <span className="hidden text-sm text-slate-600 sm:inline">{session.company.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{session.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
