'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, ShieldCheck, UserCheck, Lock, ArrowRight, Sparkles, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    {
      role: 'ADMIN',
      title: 'ผู้ดูแลระบบ (Admin)',
      user: 'admin',
      pass: 'admin123',
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      badge: '👑 สิทธิ์สูงสุด',
      desc: 'เข้าถึงได้ทุกเมนู ตั้งค่าระบบ อนุมัติ ลบ แก้ไข เพิ่มผู้ใช้งาน',
    },
    {
      role: 'MANAGER',
      title: 'ผู้จัดการ (Manager)',
      user: 'manager',
      pass: 'manager123',
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      badge: '💼 อนุมัติ & รายงาน',
      desc: 'ดูรายงานการเงิน งบกำไรขาดทุน อนุมัติใบแจ้งหนี้/ค่าใช้จ่าย',
    },
    {
      role: 'ACCOUNTANT',
      title: 'นักบัญชี (Accountant)',
      user: 'accountant',
      pass: 'accountant123',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      badge: '📊 บันทึกบัญชี',
      desc: 'ออกใบแจ้งหนี้/ใบเสร็จ บันทึกรายจ่าย ลงสมุดรายวัน ยื่น VAT',
    },
    {
      role: 'VIEWER',
      title: 'ผู้เข้าชม (Viewer)',
      user: 'viewer',
      pass: 'viewer123',
      color: 'bg-slate-100 text-slate-700 border-slate-300',
      badge: '👁️ อ่านอย่างเดียว',
      desc: 'เรียกดูรายงานและเอกสารได้ทุกหน้า ห้ามลบหรือแก้ไขข้อมูล',
    },
  ];

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');

      toast.success(`ยินดีต้อนรับ ${data.user.name} (${data.user.role})`);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl z-10">
        
        {/* Left Section: Demo Accounts & Quick Selection */}
        <div className="md:col-span-6 space-y-4 pr-0 md:pr-4 border-b md:border-b-0 md:border-r border-slate-700/60 pb-6 md:pb-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">ทดลองเข้าสู่ระบบตามสิทธิ์ (Demo Roles)</h2>
          </div>
          <p className="text-xs text-slate-400">
            เลือกบัญชีเพื่อทดสอบสิทธิ์การใช้งานแต่ละระดับ ระบบจะเติมรหัสให้อัตโนมัติ:
          </p>

          <div className="space-y-2.5 pt-1">
            {demoAccounts.map((acc) => (
              <div
                key={acc.user}
                onClick={() => handleQuickLogin(acc.user, acc.pass)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  username === acc.user
                    ? 'bg-slate-700/90 border-primary-500 shadow-md ring-2 ring-primary-500/30'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary-400" />
                    {acc.title}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${acc.color}`}>
                    {acc.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-snug">{acc.desc}</p>
                <div className="mt-2 pt-1.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <span>USER: <strong className="text-primary-300">{acc.user}</strong></span>
                  <span>PASS: <strong className="text-amber-300">{acc.pass}</strong></span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 p-3 rounded-xl mt-4">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>ข้อมูลงบการเงินและเอกสารทั้งหมดถูกรักษาความปลอดภัย 100% ไม่ถูกลบเมื่ออัปเดตระบบ</span>
          </div>
        </div>

        {/* Right Section: Login Form */}
        <div className="md:col-span-6 flex flex-col justify-center space-y-5 pl-0 md:pl-2">
          <div className="text-center md:text-left space-y-1">
            <div className="inline-flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center shadow-md">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">ระบบบัญชีไทย</h1>
                <p className="text-xs text-slate-400">Thai Accounting System</p>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-slate-200">เข้าสู่ระบบ (Sign In)</h2>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">ชื่อผู้ใช้งาน (Username)</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น admin, manager, accountant"
                  className="w-full bg-slate-900/80 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">รหัสผ่าน (Password)</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/80 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg hover:shadow-primary-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังตรวจสอบสิทธิ์...
                </>
              ) : (
                <>
                  เข้าสู่ระบบ
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500">
            ระบบบริหารจัดการสิทธิ์บัญชี • Safe Enterprise Sync v1.2.0
          </div>
        </div>

      </div>
    </div>
  );
}
