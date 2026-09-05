'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  EmptyState,
} from '@ficms/ui';
import { admin } from '@/lib/queries';

export default function AdminAuditPage() {
  const [action, setAction] = React.useState('');
  const [resourceType, setResourceType] = React.useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', action, resourceType],
    queryFn: () =>
      admin.auditEvents({
        pageSize: 50,
        action: action || undefined,
        resourceType: resourceType || undefined,
      }),
  });

  const events = (data ?? []) as any[];
  const actionTone = (a: string) =>
    a.startsWith('breakglass') ? 'warning' : a.includes('.delete') ? 'danger' : a.includes('.create') ? 'success' : 'info';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit trail</h1>
        <p className="text-sm text-slate-500">Immutable audit events across all organisations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <input
            placeholder="Filter by action (e.g. breakglass.access)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          />
          <input
            placeholder="Filter by resource type (e.g. patient)"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner />
          ) : events.length === 0 ? (
            <EmptyState title="No audit events" description="No audit events match your filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <Badge tone={actionTone(ev.action)}>{ev.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{ev.resourceType}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {ev.organizationId ? `${ev.organizationId.slice(0, 8)}…` : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{ev.actorId ? `${ev.actorId.slice(0, 8)}…` : '—'}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-slate-500" title={ev.reason ?? ''}>
                      {ev.reason ?? ''}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{new Date(ev.timestamp).toLocaleString()}</TableCell>
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
