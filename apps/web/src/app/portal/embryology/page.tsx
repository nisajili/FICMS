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
import { embryology, cycles, admin } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const createSchema = z.object({
  cycleId: z.string().min(1, 'Select a cycle'),
  patientId: z.string().min(1, 'Select a patient'),
  label: z.string().min(1, 'Embryo label required'),
  status: z.enum(['OOCYTE', 'FERTILIZED', 'CULTURING', 'TRANSFERRED', 'FROZEN', 'DISCARDED', 'BIOPSIED', 'WARMED', 'THAWED']),
  grade: z.string().optional().or(z.literal('')),
  development: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});
type CreateValues = z.infer<typeof createSchema>;

const observeSchema = z.object({
  day: z.coerce.number().int().min(1, 'Day is required'),
  cellCount: z.coerce.number().int().min(1).optional(),
  grade: z.string().optional().or(z.literal('')),
  fragmentationPercent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional().or(z.literal('')),
});
type ObserveValues = z.infer<typeof observeSchema>;

const witnessSchema = z.object({
  witnessId: z.string().min(1, 'Select a witness'),
  note: z.string().optional().or(z.literal('')),
});
type WitnessValues = z.infer<typeof witnessSchema>;

const STATUS_OPTIONS = ['OOCYTE', 'FERTILIZED', 'CULTURING', 'TRANSFERRED', 'FROZEN', 'DISCARDED', 'BIOPSIED', 'WARMED', 'THAWED'] as const;
const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'info' | 'danger'> = {
  OOCYTE: 'neutral',
  FERTILIZED: 'info',
  CULTURING: 'info',
  TRANSFERRED: 'success',
  FROZEN: 'success',
  DISCARDED: 'danger',
  BIOPSIED: 'warning',
  WARMED: 'warning',
  THAWED: 'warning',
};

