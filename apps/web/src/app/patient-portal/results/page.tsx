'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Badge, Spinner, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@ficms/ui';
import { self } from '@/lib/queries';

export default function PatientResults() {
  const { data: results, isLoading } = useQuery({ queryKey: ['me', 'results'], queryFn: self.results });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">My Results</h1><p className="text-sm text-slate-500">Released laboratory and imaging results.</p></div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !results || results.length === 0 ? <EmptyState title="No released results yet" description="Results are shown here only after your clinician releases them." />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Test</TableHead><TableHead>Value</TableHead><TableHead>Reference</TableHead><TableHead>Released</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {results.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-slate-900">{r.testName}</TableCell>
                      <TableCell>{r.value} {r.unit || ''}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {r.referenceLow ?? '—'} – {r.referenceHigh ?? '—'}
                      </TableCell>
                      <TableCell>
                        {r.labOrder?.releasedAt ? new Date(r.labOrder.releasedAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge tone={r.isAbnormal ? 'warning' : 'success'}>{r.isAbnormal ? 'Monitor' : 'Normal'}</Badge>
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
