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
import { nursing, patients } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const vitalsSchema = z.object({
  patientId: z.string().min(1, 'Select a patient'),
  temperatureC: z.coerce.number().optional(),
  pulseBpm: z.coerce.number().optional(),
  bpSystolic: z.coerce.number().optional(),
  bpDiastolic: z.coerce.number().optional(),
  respiratoryRate: z.coerce.number().optional(),
  weightKg: z.coerce.number().optional(),
  heightCm: z.coerce.number().optional(),
});
type VitalsValues = z.infer<typeof vitalsSchema>;

const noteSchema = z.object({
  patientId: z.string().min(1, 'Select a patient'),
  observation: z.string().optional().or(z.literal('')),
  administeredMedication: z.string().optional().or(z.literal('')),
  procedure: z.string().optional().or(z.literal('')),
  dischargeInstructions: z.string().optional().or(z.literal('')),
});
type NoteValues = z.infer<typeof noteSchema>;

export default function NursingPage() {
  const qc = useQueryClient();
  const [error, setError] = React.useState('');
  const [viewPatient, setViewPatient] = React.useState('');

  const patientQuery = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => patients.list({ pageSize: 100 }),
  });
  const vitals = useQuery({
    queryKey: ['nursing', 'vitals', viewPatient],
    queryFn: () => nursing.listVitals(viewPatient),
    enabled: !!viewPatient,
  });

  const vitalsForm = useForm<VitalsValues>({ resolver: zodResolver(vitalsSchema) });
  const noteForm = useForm<NoteValues>({ resolver: zodResolver(noteSchema) });

  const recordVitals = useMutation({
    mutationFn: (values: VitalsValues) =>
      nursing.recordVitals({
        patientId: values.patientId,
        temperatureC: values.temperatureC,
        pulseBpm: values.pulseBpm,
        bpSystolic: values.bpSystolic,
        bpDiastolic: values.bpDiastolic,
        respiratoryRate: values.respiratoryRate,
        weightKg: values.weightKg,
        heightCm: values.heightCm,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nursing'] });
      vitalsForm.reset();
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to record vitals.'),
  });

  const addNote = useMutation({
    mutationFn: (values: NoteValues) =>
      nursing.addNote({
        patientId: values.patientId,
        observation: values.observation || undefined,
        administeredMedication: values.administeredMedication || undefined,
        procedure: values.procedure || undefined,
        dischargeInstructions: values.dischargeInstructions || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nursing'] });
      noteForm.reset();
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to add note.'),
  });

  const patientOptions = (patientQuery.data ?? []) as any[];
  const vitalsRows = (vitals.data ?? []) as any[];

  const labelFor = (pid: string) => {
    const p = patientOptions.find((x) => x.id === pid);
    return p ? `${p.familyName} ${p.givenName}` : pid;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nursing</h1>
        <p className="text-sm text-slate-500">Record vital signs and nursing notes / discharge instructions.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Record vitals</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={vitalsForm.handleSubmit((v) => recordVitals.mutate(v))} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="v-patient">Patient</Label>
                <select
                  id="v-patient"
                  {...vitalsForm.register('patientId')}
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
                <FieldError message={vitalsForm.formState.errors.patientId?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="temp">Temp (°C)</Label>
                <Input id="temp" type="number" step="0.1" {...vitalsForm.register('temperatureC')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pulse">Pulse (bpm)</Label>
                <Input id="pulse" type="number" {...vitalsForm.register('pulseBpm')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sys">BP systolic</Label>
                <Input id="sys" type="number" {...vitalsForm.register('bpSystolic')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dia">BP diastolic</Label>
                <Input id="dia" type="number" {...vitalsForm.register('bpDiastolic')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rr">Respiratory rate</Label>
                <Input id="rr" type="number" {...vitalsForm.register('respiratoryRate')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wt">Weight (kg)</Label>
                <Input id="wt" type="number" step="0.1" {...vitalsForm.register('weightKg')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ht">Height (cm)</Label>
                <Input id="ht" type="number" step="0.1" {...vitalsForm.register('heightCm')} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" loading={recordVitals.isPending}>
                  Record vitals
                </Button>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nursing note</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={noteForm.handleSubmit((v) => addNote.mutate(v))} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="n-patient">Patient</Label>
                <select
                  id="n-patient"
                  {...noteForm.register('patientId')}
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
                <FieldError message={noteForm.formState.errors.patientId?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="obs">Observation</Label>
                <Textarea id="obs" rows={2} {...noteForm.register('observation')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="med">Administered medication</Label>
                <Input id="med" {...noteForm.register('administeredMedication')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="proc">Procedure</Label>
                <Input id="proc" {...noteForm.register('procedure')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="disc">Discharge instructions</Label>
                <Textarea id="disc" rows={2} {...noteForm.register('dischargeInstructions')} />
              </div>
              <Button type="submit" loading={addNote.isPending}>
                Add note
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vitals history</CardTitle>
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
            <p className="text-sm text-slate-500">Choose a patient to view their vitals.</p>
          ) : vitals.isLoading ? (
            <Spinner />
          ) : vitalsRows.length === 0 ? (
            <EmptyState title="No vitals" description="No vitals recorded for this patient." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Temp</TableHead>
                  <TableHead>Pulse</TableHead>
                  <TableHead>BP</TableHead>
                  <TableHead>RR</TableHead>
                  <TableHead>Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vitalsRows.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm text-slate-500">{new Date(v.recordedAt).toLocaleString()}</TableCell>
                    <TableCell>{v.temperatureC != null ? `${v.temperatureC}°C` : '—'}</TableCell>
                    <TableCell>{v.pulseBpm ?? '—'}</TableCell>
                    <TableCell>{v.bpSystolic != null ? `${v.bpSystolic}/${v.bpDiastolic}` : '—'}</TableCell>
                    <TableCell>{v.respiratoryRate ?? '—'}</TableCell>
                    <TableCell>{v.weightKg != null ? `${v.weightKg} kg` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {viewPatient && vitalsRows.length > 0 && (
        <p className="text-xs text-slate-400">Patient shown: {labelFor(viewPatient)}</p>
      )}
    </div>
  );
}