export default function EmbryologyPage() {
  const qc = useQueryClient();
  const [error, setError] = React.useState('');
  const [cycleFilter, setCycleFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [observeFor, setObserveFor] = React.useState<string | null>(null);
  const [witnessFor, setWitnessFor] = React.useState<{ id: string; type: 'transfer' | 'freeze' } | null>(null);

  const embryos = useQuery({
    queryKey: ['embryology', 'embryos', cycleFilter, statusFilter],
    queryFn: () => embryology.embryos({ pageSize: 100, cycleId: cycleFilter || undefined, status: statusFilter || undefined }),
  });
  const cycleQuery = useQuery({
    queryKey: ['cycles', 'all'],
    queryFn: () => cycles.list({ pageSize: 100 }),
  });
  const staffQuery = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => admin.users({ pageSize: 100 }),
  });

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { status: 'OOCYTE' },
  });
  const observeForm = useForm<ObserveValues>({
    resolver: zodResolver(observeSchema),
    defaultValues: { day: 1 },
  });
  const witnessForm = useForm<WitnessValues>({ resolver: zodResolver(witnessSchema) });

  const create = useMutation({
    mutationFn: (values: CreateValues) =>
      embryology.create({
        cycleId: values.cycleId,
        patientId: values.patientId,
        label: values.label,
        status: values.status,
        grade: values.grade || undefined,
        development: values.development || undefined,
        location: values.location || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['embryology'] });
      createForm.reset({ status: 'OOCYTE' });
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to create embryo.'),
  });

  const observe = useMutation({
    mutationFn: (values: ObserveValues) => embryology.observe(observeFor!, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['embryology'] });
      setObserveFor(null);
      observeForm.reset({ day: 1 });
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to record observation.'),
  });

  const witness = useMutation({
    mutationFn: (values: WitnessValues) => {
      const body = { witnessId: values.witnessId, note: values.note || undefined };
      return witnessFor!.type === 'transfer'
        ? embryology.verifyTransfer(witnessFor!.id, body)
        : embryology.verifyFreeze(witnessFor!.id, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['embryology'] });
      setWitnessFor(null);
      witnessForm.reset();
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Verification failed.'),
  });

  const setStatus = useMutation({
    mutationFn: (args: { id: string; status: string }) => embryology.setStatus(args.id, args.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['embryology'] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Status update failed.'),
  });

  const rows = (embryos.data ?? []) as any[];
  const cycleOptions = (cycleQuery.data ?? []) as any[];
  const staffOptions = (staffQuery.data ?? []) as any[];

  const selectedCycleId = createForm.watch('cycleId');
  const selectedCycle = cycleOptions.find((c) => c.id === selectedCycleId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Embryology / IVF lab</h1>
        <p className="text-sm text-slate-500">
          Identify embryos, record day-by-day observations, and double-witness verify transfers &amp; freezes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identify an embryo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createForm.handleSubmit((v) => create.mutate(v))} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="cycleId">Cycle</Label>
              <select
                id="cycleId"
                {...createForm.register('cycleId')}
                defaultValue=""
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="" disabled>
                  Select a cycle
                </option>
                {cycleOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cycleNumber} — {c.patient?.familyName} {c.patient?.givenName} ({c.treatmentType ?? ''})
                  </option>
                ))}
              </select>
              <FieldError message={createForm.formState.errors.cycleId?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="patientId">Patient</Label>
              <select
                id="patientId"
                {...createForm.register('patientId')}
                defaultValue=""
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="" disabled>
                  {selectedCycle?.patient ? `Auto: ${selectedCycle.patient.familyName} ${selectedCycle.patient.givenName}` : 'Select a patient'}
                </option>
                {selectedCycle?.patient && (
                  <option value={selectedCycle.patient.id}>
                    {selectedCycle.patient.familyName} {selectedCycle.patient.givenName} — {selectedCycle.patient.medicalRecordNumber}
                  </option>
                )}
              </select>
              <FieldError message={createForm.formState.errors.patientId?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="label">Label</Label>
              <Input id="label" placeholder="e.g. 2PN / Day3-4AA" {...createForm.register('label')} />
              <FieldError message={createForm.formState.errors.label?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <select id="status" {...createForm.register('status')} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="grade">Grade</Label>
              <Input id="grade" placeholder="4AA" {...createForm.register('grade')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="development">Development</Label>
              <Input id="development" placeholder="Morula / Blastocyst" {...createForm.register('development')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Incubator / tank position" {...createForm.register('location')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" {...createForm.register('notes')} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={create.isPending}>
                Create embryo
              </Button>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embryos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All cycles</option>
              {cycleOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cycleNumber} — {c.patient?.familyName} {c.patient?.givenName}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {embryos.isLoading ? (
            <Spinner />
          ) : rows.length === 0 ? (
            <EmptyState title="No embryos" description="Identify an embryo above." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Observations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-slate-900">{e.label}</TableCell>
                    <TableCell className="text-sm text-slate-600">—</TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[e.status] ?? 'neutral'}>{e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{e.grade ?? '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {(e.observations ?? []).length > 0
                        ? `D${e.observations.map((o: any) => o.day).join(', D')}`
                        : 'None'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setObserveFor(e.id)}>
                          Observe
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setWitnessFor({ id: e.id, type: 'transfer' })}>
                          Verify transfer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setWitnessFor({ id: e.id, type: 'freeze' })}>
                          Verify freeze
                        </Button>
                        <select
                          value={e.status}
                          onChange={(ev) => setStatus.mutate({ id: e.id, status: ev.target.value })}
                          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {observeFor && (
        <Card>
          <CardHeader>
            <CardTitle>Record observation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={observeForm.handleSubmit((v) => observe.mutate(v))} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="day">Day</Label>
                <Input id="day" type="number" {...observeForm.register('day')} />
                <FieldError message={observeForm.formState.errors.day?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cellCount">Cell count</Label>
                <Input id="cellCount" type="number" {...observeForm.register('cellCount')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="grade">Grade</Label>
                <Input id="grade" {...observeForm.register('grade')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="frag">Fragmentation (%)</Label>
                <Input id="frag" type="number" {...observeForm.register('fragmentationPercent')} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="obs-notes">Notes</Label>
                <Input id="obs-notes" {...observeForm.register('notes')} />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" loading={observe.isPending}>
                  Save observation
                </Button>
                <Button type="button" variant="ghost" onClick={() => setObserveFor(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {witnessFor && (
        <Card>
          <CardHeader>
            <CardTitle>Double-witness verify — {witnessFor.type}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={witnessForm.handleSubmit((v) => witness.mutate(v))} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="witnessId">Witness (different staff member)</Label>
                <select
                  id="witnessId"
                  {...witnessForm.register('witnessId')}
                  defaultValue=""
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="" disabled>
                    Select a witness
                  </option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
                <FieldError message={witnessForm.formState.errors.witnessId?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="witness-note">Note</Label>
                <Input id="witness-note" {...witnessForm.register('note')} />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" loading={witness.isPending}>
                  Confirm with witness
                </Button>
                <Button type="button" variant="ghost" onClick={() => setWitnessFor(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
