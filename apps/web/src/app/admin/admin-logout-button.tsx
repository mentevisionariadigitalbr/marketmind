'use client';

import { useRouter } from 'next/navigation';

export function AdminLogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }
  return (
    <button onClick={logout} className="text-sm font-medium text-slate-600 hover:text-slate-900">
      Sair
    </button>
  );
}
