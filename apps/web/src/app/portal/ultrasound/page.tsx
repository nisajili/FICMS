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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Spinner,
  EmptyState,
} from '@ficms/ui';
import { ultrasound, patients } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const schema = z.object({
  patientId: z.string().min(1, 'Select a patient'),
  type: z.enum(['follicular', 'pelvic', 'early_pregnancy', 'other']),
  endometrialThicknessMm: z.coerce.number().min(0).optional(),
  report: z.string().optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

export default function UltrasoundPage() {
  const qc = useQueryClient();
  const [error, setError] = React.useState('');
  const [patientId, setPatientId] = React.useState('');
  const [viewPatient, setViewPatient] = React.useState('');

  const patientQuery = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => patients.list({ pageSize: 100 }),
  });
  const scans = useQuery({
    queryKey: ['ultrasound', viewPatient],
    queryFn: () => ultrasound.listForPatient(viewPatient),
    enabled: !!viewPatient,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'follicular' },
  });

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      ultrasound.create({
        patientId: values.patientId,
        type: values.type,
        endometrialThicknessMm: values.endometrialThicknessMm,
        report: values.report || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ultrasound'] });
      form.reset({ type: 'follicular' });
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to record scan.'),
  });

  const verify = useMutation({
    mutationFn: (id: string) => ultrasound.verify(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ultrasound'] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Verification failed.'),
  });

  const patientOptions = (patientQuery.data ?? []) as any[];
  const scanRows = (scans.data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Ultrasound</h1>
        <p className="text-sm text-slate-500">Follicular, pelvic and early-pregnancy scans with clinician verification.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Record scan</CardTitle>
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
                      {p.familyName} {p.givenName} — {p.medicalRecordNumber}
                    </option>
                  ))}
                </select>
                <FieldError message={form.formState.errors.patientId?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="type">Type</Label>
                <select id="type" {...form.register('type')} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                  <option value="follicular">Follicular</option>
                  <option value="pelvic">Pelvic</option>
                  <option value="early_pregnancy">Early pregnancy</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="et">Endometrial thickness (mm)</Label>
                <Input id="et" type="number" step="0.1" {...form.register('endometrialThicknessMm')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="report">Report</Label>
                <Input id="report" {...form.register('report')} />
              </div>
              <Button type="submit" loading={create.isPending}>
                Record scan
              </Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>View scans for a patient</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={viewPatient}
              onChange={(e) => setViewPatient(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">Select a patient</option>
              {patientOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.familyName} {p.givenName}
                </option>
              ))}
            </select>
            <div className="mt-4 space-y-2">
              {!viewPatient ? (
                <p className="text-sm text-slate-500">Choose a patient to view their scans.</p>
              ) : scans.isLoading ? (
                <Spinner />
              ) : scanRows.length === 0 ? (
                <EmptyState title="No scans" description="No scans recorded for this patient." />
              ) : (
                scanRows.map((s) => (
                  <div key={s.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <Badge tone={s.verifiedById ? 'success' : 'warning'}>{s.verifiedById ? 'Verified' : 'Pending'}</Badge>
                      <span className="text-xs text-slate-400">{new Date(s.scannedAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{s.type}</p>
                    {s.endometrialThicknessMm != null && (
                      <p className="text-xs text-slate-500">Endometrial thickness: {s.endometrialThicknessMm} mm</p>
                    )}
                    {s.report && <p className="text-xs text-slate-500">{s.report}</p>}
                    {!s.verifiedById && (
                      <Button size="sm" variant="outline" className="mt-2" loading={verify.isPending} onClick={() => verify.mutate(s.id)}>
                        Verify
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
