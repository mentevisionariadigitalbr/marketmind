'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Input, Label } from '@/components/ui';
import { GoogleButton } from '@/components/google-button';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submitTo(url: string, body: unknown) {
    setError(null);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Não foi possível entrar.');
      return;
    }
    startTransition(() => {
      router.push(next);
      router.refresh();
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await submitTo('/api/auth/login', {
      email: form.get('email'),
      password: form.get('password'),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
      <GoogleButton onCredential={(idToken) => submitTo('/api/auth/google', { idToken })} />
    </form>
  );
}
