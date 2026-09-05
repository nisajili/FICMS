'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@ficms/ui';
import { cryo } from '@/lib/queries';

export default function CryostoragePage() {
  const { data: tanks, isLoading } = useQuery({ queryKey: ['cryo', 'tanks'], queryFn: cryo.tanks });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Cryostorage</h1><p className="text-sm text-slate-500">Tanks, positions, and temperature monitoring.</p></div>

      <Card>
        <CardHeader><CardTitle>Tanks</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Spinner />
            : !tanks || tanks.length === 0 ? <EmptyState title="No cryostorage tanks yet" />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Label</TableHead><TableHead>Capacity</TableHead><TableHead>Current temp</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tanks.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-slate-900">{t.name}</TableCell>
                      <TableCell>{t.label || '—'}</TableCell>
                      <TableCell>{t.capacity}</TableCell>
                      <TableCell>{t.currentTempC != null ? `${t.currentTempC}°C` : '—'}</TableCell>
                      <TableCell><Badge tone={t.status === 'active' ? 'success' : 'warning'}>{t.status}</Badge></TableCell>
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
