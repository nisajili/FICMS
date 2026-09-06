import { AuthGuard } from '@/components/auth-guard';
import { PortalNav } from '@/components/portal-nav';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PortalNav>{children}</PortalNav>
    </AuthGuard>
  );
}
