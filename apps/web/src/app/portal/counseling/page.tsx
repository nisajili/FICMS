'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  FieldError,
  Textarea,
  Badge,
  Spinner,
  EmptyState,
} from '@ficms/ui';
import { counseling, patients } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const schema = z.object({
  patientId: z.string().min(1, 'Select a patient'),
  sessionType: z.string().min(1, 'Session type is required'),
  summary: z.string().optional().or(z.literal('')),
  confidential: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function CounselingPage() {
  const qc = useQueryClient();
  const [error, setError] = React.useState('');
  const [viewPatient, setViewPatient] = React.useState('');

  const patientQuery = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => patients.list({ pageSize: 100 }),
  });
  const sessions = useQuery({
    queryKey: ['counseling', viewPatient],
    queryFn: () => counseling.list(viewPatient),
    enabled: !!viewPatient,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { confidential: true },
  });

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      counseling.create({
        patientId: values.patientId,
        sessionType: values.sessionType,
        summary: values.summary || undefined,
        confidential: values.confidential,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['counseling'] });
      form.reset({ confidential: true });
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to record session.'),
  });

  const patientOptions = (patientQuery.data ?? []) as any[];
  const sessionRows = (sessions.data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Counseling</h1>
        <p className="text-sm text-slate-500">Confidential psychological/support sessions.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Record session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="patientId">Patient</Label>
                <select
                  id="patientId"
                  {...form.register('patientId')}
                  defaultValue=""
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="" disabled>
                    Select a patient
                  </option>
                  {patientOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.familyName} {p.givenName}
                    </option>
                  ))}
                </select>
                <FieldError message={form.formState.errors.patientId?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sessionType">Session type</Label>
                <Input id="sessionType" placeholder="e.g. Pre-treatment counselling" {...form.register('sessionType')} />
                <FieldError message={form.formState.errors.sessionType?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" rows={4} {...form.register('summary')} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" {...form.register('confidential')} className="h-4 w-4" />
                Confidential session
              </label>
              <Button type="submit" loading={create.isPending}>
                Record session
              </Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session history</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={viewPatient}
              onChange={(e) => setViewPatient(e.target.value)}
              className="mb-4 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">Select a patient</option>
              {patientOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.familyName} {p.givenName}
                </option>
              ))}
            </select>
            {!viewPatient ? (
              <p className="text-sm text-slate-500">Choose a patient to view sessions.</p>
            ) : sessions.isLoading ? (
              <Spinner />
            ) : sessionRows.length === 0 ? (
              <EmptyState title="No sessions" description="No sessions recorded for this patient." />
            ) : (
              sessionRows.map((s) => (
                <div key={s.id} className="mb-3 rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <Badge tone={s.confidential ? 'warning' : 'neutral'}>{s.confidential ? 'Confidential' : 'Standard'}</Badge>
                    <span className="text-xs text-slate-400">{new Date(s.sessionDate).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 font-medium text-slate-800">{s.sessionType}</p>
                  {s.summary && <p className="mt-1 text-sm text-slate-600">{s.summary}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
