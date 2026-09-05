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
} from '@ficms/ui';
import { admin } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const schema = z.object({
  name: z.string().min(2, 'Clinic name is required'),
  slug: z.string().min(2, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  domain: z.string().optional().or(z.literal('')),
  adminEmail: z.string().email('Valid admin email required'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  adminName: z.string().optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

const statusTone: Record<string, 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  PENDING: 'warning',
};

export default function AdminOrganizationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'organizations', page],
    queryFn: () => admin.organizations({ page: 1, pageSize: 100 }),
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      admin.createOrg({
        name: values.name,
        slug: values.slug,
        domain: values.domain || undefined,
        adminEmail: values.adminEmail,
        adminPassword: values.adminPassword,
        adminName: values.adminName || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      form.reset();
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to onboard organisation.'),
  });

  const setStatus = useMutation({
    mutationFn: (args: { id: string; status: string }) => admin.setOrgStatus(args.id, args.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'organizations'] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to update status.'),
  });

  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Organisations</h1>
        <p className="text-sm text-slate-500">Onboard, activate and suspend clinic tenants (platform admin).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onboard a new clinic</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name">Clinic name</Label>
              <Input id="name" placeholder="Golden Care Fertility Center" {...form.register('name')} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="golden-care" {...form.register('slug')} />
              <FieldError message={form.formState.errors.slug?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="domain">Domain (optional)</Label>
              <Input id="domain" placeholder="care.example.com" {...form.register('domain')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adminName">Admin name</Label>
              <Input id="adminName" placeholder="Dr. Jane" {...form.register('adminName')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adminEmail">Admin email</Label>
              <Input id="adminEmail" type="email" placeholder="admin@care.example.com" {...form.register('adminEmail')} />
              <FieldError message={form.formState.errors.adminEmail?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adminPassword">Admin password</Label>
              <Input id="adminPassword" type="password" {...form.register('adminPassword')} />
              <FieldError message={form.formState.errors.adminPassword?.message} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={create.isPending}>
                Onboard organisation
              </Button>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All clinics</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner />
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">No organisations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium text-slate-900">{org.name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{org.slug}</TableCell>
                    <TableCell>
                      <Badge tone={statusTone[org.status] ?? 'neutral'}>{org.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {org.status !== 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={setStatus.isPending}
                            onClick={() => setStatus.mutate({ id: org.id, status: 'ACTIVE' })}
                          >
                            Activate
                          </Button>
                        )}
                        {org.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="danger"
                            loading={setStatus.isPending}
                            onClick={() => setStatus.mutate({ id: org.id, status: 'SUSPENDED' })}
                          >
                            Suspend
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
    </div>
  );
}
