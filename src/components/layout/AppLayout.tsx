'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Menu, Calculator } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col lg:flex-row">
      {/* Top Mobile Bar (Visible on screens < lg) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm block leading-tight">ระบบบัญชี</span>
            <span className="text-[10px] text-gray-400 block">Thai Accounting System</span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 focus:outline-none transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Sidebar Drawer */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-[260px] min-w-0 transition-all">
        <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
