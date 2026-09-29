'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ApiError, post } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/field';

function Inner({ endpoint, title, intro }: { endpoint: string; title: string; intro: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password !== again) return setError('The two passwords do not match.');
        setLoading(true);
        try {
          await post(endpoint, { token: params.get('token'), password });
          router.replace('/login');
        } catch (err) {
          setError(err instanceof ApiError ? (err.errors[0]?.message ?? err.message) : 'Something went wrong');
          setLoading(false);
        }
      }}
    >
      <div>
        <h1 className="display text-[2rem]">{title}</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">{intro}</p>
      </div>
      {error && <p className="rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</p>}
      <TextInput label="New password" type="password" autoComplete="new-password" hint="At least 12 characters. A short sentence works well." required value={password} onChange={(e) => setPassword(e.target.value)} />
      <TextInput label="Repeat it" type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
      <Button type="submit" variant="primary" size="lg" loading={loading}>Save and sign in</Button>
    </form>
  );
}

export function SetPassword(p: { endpoint: string; title: string; intro: string }) {
  return (
    <Suspense>
      <Inner {...p} />
    </Suspense>
  );
}
