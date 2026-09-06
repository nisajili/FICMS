import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  // Organization name is injected from branding settings at runtime; use placeholder.
  title: '{{CLINIC_NAME}} – Clinic Portal',
  description: 'Fertility & IVF Clinic Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
