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
  EmptyState,
} from '@ficms/ui';
import { patients } from '@/lib/queries';

const schema = z.object({
  givenName: z.string().min(1, 'Required'),
  familyName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  sex: z.enum(['FEMALE', 'MALE', 'OTHER', 'UNKNOWN']),
});
type FormValues = z.infer<typeof schema>;

export default function PatientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['patients', page, search],
    queryFn: () => patients.list({ page, pageSize: 25, search }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sex: 'FEMALE' },
  });

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      patients.create({ ...values, dateOfBirth: values.dateOfBirth || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      form.reset({ sex: 'FEMALE' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500">Register and manage patient records.</p>
        </div>
        <Input
          placeholder="Search name, MRN, phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register New Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label>Given name</Label>
              <Input {...form.register('givenName')} />
              <FieldError message={form.formState.errors.givenName?.message} />
            </div>
            <div className="space-y-1">
              <Label>Family name</Label>
              <Input {...form.register('familyName')} />
              <FieldError message={form.formState.errors.familyName?.message} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...form.register('email')} />
              <FieldError message={form.formState.errors.email?.message} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input {...form.register('phone')} />
            </div>
            <div className="space-y-1">
              <Label>Date of birth</Label>
              <Input type="date" {...form.register('dateOfBirth')} />
            </div>
            <div className="space-y-1">
              <Label>Sex</Label>
              <select {...form.register('sex')} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>
            <div className="self-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" loading={create.isPending}>Register patient</Button>
              {create.isSuccess ? <span className="ml-3 text-sm text-emerald-600">Patient registered.</span> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : !data || data.length === 0 ? (
            <EmptyState title="No patients found" description="Try a different search or register a new patient." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MRN</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.medicalRecordNumber}</TableCell>
                    <TableCell className="font-medium text-slate-900">{p.givenName} {p.familyName}</TableCell>
                    <TableCell>{p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>{p.sex}</TableCell>
                    <TableCell>{p.phone || p.email || '—'}</TableCell>
                    <TableCell><Badge tone={p.status === 'ACTIVE' ? 'success' : 'neutral'}>{p.status}</Badge></TableCell>
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
