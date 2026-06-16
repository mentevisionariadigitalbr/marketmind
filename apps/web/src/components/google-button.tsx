'use client';

import { useEffect, useRef } from 'react';

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

/**
 * Botão "Continuar com Google" (Google Identity Services). Renderiza apenas se
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID estiver configurado. Ao receber o ID token,
 * delega para `onCredential` (que chama /api/auth/google).
 */
export function GoogleButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !ref.current) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => onCredential(res.credential),
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'continue_with',
      });
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [clientId, onCredential]);

  if (!clientId) return null;
  return <div ref={ref} className="flex justify-center" />;
}
