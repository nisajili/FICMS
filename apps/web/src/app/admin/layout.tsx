import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminNav } from '@/components/admin-nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AdminNav>{children}</AdminNav>
    </AdminAuthGuard>
  );
}
