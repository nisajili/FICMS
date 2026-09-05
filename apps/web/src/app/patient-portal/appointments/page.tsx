'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Badge, Spinner, EmptyState,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@ficms/ui';
import { api } from '@/lib/api';
import { self } from '@/lib/queries';

export default function PatientAppointments() {
  const qc = useQueryClient();
  const { data: appointments, isLoading } = useQuery({ queryKey: ['me', 'appointments'], queryFn: self.appointments });
  const [start, setStart] = React.useState('');
  const [service, setService] = React.useState('');

  const request = useMutation({
    mutationFn: () => api.post('/me/appointments', { scheduledStart: start || undefined, serviceType: service || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me', 'appointments'] }); setStart(''); setService(''); },
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">My Appointments</h1><p className="text-sm text-slate-500">Request and review your appointments.</p></div>

      <Card>
        <CardHeader><CardTitle>Request an appointment</CardTitle></CardHeader>
        <CardContent>
          <form onClick={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1"><Label>Preferred time</Label><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-1"><Label>Service (optional)</Label><Input value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. Consultation" /></div>
            <div className="self-end"><Button loading={request.isPending} onClick={() => request.mutate()}>Request</Button></div>
          </form>
          <p className="mt-2 text-xs text-slate-400">Requests are reviewed by the reception team and confirmed via your clinic.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !appointments || appointments.length === 0 ? <EmptyState title="No appointments" />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>When</TableHead><TableHead>Service</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {appointments.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.scheduledStart).toLocaleString()}</TableCell>
                      <TableCell>{a.serviceType || '—'}</TableCell>
                      <TableCell><Badge tone={tone(a.status)}>{a.status.replace('_', ' ')}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function tone(s: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (['COMPLETED'].includes(s)) return 'success';
  if (['SCHEDULED', 'REQUESTED'].includes(s)) return 'primary';
  if (['IN_PROGRESS'].includes(s)) return 'warning';
  if (['CANCELLED', 'NO_SHOW'].includes(s)) return 'danger';
  return 'neutral';
}
