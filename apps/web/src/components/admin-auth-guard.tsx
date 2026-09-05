'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { auth } from '@/lib/queries';
import { Spinner } from '@ficms/ui';

/**
 * Guards platform-admin routes. Requires an authenticated session whose role is
 * `platform_admin`; other roles are sent to the staff portal.
 */
export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: auth.me,
    retry: false,
  });

  React.useEffect(() => {
    if (isLoading) return;
    if (error || !data) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!data.isPlatformAdmin) {
      router.replace('/portal/dashboard');
    }
  }, [isLoading, error, data, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!data || !data.isPlatformAdmin) return null;
  return <>{children}</>;
}
