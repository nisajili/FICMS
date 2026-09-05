'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { auth } from '@/lib/queries';
import { Spinner } from '@ficms/ui';

/** Redirects unauthenticated users to /login. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: auth.me,
    retry: false,
  });

  React.useEffect(() => {
    if (!isLoading && (error || !data)) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, error, data, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!data) return null;
  return <>{children}</>;
}

/** Exposes the current user to the client tree. */
export function useSession() {
  const { data } = useQuery({ queryKey: ['auth', 'me'], queryFn: auth.me, retry: false });
  return data;
}
