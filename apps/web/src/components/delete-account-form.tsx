'use client';

import { useState } from 'react';
import { deleteAccountAction } from '@/lib/privacy-actions';

/**
 * Exclusão de conta com dupla confirmação (digitar EXCLUIR). Para OWNER, avisa que
 * a empresa inteira será excluída.
 */
export function DeleteAccountForm({ isOwner }: { isOwner: boolean }) {
  const [confirmation, setConfirmation] = useState('');
  const enabled = confirmation.trim().toUpperCase() === 'EXCLUIR';

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {isOwner ? (
          <>
            Você é o dono da conta. Excluir vai <strong>encerrar a empresa inteira</strong>: dados de
            integrações, produtos, pedidos e clientes serão removidos e os usuários anonimizados.
            Faturas são mantidas por obrigação fiscal. <strong>Esta ação é irreversível.</strong>
          </>
        ) : (
          <>
            Isto anonimiza permanentemente os seus dados pessoais e encerra seu acesso.{' '}
            <strong>Esta ação é irreversível.</strong>
          </>
        )}
      </div>
      <form action={deleteAccountAction} className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-slate-600">
          Digite <strong>EXCLUIR</strong> para confirmar
          <input
            name="confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={!enabled}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          Excluir minha conta
        </button>
      </form>
    </div>
  );
}
