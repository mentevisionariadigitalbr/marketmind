'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { COOKIE_CONSENT_NAME, LEGAL_VERSIONS } from '@/lib/legal';

/**
 * Aviso de cookies (simples). Como hoje só há cookies estritamente necessários,
 * não há toggles de consentimento — apenas transparência + link à política. A
 * escolha fica num cookie próprio (não-httpOnly), versionado.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ack = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_CONSENT_NAME}=`));
    // Reaparece se nunca aceito ou se a versão da política mudou.
    if (!ack || ack.split('=')[1] !== LEGAL_VERSIONS.COOKIES) {
      setVisible(true);
    }
  }, []);

  function acknowledge() {
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${COOKIE_CONSENT_NAME}=${LEGAL_VERSIONS.COOKIES}; max-age=${oneYear}; path=/; SameSite=Lax`;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Usamos apenas cookies <strong>estritamente necessários</strong> para manter você conectado
          com segurança. Saiba mais na{' '}
          <Link href="/legal/cookies" className="font-medium text-brand hover:underline">Política de Cookies</Link>.
        </p>
        <button
          onClick={acknowledge}
          className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
