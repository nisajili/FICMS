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
import { donors } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const schema = z.object({
  sex: z.enum(['FEMALE', 'MALE', 'OTHER', 'UNKNOWN']),
  age: z.coerce.number().int().min(18).max(60).optional(),
  screeningNotes: z.string().optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

const statusTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  SCREENING: 'warning',
  ELIGIBLE: 'success',
  INELIGIBLE: 'danger',
  ACTIVE: 'success',
  RETIRED: 'neutral',
};

export default function DonorsPage() {
  const qc = useQueryClient();
  const [error, setError] = React.useState('');

  const list = useQuery({ queryKey: ['donors'], queryFn: donors.list });
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { sex: 'FEMALE' } });

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      donors.create({
        sex: values.sex,
        age: values.age,
        screening: values.screeningNotes ? { notes: values.screeningNotes } : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donors'] });
      form.reset({ sex: 'FEMALE' });
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to register donor.'),
  });

  const setEligibility = useMutation({
    mutationFn: (args: { id: string; eligibility: boolean }) => donors.setEligibility(args.id, args.eligibility),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donors'] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Update failed.'),
  });

  const rows = (list.data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Donors</h1>
        <p className="text-sm text-slate-500">
          Anonymised donor profiles — no identity data is stored or shown.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Register donor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="sex">Sex</Label>
                <select id="sex" {...form.register('sex')} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" {...form.register('age')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Screening notes</Label>
                <Input id="notes" {...form.register('screeningNotes')} />
              </div>
              <Button type="submit" loading={create.isPending}>
                Register donor
              </Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registered donors</CardTitle>
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <Spinner />
            ) : rows.length === 0 ? (
              <EmptyState title="No donors" description="Register a donor above." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Sex</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-slate-900">{d.donorCode}</TableCell>
                      <TableCell className="text-sm text-slate-600">{d.sex}</TableCell>
                      <TableCell className="text-sm text-slate-600">{d.age ?? '—'}</TableCell>
                      <TableCell>
                        <Badge tone={statusTone[d.status] ?? 'neutral'}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {d.status !== 'ELIGIBLE' && (
                          <Button size="sm" variant="outline" loading={setEligibility.isPending} onClick={() => setEligibility.mutate({ id: d.id, eligibility: true })}>
                            Mark eligible
                          </Button>
                        )}
                        {d.status === 'ELIGIBLE' && (
                          <Button size="sm" variant="danger" loading={setEligibility.isPending} onClick={() => setEligibility.mutate({ id: d.id, eligibility: false })}>
                            Mark ineligible
                          </Button>
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
    </div>
  );
}
