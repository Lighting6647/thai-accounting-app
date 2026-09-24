import type { Metadata } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body className={notoSansThai.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-[260px]">
            <div className="p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
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
