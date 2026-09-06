'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Spinner, Input, Label,
} from '@ficms/ui';
import { admin } from '@/lib/queries';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: facilities, isLoading: facLoading } = useQuery({ queryKey: ['facilities'], queryFn: admin.facilities });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => admin.users({ pageSize: 100 }) });
  const { data: permissions } = useQuery({ queryKey: ['permissions'], queryFn: admin.permissions });

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('receptionist');

  const createFacility = useMutation({
    mutationFn: () => admin.createFacility({ name, code: name.slice(0, 4).toUpperCase() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facilities'] }); setName(''); },
  });
  const invite = useMutation({
    mutationFn: () => admin.inviteUser({ email, name: email.split('@')[0], role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEmail(''); },
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Settings &amp; Administration</h1><p className="text-sm text-slate-500">Branches, staff, and role permissions.</p></div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Add Branch / Facility</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); createFacility.mutate(); }} className="space-y-3">
              <div className="space-y-1"><Label>Branch name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <Button type="submit" loading={createFacility.isPending}>Add branch</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Invite Staff</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); invite.mutate(); }} className="space-y-3">
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-1">
                <Label>Role</Label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                  <option value="receptionist">Receptionist</option>
                  <option value="fertility_specialist">Fertility Specialist</option>
                  <option value="embryologist">Embryologist</option>
                  <option value="lab_scientist">Lab Scientist</option>
                  <option value="nurse">Nurse</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
              <Button type="submit" loading={invite.isPending}>Invite</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Default Role Permissions</CardTitle></CardHeader>
        <CardContent>
          {!permissions ? <Spinner /> : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Permissions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {Object.entries(permissions).map(([r, perms]) => (
                    <TableRow key={r}>
                      <TableCell className="font-medium text-slate-900">{r}</TableCell>
                      <TableCell className="text-xs text-slate-600">{(perms as string[]).join(', ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Staff</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!users ? <Spinner /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell className="text-xs text-slate-600">{u.status}</TableCell>
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
