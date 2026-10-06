'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Receipt,
  FileCheck,
  Wallet,
  Calculator,
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  Scale,
  Settings,
  Package,
  Building,
  CreditCard,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'ผังบัญชี', href: '/accounts', icon: BookOpen },
  { name: 'สมุดรายวัน', href: '/journals', icon: FileText },
  { name: 'ผู้ติดต่อ', href: '/contacts', icon: Users },
  { section: 'รายรับ & สต็อก' },
  { name: 'ใบแจ้งหนี้', href: '/income/invoices', icon: Receipt },
  { name: 'ใบเสร็จรับเงิน', href: '/income/receipts', icon: FileCheck },
  { name: 'สินค้าคงคลัง', href: '/products', icon: Package },
  { section: 'รายจ่าย & สินทรัพย์' },
  { name: 'ค่าใช้จ่าย', href: '/expenses', icon: Wallet },
  { name: 'สินทรัพย์ถาวร', href: '/assets', icon: Building },
  { section: 'ภาษี & การเงิน' },
  { name: 'ภาษีซื้อ-ขาย (VAT)', href: '/tax/vat', icon: Calculator },
  { name: 'หัก ณ ที่จ่าย (WHT)', href: '/tax/wht', icon: FileSpreadsheet },
  { name: 'กระทบยอดธนาคาร', href: '/bank-reconcile', icon: CreditCard },
  { section: 'รายงาน' },
  { name: 'งบทดลอง', href: '/reports/trial-balance', icon: BarChart3 },
  { name: 'งบกำไรขาดทุน', href: '/reports/income-statement', icon: TrendingUp },
  { name: 'งบแสดงฐานะการเงิน', href: '/reports/balance-sheet', icon: Scale },
  { section: 'ตั้งค่า' },
  { name: 'ตั้งค่าบริษัท', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop Overlay with Blur */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-[100dvh] w-[280px] max-w-[85vw] lg:w-[260px] bg-white border-r border-gray-200 flex flex-col no-print transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">ระบบบัญชี</h1>
              <p className="text-xs text-gray-400">Accounting System</p>
            </div>
          </div>
          {/* Close button for iPhone / Smartphone / Tablet */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items (Touch Optimized) */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 touch-pan-y overscroll-contain">
          {navigation.map((item, index) => {
            if ('section' in item) {
              return (
                <div key={index} className="px-3 pt-3.5 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {item.section}
                </div>
              );
            }

            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href!);

            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all active:scale-[0.98] select-none ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold shadow-xs border-l-4 border-primary-600 pl-2.5'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
          <p className="text-xs text-gray-400 font-medium">v1.2.0 • Full Pro Suite</p>
        </div>
      </aside>
    </>
  );
}


