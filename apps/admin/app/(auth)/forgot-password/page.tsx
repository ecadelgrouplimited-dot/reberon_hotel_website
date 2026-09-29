'use client';
import Link from 'next/link';
import { useState } from 'react';
import { post } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/field';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  return sent ? (
    <div className="grid gap-4">
      <h1 className="display text-[2rem]">Check your email</h1>
      <p className="text-[13.5px] text-fg-muted">If {email} has an account, a reset link is on its way. It works for one hour.</p>
      <Link href="/login" className="text-[13px] font-semibold underline">Back to sign in</Link>
    </div>
  ) : (
    <form
      className="grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        await post('/auth/forgot', { email }).catch(() => undefined);
        setSent(true);
      }}
    >
      <div>
        <h1 className="display text-[2rem]">Reset password</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">We will email you a link.</p>
      </div>
      <TextInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit" variant="primary" size="lg" loading={loading}>Send link</Button>
      <Link href="/login" className="text-center text-[13px] text-fg-muted hover:text-fg">Back to sign in</Link>
    </form>
  );
}
