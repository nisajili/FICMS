'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Badge, Spinner, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input,
} from '@ficms/ui';
import { billing, patients } from '@/lib/queries';

export default function BillingPage() {
  const qc = useQueryClient();
  const { data: invoices, isLoading } = useQuery({ queryKey: ['billing'], queryFn: () => billing.invoices({ pageSize: 50 }) });
  const { data: patientList } = useQuery({ queryKey: ['patients', 'lookup'], queryFn: () => patients.list({ pageSize: 100 }) });
  const [patientId, setPatientId] = React.useState('');
  const [amount, setAmount] = React.useState('0');
  const [method, setMethod] = React.useState('CASH');

  const createInvoice = useMutation({
    mutationFn: () => billing.createInvoice({ patientId, lineItems: [{ description: 'Consultation', quantity: 1, unitPrice: Number(amount) || 0 }] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
  const issue = useMutation({
    mutationFn: (id: string) => billing.issue(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
  const pay = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => billing.pay(id, {
      amount, method, idempotencyKey: `${crypto.randomUUID()}`,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Billing</h1><p className="text-sm text-slate-500">Invoices, installments, and payments.</p></div>

      <Card>
        <CardHeader><CardTitle>Create Invoice</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px]">
              <label className="text-sm font-medium text-slate-900">Patient</label>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">Select…</option>
                {patientList?.map((p: any) => <option key={p.id} value={p.id}>{p.givenName} {p.familyName}</option>)}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="text-sm font-medium text-slate-900">Amount</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Button disabled={!patientId} loading={createInvoice.isPending} onClick={() => createInvoice.mutate()}>Create invoice</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !invoices || invoices.length === 0 ? <EmptyState title="No invoices" />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Invoice #</TableHead><TableHead>Patient</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.patient ? `${inv.patient.givenName} ${inv.patient.familyName}` : '—'}</TableCell>
                      <TableCell>{money(inv.total, inv.currency)}</TableCell>
                      <TableCell>{money(inv.amountPaid, inv.currency)}</TableCell>
                      <TableCell className="font-medium">{money(inv.amountDue, inv.currency)}</TableCell>
                      <TableCell><Badge tone={invTone(inv.status)}>{inv.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>
                        {inv.status === 'DRAFT' && <Button size="sm" variant="outline" onClick={() => issue.mutate(inv.id)}>Issue</Button>}
                        {['ISSUED', 'PARTIALLY_PAID'].includes(inv.status) && (
                          <Button size="sm" variant="outline" onClick={() => pay.mutate({ id: inv.id, amount: Number(inv.amountDue) || 0 })}>Pay balance</Button>
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

function money(n: number, c: string): string { return new Intl.NumberFormat(undefined, { style: 'currency', currency: c || 'USD' }).format(n); }
function invTone(s: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (['PAID'].includes(s)) return 'success';
  if (['ISSUED', 'PARTIALLY_PAID'].includes(s)) return 'info';
  if (['CANCELLED', 'REFUNDED'].includes(s)) return 'danger';
  return 'neutral';
}
