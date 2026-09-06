import { AuthGuard } from '@/components/auth-guard';
import { PatientNav } from '@/components/patient-nav';

export default function PatientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PatientNav>{children}</PatientNav>
    </AuthGuard>
  );
}
