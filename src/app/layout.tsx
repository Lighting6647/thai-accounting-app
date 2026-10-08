import type { Metadata } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-thai',
});

export const metadata: Metadata = {
  title: 'ระบบบัญชี - Thai Accounting System',
  description: 'ระบบบัญชีครบวงจรสำหรับบริษัท รองรับ VAT, WHT, งบการเงิน',
};

import AppLayout from '@/components/layout/AppLayout';
import KeepAlive from '@/components/KeepAlive';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body className={notoSansThai.className}>
        <KeepAlive />
        <AppLayout>{children}</AppLayout>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            className: 'font-sans',
          }}
        />
      </body>
    </html>
  );
}
