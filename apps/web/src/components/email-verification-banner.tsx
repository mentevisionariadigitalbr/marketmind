'use client';

import { useState, useTransition } from 'react';
import { resendVerificationAction } from '@/lib/verification-actions';

/**
 * Banner não-bloqueante exibido quando o e-mail do usuário ainda não foi
 * verificado. Permite reenviar o link e pode ser dispensado na sessão.
 */
export function EmailVerificationBanner() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function resend() {
    setFailed(false);
    startTransition(async () => {
      const { ok } = await resendVerificationAction();
      setSent(ok);
      setFailed(!ok);
    });
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-amber-800">
        <span>
          {sent
            ? 'E-mail de verificação reenviado. Confira sua caixa de entrada.'
            : 'Confirme seu e-mail para garantir o acesso completo à conta.'}
          {failed && ' (Não foi possível reenviar agora — tente novamente.)'}
        </span>
        <div className="flex items-center gap-3">
          {!sent && (
            <button
              onClick={resend}
              disabled={pending}
              className="font-semibold text-amber-900 underline disabled:opacity-60"
            >
              {pending ? 'Reenviando…' : 'Reenviar e-mail'}
            </button>
          )}
          <button onClick={() => setDismissed(true)} className="text-amber-700 hover:text-amber-900" aria-label="Dispensar">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
