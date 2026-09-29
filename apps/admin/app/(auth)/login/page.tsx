'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, post } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/field';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(params.get('expired') ? 'Your session ended. Please sign in again.' : null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const me = await post('/auth/login', { email, password });
      qc.setQueryData(['me'], me);
      const next = params.get('next');
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div>
        <h1 className="display text-[2rem]">Sign in</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">Use the email the owner invited you with.</p>
      </div>
      {error && <p role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</p>}
      <TextInput label="Email" type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextInput
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aside={
          <Link href="/forgot-password" className="text-[12px] text-fg-muted hover:text-fg">
            Forgot?
          </Link>
        }
      />
      <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
        Sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
