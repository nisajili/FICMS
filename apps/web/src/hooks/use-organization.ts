'use client';

import { useQuery } from '@tanstack/react-query';
import { auth } from '@/lib/queries';

/**
 * Resolve the current user's organisation branding (white-label). Returns the
 * clinic name and per-org settings (PRIMARY_COLOR, CURRENCY, TIMEZONE, ...).
 * Falls back to the literal `{{CLINIC_NAME}}` placeholder when unavailable so
 * no clinic value is hard-coded in source.
 */
export function useOrganization() {
  const { data, isLoading } = useQuery({
    queryKey: ['organization', 'branding'],
    queryFn: auth.organization,
    staleTime: 60_000,
  });
  const branding = data as any;
  const name =
    branding?.name ??
    (typeof branding?.settings?.CLINIC_NAME === 'string'
      ? (branding.settings.CLINIC_NAME as string)
      : null);
  return {
    name: name || null,
    primaryColor: (branding?.settings?.PRIMARY_COLOR as string) || undefined,
    settings: branding?.settings ?? {},
    isLoading,
  };
}
