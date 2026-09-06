import { redirect } from 'next/navigation';

export default function PatientPortalRoot() {
  redirect('/patient-portal/dashboard');
}
