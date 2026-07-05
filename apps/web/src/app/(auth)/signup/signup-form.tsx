'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Input, Label } from '@/components/ui';
import { GoogleButton } from '@/components/google-button';

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [pending, startTransition] = useTransition();

  async function submitTo(url: string, body: unknown, dest: string) {
    setError(null);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Não foi possível criar a conta.');
      return;
    }
    startTransition(() => {
      router.push(dest);
      router.refresh();
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accepted) {
      setError('É necessário aceitar os Termos e a Política de Privacidade.');
      return;
    }
    const form = new FormData(e.currentTarget);
    await submitTo(
      '/api/auth/signup',
      {
        companyName: form.get('companyName'),
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
        acceptedTerms: true,
      },
      '/onboarding',
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div>
        <Label htmlFor="companyName">Nome da empresa</Label>
        <Input id="companyName" name="companyName" required maxLength={120} />
      </div>
      <div>
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" required maxLength={120} autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-slate-400">Mínimo de 8 caracteres.</p>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
        />
        <span>
          Li e aceito os{' '}
          <Link href="/legal/terms" target="_blank" className="font-medium text-brand hover:underline">Termos de Uso</Link>{' '}
          e a{' '}
          <Link href="/legal/privacy" target="_blank" className="font-medium text-brand hover:underline">Política de Privacidade</Link>.
        </span>
      </label>
      <Button type="submit" disabled={pending || !accepted}>
        {pending ? 'Criando…' : 'Criar conta'}
      </Button>
      <GoogleButton
        onCredential={(idToken) => {
          if (!accepted) {
            setError('É necessário aceitar os Termos e a Política de Privacidade.');
            return;
          }
          void submitTo('/api/auth/google', { idToken, acceptedTerms: true }, '/dashboard');
        }}
      />
    </form>
  );
}
