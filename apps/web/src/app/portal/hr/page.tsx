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
import { hr, admin } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

const staffSchema = z.object({
  userId: z.string().min(1, 'Select a staff user'),
  employeeNumber: z.string().optional().or(z.literal('')),
  jobTitle: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  qualification: z.string().optional().or(z.literal('')),
  licenseNumber: z.string().optional().or(z.literal('')),
  licenseExpiry: z.string().optional().or(z.literal('')),
  joinedAt: z.string().optional().or(z.literal('')),
});
type StaffValues = z.infer<typeof staffSchema>;

const leaveSchema = z.object({
  userId: z.string().min(1, 'Select a staff user'),
  type: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  reason: z.string().optional().or(z.literal('')),
});
type LeaveValues = z.infer<typeof leaveSchema>;

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export default function HrPage() {
  const qc = useQueryClient();
  const [error, setError] = React.useState('');
  const [viewUserId, setViewUserId] = React.useState('');

  const staff = useQuery({ queryKey: ['hr', 'staff'], queryFn: hr.staff });
  const leave = useQuery({ queryKey: ['hr', 'leave'], queryFn: () => hr.leave() });
  const users = useQuery({ queryKey: ['users', 'staff'], queryFn: () => admin.users({ pageSize: 100 }) });

  const staffForm = useForm<StaffValues>({ resolver: zodResolver(staffSchema) });
  const leaveForm = useForm<LeaveValues>({ resolver: zodResolver(leaveSchema) });

  const upsertStaff = useMutation({
    mutationFn: (values: StaffValues) =>
      hr.upsertStaff({
        userId: values.userId,
        employeeNumber: values.employeeNumber || undefined,
        jobTitle: values.jobTitle || undefined,
        department: values.department || undefined,
        qualification: values.qualification || undefined,
        licenseNumber: values.licenseNumber || undefined,
        licenseExpiry: values.licenseExpiry || undefined,
        joinedAt: values.joinedAt || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr'] });
      staffForm.reset();
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to save staff profile.'),
  });

  const submitLeave = useMutation({
    mutationFn: (values: LeaveValues) => hr.submitLeave(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr'] });
      leaveForm.reset();
      setError('');
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Failed to submit leave.'),
  });

  const decision = useMutation({
    mutationFn: (args: { id: string; approved: boolean }) => hr.approveLeave(args.id, args.approved),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr'] }),
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Decision failed.'),
  });

  const staffRows = (staff.data ?? []) as any[];
  const userOptions = (users.data ?? []) as any[];
  const leaveRows = (leave.data ?? []) as any[];

  const nameFor = (uid: string) => {
    const u = userOptions.find((x) => x.id === uid);
    return u ? u.name : uid.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Human resources</h1>
        <p className="text-sm text-slate-500">Staff profiles, credentials and leave management.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Staff profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={staffForm.handleSubmit((v) => upsertStaff.mutate(v))} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="userId">Staff user</Label>
                <select
                  id="userId"
                  {...staffForm.register('userId')}
                  defaultValue=""
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="" disabled>
                    Select a staff user
                  </option>
                  {userOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <FieldError message={staffForm.formState.errors.userId?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emp">Employee number</Label>
                <Input id="emp" {...staffForm.register('employeeNumber')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="job">Job title</Label>
                <Input id="job" {...staffForm.register('jobTitle')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dept">Department</Label>
                <Input id="dept" {...staffForm.register('department')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qual">Qualification</Label>
                <Input id="qual" {...staffForm.register('qualification')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lic">License number</Label>
                <Input id="lic" {...staffForm.register('licenseNumber')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="licExp">License expiry</Label>
                <Input id="licExp" type="date" {...staffForm.register('licenseExpiry')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="joined">Joined</Label>
                <Input id="joined" type="date" {...staffForm.register('joinedAt')} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" loading={upsertStaff.isPending}>
                  Save profile
                </Button>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit leave</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={leaveForm.handleSubmit((v) => submitLeave.mutate(v))} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="l-user">Staff user</Label>
                <select
                  id="l-user"
                  {...leaveForm.register('userId')}
                  defaultValue=""
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="" disabled>
                    Select a staff user
                  </option>
                  {userOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <FieldError message={leaveForm.formState.errors.userId?.message} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="l-type">Leave type</Label>
                <Input id="l-type" placeholder="annual / sick / maternity" {...leaveForm.register('type')} />
                <FieldError message={leaveForm.formState.errors.type?.message} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="start">Start date</Label>
                  <Input id="start" type="date" {...leaveForm.register('startDate')} />
                  <FieldError message={leaveForm.formState.errors.startDate?.message} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end">End date</Label>
                  <Input id="end" type="date" {...leaveForm.register('endDate')} />
                  <FieldError message={leaveForm.formState.errors.endDate?.message} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="l-reason">Reason</Label>
                <Input id="l-reason" {...leaveForm.register('reason')} />
              </div>
              <Button type="submit" loading={submitLeave.isPending}>
                Submit leave
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff directory</CardTitle>
        </CardHeader>
        <CardContent>
          {staff.isLoading ? (
            <Spinner />
          ) : staffRows.length === 0 ? (
            <EmptyState title="No staff profiles" description="Create a staff profile above." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Job title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>License</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffRows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-slate-900">{nameFor(s.userId)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{s.jobTitle ?? '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{s.department ?? '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {s.licenseNumber ?? '—'}
                      {s.licenseExpiry ? ` (expires ${new Date(s.licenseExpiry).toLocaleDateString()})` : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave requests</CardTitle>
        </CardHeader>
        <CardContent>
          {leaveRows.length === 0 ? (
            <EmptyState title="No leave requests" description="Submit a leave request above." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRows.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm text-slate-700">{nameFor(l.userId)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{l.type}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[l.status] ?? 'neutral'}>{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" loading={decision.isPending} onClick={() => decision.mutate({ id: l.id, approved: true })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" loading={decision.isPending} onClick={() => decision.mutate({ id: l.id, approved: false })}>
                            Reject
                          </Button>
                        </div>
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
