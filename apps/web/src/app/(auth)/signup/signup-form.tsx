'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Input, Label } from '@/components/ui';
import { GoogleButton } from '@/components/google-button';

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
    const form = new FormData(e.currentTarget);
    await submitTo(
      '/api/auth/signup',
      {
        companyName: form.get('companyName'),
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
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
      <Button type="submit" disabled={pending}>
        {pending ? 'Criando…' : 'Criar conta'}
      </Button>
      <GoogleButton onCredential={(idToken) => submitTo('/api/auth/google', { idToken }, '/dashboard')} />
    </form>
  );
}
