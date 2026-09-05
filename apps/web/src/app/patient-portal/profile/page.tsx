'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Input, Label, FieldError, Spinner,
} from '@ficms/ui';
import { self } from '@/lib/queries';

interface ProfileForm {
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  preferredName: string;
  address: string;
  city: string;
}

export default function PatientProfile() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ['me'], queryFn: self.profile });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>();

  React.useEffect(() => {
    if (profile) {
      reset({
        givenName: profile.givenName ?? '',
        familyName: profile.familyName ?? '',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        preferredName: profile.preferredName ?? '',
        address: profile.address ?? '',
        city: profile.city ?? '',
      });
    }
  }, [profile, reset]);

  const update = useMutation({
    mutationFn: (v: Record<string, unknown>) => self.updateProfile(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">My Details</h1><p className="text-sm text-slate-500">Update permitted contact details. Identity fields are managed by your clinic.</p></div>

      <Card>
        <CardHeader><CardTitle>Personal information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => update.mutate({ ...v }))} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1"><Label>Given name</Label><Input value={profile?.givenName || ''} disabled /></div>
            <div className="space-y-1"><Label>Family name</Label><Input value={profile?.familyName || ''} disabled /></div>
            <div className="space-y-1"><Label>Preferred name</Label><Input {...register('preferredName')} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" {...register('email')} /><FieldError message={errors.email?.message} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input {...register('phone')} /></div>
            <div className="space-y-1"><Label>Address</Label><Input {...register('address')} /></div>
            <div className="space-y-1"><Label>City</Label><Input {...register('city')} /></div>
            <div className="self-end sm:col-span-2"><Button type="submit" loading={update.isPending}>Save changes</Button></div>
          </form>
          <p className="mt-3 text-xs text-slate-400">Medical record number (MRN), date of birth and sex are controlled by your clinic and cannot be edited here.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Partner</CardTitle></CardHeader>
        <CardContent>
          {profile?.partners && profile.partners.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {profile.partners.map((p: any) => (
                <li key={p.id} className="py-2 text-sm text-slate-700">
                  {p.givenName} {p.familyName} <span className="text-slate-400">· {p.medicalRecordNumber}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No partner linked. Contact your clinic to link a partner.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
