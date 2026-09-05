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
import { clinicalNotes, patients } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const createSchema = z.object({
  patientId: z.string().min(1, 'Select a patient'),
  category: z.enum(['clinical', 'counseling', 'nursing', 'embryology']),
  body: z.string().min(1, 'Note body is required'),
});
type CreateValues = z.infer<typeof createSchema>;

export default function ClinicalNotesPage() {
  const qc = useQueryClient();
  const [error, setError] = React.useState('');
  const [patientFilter, setPatientFilter] = React.useState('');
  const [correctingId, setCorrectingId] = React.useState<string | null>(null);
  const [correctBody, setCorrectBody] = React.useState('');
  const [correctReason, setCorrectReason] = React.useState('');

  const notes = useQuery({
    queryKey: ['clinical-notes', patientFilter],
    queryFn: () => clinicalNotes.list({ pageSize: 100, patientId: patientFilter || undefined }),
  });
  const patientQuery = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => patients.list({ pageSize: 100 }),
  });

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { category: 'clinical' },
  });

  const create = useMutation({
    mutationFn: (values: CreateValues) => clinicalNotes.create(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinical-notes'] });
      form.reset({ category: 'clinical' });
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to create note.'),
  });

  const sign = useMutation({
    mutationFn: (id: string) => clinicalNotes.sign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinical-notes'] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Signing failed.'),
  });

  const correct = useMutation({
    mutationFn: (id: string) =>
      clinicalNotes.correct(id, { body: correctBody, reason: correctReason || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinical-notes'] });
      setCorrectingId(null);
      setCorrectBody('');
      setCorrectReason('');
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Correction failed.'),
  });

  const rows = (notes.data ?? []) as any[];
  const patientOptions = (patientQuery.data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Clinical notes</h1>
        <p className="text-sm text-slate-500">
          Signed notes are immutable — a correction creates a new revision rather than overwriting the signed record.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New note</CardTitle>
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
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  {...form.register('category')}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="clinical">Clinical</option>
                  <option value="counseling">Counseling</option>
                  <option value="nursing">Nursing</option>
                  <option value="embryology">Embryology</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="body">Note body</Label>
                <Textarea id="body" rows={4} {...form.register('body')} />
                <FieldError message={form.formState.errors.body?.message} />
              </div>
              <Button type="submit" loading={create.isPending}>
                Save note
              </Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter by patient</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All patients</option>
              {patientOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.familyName} {p.givenName}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.isLoading ? (
            <Spinner />
          ) : rows.length === 0 ? (
            <EmptyState title="No notes" description="Create a note to get started." />
          ) : (
            <div className="space-y-4">
              {rows.map((n) => (
                <div key={n.id} className="rounded-md border border-slate-200 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone={n.signed ? 'success' : 'neutral'}>{n.signed ? 'Signed' : 'Draft'}</Badge>
                    <Badge tone="info">{n.category}</Badge>
                    <span className="text-xs text-slate-500">v{n.version}</span>
                    {n.previousId && <Badge tone="warning">revision</Badge>}
                    <span className="ml-auto text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!n.signed && (
                      <Button size="sm" loading={sign.isPending} onClick={() => sign.mutate(n.id)}>
                        Sign
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCorrectingId(n.id);
                        setCorrectBody(n.body);
                      }}
                    >
                      Correct
                    </Button>
                    {n.signed && (
                      <span className="text-xs text-slate-500">
                        Signed note — corrections create a new version.
                      </span>
                    )}
                  </div>
                  {correctingId === n.id && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        correct.mutate(n.id);
                      }}
                      className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"
                    >
                      <Label htmlFor={`correct-${n.id}`}>Corrected body</Label>
                      <Textarea id={`correct-${n.id}`} rows={3} value={correctBody} onChange={(e) => setCorrectBody(e.target.value)} />
                      <Input
                        placeholder="Reason for correction (optional)"
                        value={correctReason}
                        onChange={(e) => setCorrectReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" loading={correct.isPending}>
                          Save correction
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setCorrectingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
