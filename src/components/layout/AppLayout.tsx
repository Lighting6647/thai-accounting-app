'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Menu, Calculator } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col lg:flex-row">
      {/* Top Mobile Bar (Visible on screens < lg - iPhone, Smartphone, iPad portrait) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm block leading-tight">ระบบบัญชี</span>
            <span className="text-[10px] text-gray-400 block font-medium">Thai Accounting System</span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2.5 rounded-xl text-gray-700 hover:bg-gray-100/80 active:bg-gray-200/80 active:scale-95 focus:outline-none transition-all cursor-pointer"
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
