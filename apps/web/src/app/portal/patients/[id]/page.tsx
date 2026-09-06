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
import { patients, clinicalNotes, lab, billing, cycles, pharmacy, documents, consents as consentsApi } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

function field(value: string | null | undefined, fallback = '—') {
  return value ? String(value) : fallback;
}

function formatBytes(bytes: number | undefined | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function PatientRecordPage() {
  const params = useParams();
  const id = String(params.id);
  const qc = useQueryClient();
  const [error, setError] = React.useState('');
  const [docMsg, setDocMsg] = React.useState('');
  const [consentMsg, setConsentMsg] = React.useState('');
  const [consentForm, setConsentForm] = React.useState<{ kind: 'sign' | 'witness'; id: string } | null>(null);

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
  const docList = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documents.listForPatient(id),
  });
  const consentList = useQuery({
    queryKey: ['consents', id],
    queryFn: () => consentsApi.list({ patientId: id }),
  });

  const signNote = useMutation({
    mutationFn: (noteId: string) => clinicalNotes.sign(noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinical-notes', id] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Signing failed.'),
  });

  const uploadDoc = useMutation({
    mutationFn: ({ file, type, description }: { file: File; type: string; description?: string }) =>
      documents.upload(id, file, type, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', id] });
      setDocMsg('Document uploaded.');
    },
    onError: (e: unknown) => setDocMsg(e instanceof ApiClientError ? e.message : 'Upload failed.'),
  });
  const deleteDoc = useMutation({
    mutationFn: (docId: string) => documents.remove(docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', id] }),
    onError: (e: unknown) => setDocMsg(e instanceof ApiClientError ? e.message : 'Delete failed.'),
  });

  const createConsent = useMutation({
    mutationFn: (body: Record<string, unknown>) => consentsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consents', id] });
      setConsentMsg('Consent draft created.');
    },
    onError: (e: unknown) => setConsentMsg(e instanceof ApiClientError ? e.message : 'Create failed.'),
  });
  const signConsent = useMutation({
    mutationFn: ({ cid, signedByName, witnessName }: { cid: string; signedByName: string; witnessName?: string }) =>
      consentsApi.sign(cid, { signedByName, witnessName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents', id] }),
    onError: (e: unknown) => setConsentMsg(e instanceof ApiClientError ? e.message : 'Sign failed.'),
  });
  const witnessConsent = useMutation({
    mutationFn: ({ cid, witnessName }: { cid: string; witnessName: string }) => consentsApi.witness(cid, { witnessName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents', id] }),
    onError: (e: unknown) => setConsentMsg(e instanceof ApiClientError ? e.message : 'Witness failed.'),
  });
  const versionConsent = useMutation({
    mutationFn: (cid: string) => consentsApi.version(cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents', id] }),
    onError: (e: unknown) => setConsentMsg(e instanceof ApiClientError ? e.message : 'Version failed.'),
  });
  const deleteConsent = useMutation({
    mutationFn: (cid: string) => consentsApi.remove(cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents', id] }),
    onError: (e: unknown) => setConsentMsg(e instanceof ApiClientError ? e.message : 'Delete failed.'),
  });

  const p = patient.data as any;
  const partnerLinks = (p?.partnerLinks ?? []) as any[];

  const appointments = (p?.appointments ?? []) as any[];
  const noteRows = (notes.data ?? []) as any[];
  const orderRows = (orders.data ?? []) as any[];
  const invoiceRows = (invoices.data ?? []) as any[];
  const cycleRows = (cyclesQ.data ?? []) as any[];
  const rxRows = (prescriptions.data ?? []) as any[];
  const docRows = (docList.data ?? []) as any[];
  const docTypes = ['ID', 'SCAN', 'REPORT', 'CONSENT', 'OTHER'];
  const consentRows = (consentList.data ?? []) as any[];
  const consentTone = (s: string): any =>
    s === 'SIGNED' || s === 'WITNESSED' ? 'success' : s === 'REVOKED' ? 'danger' : 'warning';
  const consentLabel = (s: string): string =>
    ({ DRAFT: 'Draft', PENDING_SIGNATURE: 'Pending', SIGNED: 'Signed', WITNESSED: 'Witnessed', REVOKED: 'Revoked' }[s] ?? s);

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

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const file = fd.get('file') as File;
              if (!file || file.size === 0) {
                setDocMsg('Choose a file to upload.');
                return;
              }
              uploadDoc.mutate({ file, type: String(fd.get('type') ?? 'OTHER'), description: String(fd.get('description') ?? '') || undefined });
            }}
          >
            <label className="flex flex-col text-xs font-medium text-slate-600">
              File
              <input
                type="file"
                name="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx,.csv,.txt"
                className="mt-1 text-sm"
                required
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Type
              <select name="type" className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Description
              <input
                name="description"
                placeholder="Optional"
                className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <Button type="submit" size="sm" variant="outline" loading={uploadDoc.isPending}>
              Upload
            </Button>
          </form>

          {docMsg && <p className="text-sm text-slate-600">{docMsg}</p>}
          {docList.isLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : docRows.length === 0 ? (
            <p className="text-sm text-slate-500">No documents uploaded.</p>
          ) : (
            <div className="space-y-2">
              {docRows.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-700">{d.fileName}</span>
                      <Badge tone="info">{d.type}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {d.description || 'No description'} · {formatBytes(d.sizeBytes)} · {new Date(d.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={documents.downloadUrl(d.id)} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm">Download</Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      loading={deleteDoc.isPending}
                      onClick={() => deleteDoc.mutate(d.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consents */}
      <Card>
        <CardHeader>
          <CardTitle>Consents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createConsent.mutate({
                patientId: id,
                title: String(fd.get('title') ?? 'Consent'),
                content: String(fd.get('content') ?? '') || undefined,
              });
            }}
          >
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Title
              <input name="title" required placeholder="IVF treatment consent" className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Content
              <input name="content" placeholder="Optional" className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </label>
            <Button type="submit" size="sm" variant="outline" loading={createConsent.isPending}>
              Create draft
            </Button>
          </form>

          {consentMsg && <p className="text-sm text-slate-600">{consentMsg}</p>}
          {consentList.isLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : consentRows.length === 0 ? (
            <p className="text-sm text-slate-500">No consents on file.</p>
          ) : (
            <div className="space-y-2">
              {consentRows.map((c: any) => {
                const cf = consentForm;
                const isEditable = c.status === 'DRAFT' || c.status === 'PENDING_SIGNATURE';
                const isSigned = c.status === 'SIGNED';
                const isWitnessed = c.status === 'WITNESSED';
                const isSigning = !!cf && cf.id === c.id && cf.kind === 'sign';
                const isWitnessing = !!cf && cf.id === c.id && cf.kind === 'witness';
                return (
                  <div key={c.id} className="rounded-md border border-slate-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{c.title}</span>
                        <Badge tone={consentTone(c.status)}>{consentLabel(c.status)}</Badge>
                        <span className="text-xs text-slate-500">v{c.version}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(c.signedByName || c.signedAt) && (
                          <span className="text-xs text-slate-500">
                            Signed by {c.signedByName ?? '—'}{c.signedAt ? ` · ${new Date(c.signedAt).toLocaleDateString()}` : ''}
                          </span>
                        )}
                        {isEditable && !consentForm && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setConsentForm({ kind: 'sign', id: c.id })}>Sign</Button>
                            <Button size="sm" variant="ghost" className="text-red-600" loading={deleteConsent.isPending} onClick={() => deleteConsent.mutate(c.id)}>Delete</Button>
                          </>
                        )}
                        {isSigned && !consentForm && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setConsentForm({ kind: 'witness', id: c.id })}>Witness</Button>
                          </>
                        )}
                        {(isSigned || isWitnessed || c.status === 'REVOKED') && (
                          <>
                            <Button size="sm" variant="ghost" loading={versionConsent.isPending} onClick={() => versionConsent.mutate(c.id)}>New version</Button>
                          </>
                        )}
                        {isWitnessed && (
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (window.confirm('Revoke this consent?')) consentsApi.revoke(c.id).then(() => qc.invalidateQueries({ queryKey: ['consents', id] })); }}>Revoke</Button>
                        )}
                      </div>
                    </div>
                    {isWitnessing && (
                      <form className="mt-2 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          witnessConsent.mutate({ cid: c.id, witnessName: String(fd.get('witnessName') ?? '') });
                          setConsentForm(null);
                        }}>
                        <label className="flex flex-col text-xs font-medium text-slate-600">
                          Witness name
                          <input name="witnessName" required className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        </label>
                        <Button type="submit" size="sm" variant="outline" loading={witnessConsent.isPending}>Confirm witness</Button>
                      </form>
                    )}
                    {isSigning && (
                      <form className="mt-2 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          signConsent.mutate({ cid: c.id, signedByName: String(fd.get('signedByName') ?? 'Patient'), witnessName: String(fd.get('witnessName') ?? '') || undefined });
                          setConsentForm(null);
                        }}>
                        <label className="flex flex-col text-xs font-medium text-slate-600">
                          Signer name
                          <input name="signedByName" required className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        </label>
                        <label className="flex flex-col text-xs font-medium text-slate-600">
                          Witness name (optional)
                          <input name="witnessName" className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        </label>
                        <Button type="submit" size="sm" variant="outline" loading={signConsent.isPending}>Confirm sign</Button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
