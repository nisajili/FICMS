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
import { pharmacy, patients } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const medSchema = z.object({
  name: z.string().min(1, 'Medication name required'),
  genericName: z.string().optional().or(z.literal('')),
  form: z.string().optional().or(z.literal('')),
  strength: z.string().optional().or(z.literal('')),
});
type MedValues = z.infer<typeof medSchema>;

interface RxItem {
  medicationName: string;
  dosage: string;
  quantity: number;
}

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'info' | 'danger'> = {
  DRAFT: 'neutral',
  PRESCRIBED: 'warning',
  VERIFIED: 'info',
  DISPENSED: 'success',
  PARTIALLY_DISPENSED: 'success',
  CANCELLED: 'danger',
};

export default function PharmacyPage() {
  const qc = useQueryClient();
  const [error, setError] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [patientFilter, setPatientFilter] = React.useState('');
  const [patientId, setPatientId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [items, setItems] = React.useState<RxItem[]>([{ medicationName: '', dosage: '', quantity: 1 }]);

  const meds = useQuery({
    queryKey: ['pharmacy', 'medications'],
    queryFn: () => pharmacy.medications({ pageSize: 100 }),
  });
  const rx = useQuery({
    queryKey: ['pharmacy', 'prescriptions', statusFilter, patientFilter],
    queryFn: () => pharmacy.prescriptions({ pageSize: 100, status: statusFilter || undefined, patientId: patientFilter || undefined }),
  });
  const patientQuery = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => patients.list({ pageSize: 100 }),
  });

  const medForm = useForm<MedValues>({ resolver: zodResolver(medSchema) });

  const addMed = useMutation({
    mutationFn: (values: MedValues) =>
      pharmacy.createMedication({
        name: values.name,
        genericName: values.genericName || undefined,
        form: values.form || undefined,
        strength: values.strength || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy', 'medications'] });
      medForm.reset();
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to add medication.'),
  });

  const createRx = useMutation({
    mutationFn: () =>
      pharmacy.createPrescription({
        patientId,
        notes: notes || undefined,
        items: items
          .filter((i) => i.medicationName && i.dosage && i.quantity > 0)
          .map((i) => ({ medicationName: i.medicationName, dosage: i.dosage, quantity: i.quantity })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy', 'prescriptions'] });
      setPatientId('');
      setNotes('');
      setItems([{ medicationName: '', dosage: '', quantity: 1 }]);
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to create prescription.'),
  });

  const verify = useMutation({
    mutationFn: (id: string) => pharmacy.verify(id, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy', 'prescriptions'] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Verification failed.'),
  });

  const dispense = useMutation({
    mutationFn: (args: { id: string; itemId: string; quantity: number }) =>
      pharmacy.dispense(args.id, { prescriptionItemId: args.itemId, quantity: args.quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy', 'prescriptions'] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Dispensing failed.'),
  });

  const medicationOptions = (meds.data ?? []) as any[];
  const rxRows = (rx.data ?? []) as any[];
  const patientOptions = (patientQuery.data ?? []) as any[];

  const updateItem = (idx: number, patch: Partial<RxItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const canDispense = (rx: any) => rx.status === 'VERIFIED' || rx.status === 'PARTIALLY_DISPENSED';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pharmacy</h1>
        <p className="text-sm text-slate-500">
          Prescribe, verify and dispense. Dispensing deducts linked inventory transactionally.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add medication</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={medForm.handleSubmit((v) => addMed.mutate(v))} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="mname">Name</Label>
                <Input id="mname" placeholder="Follistim" {...medForm.register('name')} />
                <FieldError message={medForm.formState.errors.name?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gname">Generic name</Label>
                <Input id="gname" {...medForm.register('genericName')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="form">Form</Label>
                <Input id="form" placeholder="Solution" {...medForm.register('form')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="strength">Strength</Label>
                <Input id="strength" placeholder="300 IU" {...medForm.register('strength')} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" loading={addMed.isPending}>
                  Add medication
                </Button>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalogue ({medicationOptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {meds.isLoading ? (
              <Spinner />
            ) : medicationOptions.length === 0 ? (
              <p className="text-sm text-slate-500">No medications yet.</p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {medicationOptions.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-800">{m.name}</span>
                      {m.strength && <span className="ml-2 text-slate-500">{m.strength}</span>}
                    </div>
                    <Badge tone="neutral">{m.form ?? '—'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New prescription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="rx-patient">Patient</Label>
              <select
                id="rx-patient"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
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
            </div>
            <div className="space-y-1">
              <Label htmlFor="rx-notes">Notes</Label>
              <Input id="rx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label>Items</Label>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <select
                  value={it.medicationName}
                  onChange={(e) => updateItem(idx, { medicationName: e.target.value })}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">Medication…</option>
                  {medicationOptions.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.strength ?? ''}
                    </option>
                  ))}
                </select>
                <Input placeholder="Dosage" value={it.dosage} onChange={(e) => updateItem(idx, { dosage: e.target.value })} />
                <Input
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                />
                <Button type="button" variant="ghost" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setItems((prev) => [...prev, { medicationName: '', dosage: '', quantity: 1 }])}
            >
              + Add item
            </Button>
          </div>

          <div className="mt-4">
            <Button
              loading={createRx.isPending}
              disabled={!patientId || items.length === 0}
              onClick={() => createRx.mutate()}
            >
              Create prescription
            </Button>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prescriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              {Object.keys(STATUS_TONE).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
          </div>

          {rx.isLoading ? (
            <Spinner />
          ) : rxRows.length === 0 ? (
            <EmptyState title="No prescriptions" description="Create a prescription above." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rxRows.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell className="font-medium text-slate-900">
                      {rx.patient?.familyName} {rx.patient?.givenName}
                    </TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[rx.status] ?? 'neutral'}>{rx.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {rx.items.map((i: any) => `${i.medicationName} x${i.quantity}`).join(', ')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {rx.status === 'PRESCRIBED' && (
                          <Button size="sm" loading={verify.isPending} onClick={() => verify.mutate(rx.id)}>
                            Verify
                          </Button>
                        )}
                        {canDispense(rx) &&
                          rx.items
                            .filter((i: any) => Number(i.quantity) > Number(i.issuedQuantity))
                            .map((i: any) => (
                              <Button
                                key={i.id}
                                size="sm"
                                variant="outline"
                                loading={dispense.isPending}
                                onClick={() =>
                                  dispense.mutate({
                                    id: rx.id,
                                    itemId: i.id,
                                    quantity: Number(i.quantity) - Number(i.issuedQuantity),
                                  })
                                }
                              >
                                Dispense {i.medicationName}
                              </Button>
                            ))}
                      </div>
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
