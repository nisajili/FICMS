'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Input, Label, FieldError,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Spinner, EmptyState,
} from '@ficms/ui';
import { appointments, patients } from '@/lib/queries';

const schema = z.object({
  patientId: z.string().min(1, 'Select a patient'),
  scheduledStart: z.string().min(1, 'Required'),
  serviceType: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const { data: appts, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointments.list({ pageSize: 50 }),
  });
  const { data: patientList } = useQuery({
    queryKey: ['patients', 'lookup'],
    queryFn: () => patients.list({ pageSize: 100 }),
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const create = useMutation({
    mutationFn: (v: FormValues) => {
      const start = new Date(v.scheduledStart);
      return appointments.create({
        patientId: v.patientId,
        scheduledStart: v.scheduledStart,
        scheduledEnd: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
        serviceType: v.serviceType,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
  const transition = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => appointments.transition(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Appointments</h1>
        <p className="text-sm text-slate-500">Schedule, check in, and manage appointments.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Schedule Appointment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Patient</Label>
              <select {...form.register('patientId')} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">Select…</option>
                {patientList?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.givenName} {p.familyName} ({p.medicalRecordNumber})</option>
                ))}
              </select>
              <FieldError message={form.formState.errors.patientId?.message} />
            </div>
            <div className="space-y-1">
              <Label>Start time</Label>
              <Input type="datetime-local" {...form.register('scheduledStart')} />
              <FieldError message={form.formState.errors.scheduledStart?.message} />
            </div>
            <div className="space-y-1">
              <Label>Service (optional)</Label>
              <Input {...form.register('serviceType')} placeholder="e.g. Consultation" />
            </div>
            <div className="self-end sm:col-span-3">
              <Button type="submit" loading={create.isPending}>Schedule</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !appts || appts.length === 0 ? <EmptyState title="No appointments" />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead><TableHead>Patient</TableHead><TableHead>Service</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {appts.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.scheduledStart).toLocaleString()}</TableCell>
                      <TableCell>{a.patient ? `${a.patient.givenName} ${a.patient.familyName}` : '—'}</TableCell>
                      <TableCell>{a.serviceType || '—'}</TableCell>
                      <TableCell><Badge tone={tone(a.status)}>{a.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>
                        {a.status === 'SCHEDULED' && (
                          <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: a.id, status: 'CHECKED_IN' })}>Check in</Button>
                        )}
                        {a.status === 'CHECKED_IN' && (
                          <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: a.id, status: 'IN_PROGRESS' })}>Start</Button>
                        )}
                        {a.status === 'IN_PROGRESS' && (
                          <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: a.id, status: 'COMPLETED' })}>Complete</Button>
                        )}
                      </TableCell>
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
  if (['COMPLETED', 'CHECKED_IN'].includes(s)) return 'success';
  if (['SCHEDULED', 'REQUESTED'].includes(s)) return 'primary';
  if (['IN_PROGRESS'].includes(s)) return 'warning';
  if (['CANCELLED', 'NO_SHOW'].includes(s)) return 'danger';
  return 'neutral';
}
