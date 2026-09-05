'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Badge, Spinner, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@ficms/ui';
import { lab, patients } from '@/lib/queries';

export default function LabPage() {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({ queryKey: ['lab', 'orders'], queryFn: () => lab.orders({ pageSize: 50 }) });
  const { data: tests } = useQuery({ queryKey: ['lab', 'tests'], queryFn: () => lab.tests({ pageSize: 100 }) });
  const { data: patientList } = useQuery({ queryKey: ['patients', 'lookup'], queryFn: () => patients.list({ pageSize: 100 }) });
  const [patientId, setPatientId] = React.useState('');

  const createOrder = useMutation({
    mutationFn: () => lab.createOrder({ patientId, priority: 'routine', requestedTests: tests?.slice(0, 1)?.map((t: any) => ({ testName: t.name, testCode: t.code })) ?? [] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab'] }),
  });
  const release = useMutation({
    mutationFn: (id: string) => lab.release(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab'] }),
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Laboratory</h1><p className="text-sm text-slate-500">Orders, specimens, and result release workflow.</p></div>

      <Card>
        <CardHeader><CardTitle>New Lab Order</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px]">
              <label className="text-sm font-medium text-slate-900">Patient</label>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">Select…</option>
                {patientList?.map((p: any) => <option key={p.id} value={p.id}>{p.givenName} {p.familyName}</option>)}
              </select>
            </div>
            <Button disabled={!patientId} loading={createOrder.isPending} onClick={() => createOrder.mutate()}>Create order</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-slate-100 px-5 py-3 text-sm font-medium text-slate-500">Test catalogue: {tests?.length ?? 0} tests</div>
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !orders || orders.length === 0 ? <EmptyState title="No lab orders" />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Order #</TableHead><TableHead>Patient</TableHead><TableHead>Status</TableHead><TableHead>Results</TableHead><TableHead>Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                      <TableCell>{o.patient ? `${o.patient.givenName} ${o.patient.familyName}` : '—'}</TableCell>
                      <TableCell><Badge tone={statusTone(o.status)}>{o.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>{o.results?.length ?? 0}</TableCell>
                      <TableCell>
                        {o.status === 'VERIFIED' && <Button size="sm" variant="outline" onClick={() => release.mutate(o.id)}>Release</Button>}
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

function statusTone(s: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (['RELEASED'].includes(s)) return 'success';
  if (['VERIFIED'].includes(s)) return 'primary';
  if (['PROCESSING', 'ACCESSED'].includes(s)) return 'info';
  if (['INVALIDATED'].includes(s)) return 'danger';
  return 'neutral';
}
