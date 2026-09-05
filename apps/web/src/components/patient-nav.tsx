'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  FlaskConical,
  CreditCard,
  User,
  LogOut,
  Building2,
} from 'lucide-react';
import { cn } from '@ficms/ui';
import { auth } from '@/lib/queries';
import { BrandTheme } from './theme-toggle';

const nav = [
  { href: '/patient-portal/dashboard', label: 'My Care', icon: LayoutDashboard },
  { href: '/patient-portal/appointments', label: 'Appointments', icon: CalendarCheck },
  { href: '/patient-portal/results', label: 'Results', icon: FlaskConical },
  { href: '/patient-portal/billing', label: 'Billing', icon: CreditCard },
  { href: '/patient-portal/profile', label: 'My Details', icon: User },
];

export function PatientNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = async () => {
    await auth.logout();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen">
      <BrandTheme />
      <aside className="no-print hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <Building2 className="h-6 w-6 text-brand-700" />
          <span className="font-semibold text-slate-900">{'{CLINIC_NAME}'}</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
    </div>
  );
}
