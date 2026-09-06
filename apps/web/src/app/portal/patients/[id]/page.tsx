'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Button,
  EmptyState,
} from '@ficms/ui';
import { patients, clinicalNotes, lab, billing, cycles, pharmacy } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

function field(value: string | null | undefined, fallback = '—') {
  return value ? String(value) : fallback;
}

export default function PatientRecordPage() {
  const params = useParams();
  const id = String(params.id);
  const qc = useQueryClient();
  const [error, setError] = React.useState('');

  const patient = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patients.get(id),
  });
  const notes = useQuery({
    queryKey: ['clinical-notes', id],
    queryFn: () => clinicalNotes.list({ pageSize: 50, patientId: id }),
  });
  const orders = useQuery({
    queryKey: ['lab', 'orders', id],
    queryFn: () => lab.orders({ pageSize: 50, patientId: id }),
  });
  const invoices = useQuery({
    queryKey: ['billing', 'invoices', id],
    queryFn: () => billing.invoices({ pageSize: 50, patientId: id }),
  });
  const cyclesQ = useQuery({
    queryKey: ['cycles', 'patient', id],
    queryFn: () => cycles.list({ pageSize: 50, patientId: id }),
  });
  const prescriptions = useQuery({
    queryKey: ['pharmacy', 'prescriptions', id],
    queryFn: () => pharmacy.prescriptions({ pageSize: 50, patientId: id }),
  });

  const signNote = useMutation({
    mutationFn: (noteId: string) => clinicalNotes.sign(noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinical-notes', id] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Signing failed.'),
  });

  const p = patient.data as any;
  const partnerLinks = (p?.partnerLinks ?? []) as any[];
  const consents = (p?.consents ?? []) as any[];
  const appointments = (p?.appointments ?? []) as any[];
  const noteRows = (notes.data ?? []) as any[];
  const orderRows = (orders.data ?? []) as any[];
  const invoiceRows = (invoices.data ?? []) as any[];
  const cycleRows = (cyclesQ.data ?? []) as any[];
  const rxRows = (prescriptions.data ?? []) as any[];

  if (patient.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (patient.isError || !p) {
    return (
      <div className="p-8">
        <EmptyState title="Patient not found" description="The patient could not be loaded or does not exist in this organisation." />
        <div className="mt-4">
          <Link href="/portal/patients">
            <Button variant="outline">Back to patients</Button>
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${p.givenName} ${p.familyName}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{fullName}</h1>
            <Badge tone={p.status === 'ACTIVE' ? 'success' : 'neutral'}>{p.status}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            MRN {p.medicalRecordNumber} · {p.sex} · {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '—'}
          </p>
        </div>
        <Link href={`/portal/patients/${id}/edit`}>
          <Button variant="outline">Edit patient</Button>
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact / demographics */}
        <Card>
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-slate-500">Name</span> <span className="text-slate-800">{fullName}</span></div>
            <div><span className="text-slate-500">Preferred</span> {field(p.preferredName)}</div>
            <div><span className="text-slate-500">Email</span> {field(p.email)}</div>
            <div><span className="text-slate-500">Phone</span> {field(p.phone)}</div>
            <div><span className="text-slate-500">Address</span> {field(p.address)}</div>
            <div><span className="text-slate-500">City</span> {field(p.city)}</div>
            <div><span className="text-slate-500">Emergency</span> {field(p.emergencyName)} {p.emergencyPhone ? `(${p.emergencyPhone})` : ''}</div>
          </CardContent>
        </Card>

        {/* Partners */}
        <Card>
          <CardHeader>
            <CardTitle>Partners</CardTitle>
          </CardHeader>
          <CardContent>
            {partnerLinks.length === 0 ? (
              <p className="text-sm text-slate-500">No linked partners.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {partnerLinks.map((pl: any) => (
                  <li key={pl.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                    <span className="text-slate-700">
                      {pl.patient?.familyName} {pl.patient?.givenName}
                    </span>
                    <Badge tone="neutral">{pl.relationshipType ?? 'partner'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Consents */}
        <Card>
          <CardHeader>
            <CardTitle>Consents</CardTitle>
          </CardHeader>
          <CardContent>
            {consents.length === 0 ? (
              <p className="text-sm text-slate-500">No consents.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {consents.map((c: any) => (
                  <li key={c.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                    <span className="text-slate-700">{c.title ?? c.consentType ?? c.type ?? 'Consent'}</span>
                    <Badge tone={c.status === 'SIGNED' ? 'success' : 'warning'}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-500">No appointments.</p>
          ) : (
            <div className="space-y-2">
              {appointments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span className="text-slate-700">{a.serviceType ?? 'Appointment'} — {new Date(a.scheduledStart).toLocaleString()}</span>
                  <Badge tone={a.status === 'SCHEDULED' ? 'info' : 'neutral'}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cycles */}
      <Card>
        <CardHeader>
          <CardTitle>Treatment cycles</CardTitle>
        </CardHeader>
        <CardContent>
          {cycleRows.length === 0 ? (
            <p className="text-sm text-slate-500">No cycles.</p>
          ) : (
            <div className="space-y-2">
              {cycleRows.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span className="text-slate-700">{c.cycleNumber} — {c.treatmentType ?? ''} ({c.protocolTemplate ?? '—'})</span>
                  <Badge tone="info">{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab orders */}
      <Card>
        <CardHeader>
          <CardTitle>Laboratory orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orderRows.length === 0 ? (
            <p className="text-sm text-slate-500">No lab orders.</p>
          ) : (
            <div className="space-y-2">
              {orderRows.map((o: any) => (
                <div key={o.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{o.orderNumber}</span>
                    <Badge tone={o.status === 'RELEASED' ? 'success' : o.status === 'REQUESTED' ? 'warning' : 'info'}>{o.status}</Badge>
                  </div>
                  {(o.results ?? []).map((r: any) => (
                    <div key={r.id} className="mt-1 flex gap-3 text-slate-500">
                      <span>{r.testName}</span>
                      <span>{r.value} {r.unit}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Prescriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {rxRows.length === 0 ? (
            <p className="text-sm text-slate-500">No prescriptions.</p>
          ) : (
            <div className="space-y-2">
              {rxRows.map((rx: any) => (
                <div key={rx.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span className="text-slate-700">
                    {(rx.items ?? []).map((i: any) => `${i.medicationName} x${i.quantity}`).join(', ') || 'Prescription'}
                  </span>
                  <Badge tone="info">{rx.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoiceRows.length === 0 ? (
            <p className="text-sm text-slate-500">No invoices.</p>
          ) : (
            <div className="space-y-2">
              {invoiceRows.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span className="text-slate-700">{inv.invoiceNumber}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{inv.total} {inv.currency}</span>
                    <Badge tone={inv.status === 'PAID' ? 'success' : inv.status === 'ISSUED' ? 'warning' : 'neutral'}>{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinical notes */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical notes</CardTitle>
        </CardHeader>
        <CardContent>
          {noteRows.length === 0 ? (
            <p className="text-sm text-slate-500">No notes. <Link href="/portal/notes" className="text-brand-700 hover:underline">Create one</Link>.</p>
          ) : (
            <div className="space-y-3">
              {noteRows.map((n: any) => (
                <div key={n.id} className="rounded-md border border-slate-200 p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge tone={n.signed ? 'success' : 'neutral'}>{n.signed ? 'Signed' : 'Draft'}</Badge>
                    <Badge tone="info">{n.category}</Badge>
                    <span className="text-xs text-slate-500">v{n.version}</span>
                    <span className="ml-auto text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>
                  {!n.signed && (
                    <Button size="sm" variant="outline" className="mt-2" loading={signNote.isPending} onClick={() => signNote.mutate(n.id)}>
                      Sign
                    </Button>
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
