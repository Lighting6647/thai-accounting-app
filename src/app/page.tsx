'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Banknote, Calculator, AlertCircle, Loader2 } from 'lucide-react';
import { formatMoney, formatDateShort, getStatusLabel } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardData } from '@/types';
import { useGsapStagger } from '@/lib/gsap-animations';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useGsapStagger<HTMLDivElement>('.gsap-card', [loading]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500 mr-2" />
        <span className="text-gray-500">กำลังโหลดข้อมูลและแอนิเมชัน...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        เกิดข้อผิดพลาด: {error}
      </div>
    );
  }

  const {
    revenue = 0,
    expenses = 0,
    profit = 0,
    vatPayable = 0,
    overdueCount = 0,
    monthlyChart = [],
    recentInvoices = [],
    recentExpenses = [],
  } = data || {};

  return (
    <div ref={containerRef} className="space-y-6">
      <h1 className="text-2xl font-bold">ภาพรวม (Dashboard)</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="metric-card gsap-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">รายได้เดือนนี้</p>
              <h3 className="text-xl font-bold mt-1 text-primary-700">{formatMoney(revenue)}</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-full text-blue-600 gsap-pulse-icon">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="metric-card gsap-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">ค่าใช้จ่ายเดือนนี้</p>
              <h3 className="text-xl font-bold mt-1 text-red-600">{formatMoney(expenses)}</h3>
            </div>
            <div className="p-2 bg-red-100 rounded-full text-red-600 gsap-pulse-icon">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="metric-card gsap-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">กำไรสุทธิ</p>
              <h3 className="text-xl font-bold mt-1 text-green-700">{formatMoney(profit)}</h3>
            </div>
            <div className="p-2 bg-green-100 rounded-full text-green-600 gsap-pulse-icon">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="metric-card gsap-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">VAT ต้องนำส่ง</p>
              <h3 className="text-xl font-bold mt-1 text-purple-700">{formatMoney(vatPayable)}</h3>
            </div>
            <div className="p-2 bg-purple-100 rounded-full text-purple-600 gsap-pulse-icon">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="metric-card gsap-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">บิลค้างชำระ</p>
              <h3 className="text-xl font-bold mt-1 text-amber-700">{overdueCount} รายการ</h3>
            </div>
            <div className="p-2 bg-orange-100 rounded-full text-orange-600 gsap-pulse-icon">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="card gsap-card">
        <div className="card-header border-b px-6 py-4">
          <h2 className="text-lg font-medium">รายได้และค่าใช้จ่าย 6 เดือนล่าสุด</h2>
        </div>
        <div className="card-body p-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChart}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Legend />
              <Bar dataKey="revenue" name="รายได้" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="ค่าใช้จ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card gsap-card">
          <div className="card-header border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-medium">ใบแจ้งหนี้ล่าสุด</h2>
            <Link href="/income/invoices" className="text-sm text-blue-600 hover:underline">
              ดูทั้งหมด
            </Link>
          </div>
          <div className="card-body p-0">
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-4 py-3">เลขที่</th>
                  <th className="px-4 py-3">ลูกค้า</th>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3 text-right">ยอดสุทธิ</th>
                  <th className="px-4 py-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {recentInvoices.length > 0 ? (
                  recentInvoices.map((inv) => {
                    const statusInfo = getStatusLabel(inv.status);
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3">{inv.contactName}</td>
                        <td className="px-4 py-3">{formatDateShort(inv.invoiceDate)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(inv.netAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={statusInfo.className}>
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">ไม่มีข้อมูลใบแจ้งหนี้</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card gsap-card">
          <div className="card-header border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-medium">ค่าใช้จ่ายล่าสุด</h2>
            <Link href="/expenses" className="text-sm text-blue-600 hover:underline">
              ดูทั้งหมด
            </Link>
          </div>
          <div className="card-body p-0">
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-4 py-3">เลขที่</th>
                  <th className="px-4 py-3">ผู้รับเงิน</th>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3 text-right">ยอดสุทธิ</th>
                  <th className="px-4 py-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {recentExpenses.length > 0 ? (
                  recentExpenses.map((exp) => {
                    const statusInfo = getStatusLabel(exp.status);
                    return (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{exp.expenseNumber}</td>
                        <td className="px-4 py-3">{exp.contactName || '-'}</td>
                        <td className="px-4 py-3">{formatDateShort(exp.expenseDate)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(exp.netPayment)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={statusInfo.className}>
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">ไม่มีข้อมูลค่าใช้จ่าย</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
