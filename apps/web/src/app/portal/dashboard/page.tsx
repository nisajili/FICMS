'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner, EmptyState } from '@ficms/ui';
import { Users, CalendarCheck, FlaskConical, Wallet } from 'lucide-react';
import type { DashboardStats } from '@ficms/types';
import { dashboard } from '@/lib/queries';

const statCards = [
  { key: 'patients', label: 'Active Patients', icon: Users, tone: 'info' as const },
  { key: 'appointmentsToday', label: "Today's Appointments", icon: CalendarCheck, tone: 'primary' as const },
  { key: 'activeCycles', label: 'Active Cycles', icon: FlaskConical, tone: 'warning' as const },
  { key: 'outstandingBalance', label: 'Outstanding Balance', icon: Wallet, tone: 'danger' as const },
];

export default function DashboardPage() {
  const stats = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: dashboard.stats });
  const today = useQuery({ queryKey: ['dashboard', 'today'], queryFn: dashboard.today });

  if (stats.isLoading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }
  if (stats.error) {
    return <EmptyState title="Unable to load dashboard" description="Check your connection to the API." />;
  }

  const data = stats.data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Welcome back. Here is today&apos;s overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c) => (
          <Card key={c.key}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{c.label}</p>
                <p className="text-2xl font-semibold text-slate-900">{renderStat(c.key, data)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {today.isLoading ? (
            <Spinner />
          ) : today.data && today.data.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {today.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {(a as any).patient ? `${(a as any).patient.givenName} ${(a as any).patient.familyName}` : 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500">{new Date(a.scheduledStart).toLocaleTimeString()}</p>
                  </div>
                  <Badge tone={statusTone(a.status)}>{a.status.replace('_', ' ')}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No appointments today" description="New appointments will appear here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (['COMPLETED', 'CHECKED_IN'].includes(status)) return 'success';
  if (['SCHEDULED', 'REQUESTED'].includes(status)) return 'primary';
  if (['IN_PROGRESS'].includes(status)) return 'warning';
  if (['CANCELLED', 'NO_SHOW'].includes(status)) return 'danger';
  return 'neutral';
}

function renderStat(key: string, data: DashboardStats): string {
  if (key === 'outstandingBalance') {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(data.outstandingBalance);
  }
  return String(data[key as keyof DashboardStats] ?? 0);
}
