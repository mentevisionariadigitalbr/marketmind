import { AdminLoginForm } from './admin-login-form';

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">MarketMind · Admin</h1>
          <p className="text-sm text-slate-500">Área restrita da plataforma.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
