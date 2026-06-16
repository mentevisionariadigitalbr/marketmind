'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onLogout() {
    startTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <button
      onClick={onLogout}
      disabled={pending}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? 'Saindo…' : 'Sair'}
    </button>
  );
}
