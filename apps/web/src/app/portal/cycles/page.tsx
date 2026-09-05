'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Input, Label, FieldError, Badge, Spinner, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@ficms/ui';
import { cycles, patients } from '@/lib/queries';

const schema = z.object({
  patientId: z.string().min(1, 'Select a patient'),
  treatmentType: z.enum(['IVF', 'ICSI', 'IUI', 'OTHER']),
  protocolTemplate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const NEXT: Record<string, string[]> = {
  PLANNED: ['BASELINE_ASSESSMENT', 'CANCELLED'],
  BASELINE_ASSESSMENT: ['STIMULATION', 'CANCELLED'],
  STIMULATION: ['MONITORING', 'CANCELLED'],
  MONITORING: ['TRIGGER', 'CANCELLED'],
  TRIGGER: ['RETRIEVAL'],
  RETRIEVAL: ['FERTILIZATION'],
  FERTILIZATION: ['EMBRYO_CULTURE'],
  EMBRYO_CULTURE: ['TRANSFER', 'FREEZING', 'CANCELLED'],
  TRANSFER: ['LUTEAL_SUPPORT', 'OUTCOME'],
  FREEZING: ['LUTEAL_SUPPORT', 'OUTCOME'],
  LUTEAL_SUPPORT: ['PREGNANCY_TEST', 'OUTCOME'],
  PREGNANCY_TEST: ['CLINICAL_PREGNANCY', 'OUTCOME'],
  CLINICAL_PREGNANCY: ['OUTCOME'],
  OUTCOME: [],
  CANCELLED: [],
};

export default function CyclesPage() {
  const qc = useQueryClient();
  const { data: cyclesData, isLoading } = useQuery({ queryKey: ['cycles'], queryFn: () => cycles.list({ pageSize: 50 }) });
  const { data: patientList } = useQuery({ queryKey: ['patients', 'lookup'], queryFn: () => patients.list({ pageSize: 100 }) });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { treatmentType: 'IVF' } });
  const create = useMutation({
    mutationFn: (v: FormValues) => cycles.create(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycles'] }),
  });
  const transition = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => cycles.transition(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycles'] }),
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Treatment Cycles</h1><p className="text-sm text-slate-500">IVF / ICSI / IUI cycle lifecycle.</p></div>

      <Card>
        <CardHeader><CardTitle>Start a Cycle</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Patient</Label>
              <select {...form.register('patientId')} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">Select…</option>
                {patientList?.map((p: any) => <option key={p.id} value={p.id}>{p.givenName} {p.familyName}</option>)}
              </select>
              <FieldError message={form.formState.errors.patientId?.message} />
            </div>
            <div className="space-y-1">
              <Label>Treatment type</Label>
              <select {...form.register('treatmentType')} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="IVF">IVF</option><option value="ICSI">ICSI</option><option value="IUI">IUI</option><option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Protocol (optional)</Label>
              <Input {...form.register('protocolTemplate')} placeholder="e.g. Antagonist" />
            </div>
            <div className="self-end sm:col-span-3"><Button type="submit" loading={create.isPending}>Start Cycle</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !cyclesData || cyclesData.length === 0 ? <EmptyState title="No cycles yet" />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Cycle #</TableHead><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Next</TableHead><TableHead>Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {cyclesData.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.cycleNumber}</TableCell>
                      <TableCell>{c.patient ? `${c.patient.givenName} ${c.patient.familyName}` : '—'}</TableCell>
                      <TableCell>{c.treatmentType}</TableCell>
                      <TableCell><Badge tone={cycTone(c.status)}>{c.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500">{(NEXT[c.status] ?? []).join(', ') || '—'}</TableCell>
                      <TableCell>
                        {(NEXT[c.status] ?? []).slice(0, 1).map((n) => (
                          <Button key={n} size="sm" variant="outline" onClick={() => transition.mutate({ id: c.id, status: n })}>Advance</Button>
                        ))}
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

function cycTone(s: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (['OUTCOME', 'CLINICAL_PREGNANCY'].includes(s)) return 'success';
  if (['TRANSFER', 'FREEZING'].includes(s)) return 'info';
  if (['CANCELLED'].includes(s)) return 'danger';
  return 'primary';
}
