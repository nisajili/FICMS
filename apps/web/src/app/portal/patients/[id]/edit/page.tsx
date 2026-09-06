'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  FieldError,
  Spinner,
  EmptyState,
} from '@ficms/ui';
import { patients } from '@/lib/queries';
import { ApiClientError } from '@/lib/api';

interface PatientForm {
  givenName: string;
  familyName: string;
  preferredName: string;
  dateOfBirth: string;
  sex: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  emergencyName: string;
  emergencyPhone: string;
}

export default function EditPatientPage() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = React.useState('');

  const patient = useQuery({ queryKey: ['patient', id], queryFn: () => patients.get(id) });

  const form = useForm<PatientForm>({
    defaultValues: {
      givenName: '',
      familyName: '',
      preferredName: '',
      dateOfBirth: '',
      sex: 'UNKNOWN',
      email: '',
      phone: '',
      address: '',
      city: '',
      emergencyName: '',
      emergencyPhone: '',
    },
  });

  // Populate the form once data loads.
  const p = patient.data as any;
  React.useEffect(() => {
    if (p) {
      form.reset({
        givenName: p.givenName || '',
        familyName: p.familyName || '',
        preferredName: p.preferredName || '',
        dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : '',
        sex: p.sex || 'UNKNOWN',
        email: p.email || '',
        phone: p.phone || '',
        address: p.address || '',
        city: p.city || '',
        emergencyName: p.emergencyName || '',
        emergencyPhone: p.emergencyPhone || '',
      });
    }
  }, [p, form]);

  const update = useMutation({
    mutationFn: (values: PatientForm) =>
      patients.update(id, {
        ...values,
        dateOfBirth: values.dateOfBirth || undefined,
        email: values.email || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', id] });
      router.push(`/portal/patients/${id}`);
    },
    onError: (e: unknown) => setError(e instanceof ApiClientError ? e.message : 'Update failed.'),
  });

  if (patient.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (patient.isError || !p) {
    return (
      <div className="p-8">
        <EmptyState title="Patient not found" description="The patient does not exist in this organisation." />
        <div className="mt-4">
          <Link href="/portal/patients">
            <Button variant="outline">Back to patients</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Edit {p.givenName} {p.familyName}</h1>
        <Link href={`/portal/patients/${id}`}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => update.mutate(v))} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="givenName">Given name</Label>
              <Input id="givenName" {...form.register('givenName')} />
              <FieldError message={form.formState.errors.givenName?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="familyName">Family name</Label>
              <Input id="familyName" {...form.register('familyName')} />
              <FieldError message={form.formState.errors.familyName?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="preferredName">Preferred name</Label>
              <Input id="preferredName" {...form.register('preferredName')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" type="date" {...form.register('dateOfBirth')} />
            </div>
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register('city')} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...form.register('address')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="emergencyName">Emergency contact</Label>
              <Input id="emergencyName" {...form.register('emergencyName')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="emergencyPhone">Emergency phone</Label>
              <Input id="emergencyPhone" {...form.register('emergencyPhone')} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={update.isPending}>
                Save changes
              </Button>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
