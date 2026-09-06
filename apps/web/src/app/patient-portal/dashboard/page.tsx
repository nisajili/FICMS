'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner, EmptyState } from '@ficms/ui';
import { CalendarCheck, FlaskConical, CreditCard } from 'lucide-react';
import { self } from '@/lib/queries';

export default function PatientDashboard() {
  const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ['me'], queryFn: self.profile });
  const { data: appointments } = useQuery({ queryKey: ['me', 'appointments'], queryFn: self.appointments });
  const { data: results } = useQuery({ queryKey: ['me', 'results'], queryFn: self.results });
  const { data: invoices } = useQuery({ queryKey: ['me', 'invoices'], queryFn: self.invoices });

  if (profileLoading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  const pendingBalance = (invoices ?? []).reduce((s: number, i: any) => s + Number(i.amountDue ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome{profile?.givenName ? `, ${profile.givenName}` : ''}
        </h1>
        <p className="text-sm text-slate-500">Your care at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><CalendarCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-slate-500">Upcoming appointments</p>
              <p className="text-2xl font-semibold text-slate-900">{(appointments ?? []).filter((a: any) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><FlaskConical className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-slate-500">Released results</p>
              <p className="text-2xl font-semibold text-slate-900">{(results ?? []).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><CreditCard className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-slate-500">Outstanding balance</p>
              <p className="text-2xl font-semibold text-slate-900">{money(pendingBalance)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming appointments</CardTitle></CardHeader>
        <CardContent>
          {!appointments ? <Spinner /> : appointments.length === 0 ? (
            <EmptyState title="No upcoming appointments" description="Your clinic will notify you when an appointment is booked." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {appointments.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{new Date(a.scheduledStart).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{a.serviceType || 'Appointment'}</p>
                  </div>
                  <Badge tone={apptTone(a.status)}>{a.status.replace('_', ' ')}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function apptTone(s: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (['COMPLETED'].includes(s)) return 'success';
  if (['SCHEDULED', 'REQUESTED'].includes(s)) return 'primary';
  if (['IN_PROGRESS', 'CHECKED_IN'].includes(s)) return 'warning';
  if (['CANCELLED', 'NO_SHOW'].includes(s)) return 'danger';
  return 'neutral';
}

function money(n: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
}
