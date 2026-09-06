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
  Textarea,
} from '@ficms/ui';
import { admin } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organisation'),
  reason: z.string().min(8, 'Provide a specific, auditable reason (min 8 characters)'),
  durationMinutes: z.coerce.number().int().min(1).max(120).optional(),
});
type FormValues = z.infer<typeof schema>;

const tone: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  REVOKED: 'danger',
  EXPIRED: 'neutral',
};

export default function AdminBreakGlassPage() {
  const qc = useQueryClient();
  const [error, setError] = React.useState('');
  const [emergencyOrg, setEmergencyOrg] = React.useState('');

  const grants = useQuery({
    queryKey: ['admin', 'breakglass', 'list'],
    queryFn: () => admin.breakGlass.list({ pageSize: 100 }),
  });
  const orgs = useQuery({
    queryKey: ['admin', 'organizations', 'all'],
    queryFn: () => admin.organizations({ pageSize: 100 }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { durationMinutes: 60 },
  });

  const request = useMutation({
    mutationFn: (values: FormValues) =>
      admin.breakGlass.request({
        organizationId: values.organizationId,
        reason: values.reason,
        durationMinutes: values.durationMinutes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'breakglass'] });
      form.reset({ durationMinutes: 60 });
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to create request.'),
  });

  const approve = useMutation({
    mutationFn: (id: string) => admin.breakGlass.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'breakglass'] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Approval failed.'),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => admin.breakGlass.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'breakglass'] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Revoke failed.'),
  });

  const emergency = useMutation({
    mutationFn: (organizationId: string) => admin.breakGlass.emergency(organizationId),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Emergency read failed.'),
  });

  const rows = (grants.data ?? []) as any[];
  const orgOptions = (orgs.data ?? []) as any[];
  const emergencyData = emergency.data as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Break-glass access</h1>
        <p className="text-sm text-slate-500">
          Emergency clinical access for platform admins. Requests need a reason, a second admin&apos;s
          approval, a bounded duration, and are fully audited.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request access</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => request.mutate(v))} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="organizationId">Organisation</Label>
              <select
                id="organizationId"
                {...form.register('organizationId')}
                defaultValue=""
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="" disabled>
                  Select a clinic
                </option>
                {orgOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.organizationId?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="durationMinutes">Duration (minutes)</Label>
              <Input id="durationMinutes" type="number" {...form.register('durationMinutes')} />
              <FieldError message={form.formState.errors.durationMinutes?.message} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" rows={3} placeholder="Describe the emergency and what you need to access." {...form.register('reason')} />
              <FieldError message={form.formState.errors.reason?.message} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={request.isPending}>
                Request break-glass access
              </Button>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access requests</CardTitle>
        </CardHeader>
        <CardContent>
          {grants.isLoading ? (
            <Spinner />
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">No break-glass requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <Badge tone={tone[g.status] ?? 'neutral'}>{g.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-slate-600" title={g.reason}>
                      {g.reason}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{new Date(g.expiresAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {g.status === 'PENDING' && (
                          <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate(g.id)}>
                            Approve
                          </Button>
                        )}
                        {(g.status === 'PENDING' || g.status === 'ACTIVE') && (
                          <Button size="sm" variant="danger" loading={revoke.isPending} onClick={() => revoke.mutate(g.id)}>
                            Revoke
                          </Button>
                        )}
                        {g.status === 'ACTIVE' && (
                          <Button size="sm" variant="outline" onClick={() => setEmergencyOrg(g.organizationId)}>
                            Read summary
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {emergencyOrg || (emergency.isSuccess && emergency.data) ? (
        <Card>
          <CardHeader>
            <CardTitle>Emergency summary — {emergencyOrg}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Button
                size="sm"
                variant="outline"
                loading={emergency.isPending}
                onClick={() => emergency.mutate(emergencyOrg)}
              >
                Refresh summary
              </Button>
            </div>
            {emergency.isPending ? (
              <Spinner />
            ) : emergencyData ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase text-slate-500">Patients</p>
                  <p className="mt-1 text-2xl font-semibold">{emergencyData.summary?.patientCount ?? 0}</p>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-600">
                    {(emergencyData.patients ?? []).map((p: any) => (
                      <li key={p.id}>
                        {p.familyName} {p.givenName} — {p.medicalRecordNumber}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-md border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase text-slate-500">Recent results</p>
                  <p className="mt-1 text-2xl font-semibold">{emergencyData.summary?.resultCount ?? 0}</p>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-600">
                    {(emergencyData.recentResults ?? []).map((r: any) => (
                      <li key={r.id}>
                        {r.testName}: {r.value} {r.unit}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-md border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase text-slate-500">Active prescriptions</p>
                  <p className="mt-1 text-2xl font-semibold">{emergencyData.summary?.prescriptionCount ?? 0}</p>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-600">
                    {(emergencyData.activePrescriptions ?? []).length === 0 ? (
                      <li className="text-slate-400">None</li>
                    ) : (
                      (emergencyData.activePrescriptions ?? []).map((rx: any) => (
                        <li key={rx.id}>
                          {(rx.items ?? []).map((i: any) => i.medicationName).join(', ') || 'Rx'} — {rx.status}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select an active grant&apos;s &quot;Read summary&quot; to load data.</p>
            )}
            {emergency.isError && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
