'use client';

import { useState, useEffect } from 'react';
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
  LogOut,
  ShoppingCart,
  PackageCheck,
  Banknote,
  FileSignature,
  ClipboardCheck,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { section: '1. ซื้อ และเจ้าหนี้ (AP)' },
  { name: 'ใบสั่งซื้อ (PO)', href: '/ap/purchase-orders', icon: ShoppingCart },
  { name: 'รับสินค้า/ซื้อเชื่อ (RR)', href: '/ap/goods-receipts', icon: PackageCheck },
  { name: 'ใบสำคัญจ่ายหนี้ (PV)', href: '/ap/payment-vouchers', icon: Banknote },
  { name: 'บันทึกค่าใช้จ่าย', href: '/expenses', icon: Wallet },
  { section: '2. ขาย และลูกหนี้ (AR)' },
  { name: 'ใบเสนอราคา (QT)', href: '/ar/quotations', icon: FileSignature },
  { name: 'ใบสั่งขาย (SO)', href: '/ar/sales-orders', icon: ClipboardCheck },
  { name: 'ใบแจ้งหนี้ / ขายเชื่อ (IV)', href: '/income/invoices', icon: Receipt },
  { name: 'ใบเสร็จรับเงิน (RE)', href: '/income/receipts', icon: FileCheck },
  { section: '3. สินค้าคงคลัง & ทะเบียน' },
  { name: 'คลังสินค้า & Stock Card', href: '/products', icon: Package },
  { name: 'ผู้ติดต่อ (ลูกค้า/คู่ค้า)', href: '/contacts', icon: Users },
  { name: 'สินทรัพย์ถาวร', href: '/assets', icon: Building },
  { section: '4. บัญชี (GL) & ภาษี' },
  { name: 'ผังบัญชี 5 หมวด', href: '/accounts', icon: BookOpen },
  { name: 'สมุดรายวัน (Auto-GL)', href: '/journals', icon: FileText },
  { name: 'ภาษีซื้อ-ขาย (ภ.พ.30)', href: '/tax/vat', icon: Calculator },
  { name: 'หัก ณ ที่จ่าย (WHT)', href: '/tax/wht', icon: FileSpreadsheet },
  { name: 'กระทบยอดธนาคาร', href: '/bank-reconcile', icon: CreditCard },
  { section: '5. รายงาน & ตั้งค่า' },
  { name: 'งบทดลอง', href: '/reports/trial-balance', icon: BarChart3 },
  { name: 'งบกำไรขาดทุน', href: '/reports/income-statement', icon: TrendingUp },
  { name: 'งบแสดงฐานะการเงิน', href: '/reports/balance-sheet', icon: Scale },
  { name: 'ตั้งค่าบริษัท', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string; username: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => {});
  }, []);

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
              <h1 className="text-base font-bold text-gray-900 leading-tight">ระบบบัญชี ERP</h1>
              <p className="text-xs text-gray-400">Express Web Standard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
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
                className={`flex items-center gap-3 px-3.5 py-2 min-h-[40px] rounded-xl text-sm font-medium transition-all active:scale-[0.98] select-none ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold shadow-xs border-l-4 border-primary-600 pl-2.5'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Active Role & User Footer */}
        <div className="px-3.5 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary-200">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate leading-snug">{user?.name || 'ผู้ดูแลระบบ'}</p>
              <span className="inline-block text-[10px] font-bold text-primary-700 bg-primary-100/80 px-1.5 py-0.2 rounded border border-primary-200">
                {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>

          <Link
            href="/login"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-white border border-gray-200 shadow-2xs transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
            title="สลับสิทธิ์ผู้ใช้งาน / เข้าสู่ระบบ"
          >
            <LogOut className="w-4 h-4 text-gray-600" />
          </Link>
        </div>
      </aside>
    </>
  );
}
