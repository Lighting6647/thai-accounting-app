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
      {/* Mobile Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-[260px] bg-white border-r border-gray-200 flex flex-col no-print transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">ระบบบัญชี</h1>
              <p className="text-xs text-gray-400">Accounting System</p>
            </div>
          </div>
          {/* Close button for mobile screens */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigation.map((item, index) => {
            if ('section' in item) {
              return (
                <div key={index} className="sidebar-section">
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
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">v1.2.0 • Full Pro Suite</p>
        </div>
      </aside>
    </>
  );
}

