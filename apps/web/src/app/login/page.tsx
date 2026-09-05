'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, FieldError } from '@ficms/ui';
import { auth } from '@/lib/queries';
import { ApiClientError, api } from '@/lib/api';
import { BrandTheme } from '@/components/theme-toggle';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [mfaCode, setMfaCode] = React.useState('');
  const [mfaToken, setMfaToken] = React.useState<string | null>(null);

  const login = useMutation({
    mutationFn: async () => {
      const res = await auth.login(email, password);
      if (res.requiresMfa) {
        setMfaToken(res.mfaToken ?? null);
        return null;
      }
      router.push(params.get('next') || '/portal/dashboard');
      router.refresh();
      return res.user;
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiClientError ? e.message : 'Login failed. Check your credentials.');
    },
  });

  const verifyMfa = useMutation({
    mutationFn: async () => {
      await api.post('/auth/mfa/verify', { mfaToken, code: mfaCode });
      router.push('/portal/dashboard');
      router.refresh();
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Invalid 2FA code.'),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <BrandTheme />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-700 text-2xl text-white">✦</div>
          <CardTitle className="mt-3 text-xl">{'{CLINIC_NAME}'}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {mfaToken ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyMfa.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <Label htmlFor="code">Two-factor code</Label>
                <Input id="code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" required />
              </div>
              <Button type="submit" loading={verifyMfa.isPending} className="w-full">Verify</Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                login.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <Button type="submit" loading={login.isPending} className="w-full">Sign in</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
