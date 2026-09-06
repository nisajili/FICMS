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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from '@ficms/ui';
import { admin } from '@/lib/queries';

export default function AdminDashboardPage() {
  const orgs = useQuery({
    queryKey: ['admin', 'organizations', 'all'],
    queryFn: () => admin.organizations({ pageSize: 100 }),
  });
  const grants = useQuery({
    queryKey: ['admin', 'breakglass', 'list'],
    queryFn: () => admin.breakGlass.list({ pageSize: 100 }),
  });
  const audit = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => admin.auditEvents({ pageSize: 10 }),
  });

  const organizations = (orgs.data ?? []) as any[];
  const grantList = (grants.data ?? []) as any[];
  const activeGrants = grantList.filter((g) => g.status === 'ACTIVE');
  const pendingGrants = grantList.filter((g) => g.status === 'PENDING');
  const auditEvents = (audit.data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Platform overview</h1>
        <p className="text-sm text-slate-500">
          Aggregate platform state. No patient-identifiable data is shown here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Clinics onboarded</CardTitle>
          </CardHeader>
          <CardContent>
            {orgs.isLoading ? <Spinner /> : <p className="text-3xl font-semibold">{organizations.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active break-glass</CardTitle>
          </CardHeader>
          <CardContent>
            {grants.isLoading ? <Spinner /> : <p className="text-3xl font-semibold">{activeGrants.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {grants.isLoading ? <Spinner /> : <p className="text-3xl font-semibold">{pendingGrants.length}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit events</CardTitle>
        </CardHeader>
        <CardContent>
          {audit.isLoading ? (
            <Spinner />
          ) : auditEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No audit events yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEvents.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <Badge tone="info">{ev.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{ev.resourceType}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {ev.organizationId ? `${ev.organizationId.slice(0, 8)}…` : '—'}
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
