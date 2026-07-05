import { exitImpersonationAction } from '@/lib/admin-impersonation-actions';

/** Faixa fixa avisando que a sessão é uma impersonação SOMENTE LEITURA do admin. */
export function ImpersonationBanner() {
  return (
    <div className="border-b border-purple-300 bg-purple-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-purple-900">
        <span>
          👁️ Você está <strong>impersonando este cliente em modo somente leitura</strong>. Nenhuma
          alteração será salva.
        </span>
        <form action={exitImpersonationAction}>
          <button className="shrink-0 font-semibold underline">Sair da impersonação</button>
        </form>
      </div>
    </div>
  );
}
