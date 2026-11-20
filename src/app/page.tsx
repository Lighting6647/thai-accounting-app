'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Banknote,
  Calculator,
  AlertCircle,
  Loader2,
  Package,
  ArrowRight,
  Download,
  AlertTriangle,
  Warehouse,
} from 'lucide-react';
import { formatMoney, formatDateShort, formatDateThai, getStatusLabel } from '@/lib/format';
import { exportToCsv } from '@/lib/csv-export';
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
    inventoryValuation = 0,
    arAging,
    apAging,
    arAgingDocs = [],
    apAgingDocs = [],
    lowStockProducts = [],
    expressWorkflow,
    monthlyChart = [],
    recentInvoices = [],
    recentExpenses = [],
  } = data || {};

  const handleExportAgingCsv = (kind: 'AR' | 'AP') => {
    const docs = kind === 'AR' ? arAgingDocs : apAgingDocs;
    exportToCsv(
      `${kind.toLowerCase()}-aging-${new Date().toISOString().split('T')[0]}`,
      ['เลขที่เอกสาร', 'วันที่', 'วันครบกำหนด', kind === 'AR' ? 'ลูกค้า' : 'เจ้าหนี้', 'ยอดค้างชำระ', 'เกินกำหนด (วัน)', 'ช่วงอายุหนี้'],
      docs.map((d) => [
        d.docNumber,
        formatDateThai(d.docDate),
        formatDateThai(d.dueDate),
        d.contactName,
        d.netAmount,
        d.daysOverdue,
        d.bucket,
      ])
    );
  };

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executive Dashboard (ERP & Express Accounting)</h1>
          <p className="text-sm text-slate-500">ภาพรวมยอดขาย, ลูกหนี้-เจ้าหนี้ค้างชำระ (Aging), มูลค่าสต็อก และวงจรเอกสารอัตโนมัติ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/ar/quotations/new" className="btn-secondary text-xs py-2 px-3">
            + ใบเสนอราคา (QT)
          </Link>
          <Link href="/ap/purchase-orders/new" className="btn-secondary text-xs py-2 px-3">
            + ใบสั่งซื้อ (PO)
          </Link>
          <Link href="/income/invoices/new" className="btn-primary text-xs py-2 px-3">
            + ขายเชื่อ/ออกบิล (IV)
          </Link>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="metric-card gsap-card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500">ยอดขายเดือนนี้</p>
              <h3 className="text-lg font-bold mt-1 text-primary-700">{formatMoney(revenue)}</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-full text-blue-600 gsap-pulse-icon">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="metric-card gsap-card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500">ซื้อ/ค่าใช้จ่ายเดือนนี้</p>
              <h3 className="text-lg font-bold mt-1 text-red-600">{formatMoney(expenses)}</h3>
            </div>
            <div className="p-2 bg-red-100 rounded-full text-red-600 gsap-pulse-icon">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="metric-card gsap-card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500">กำไรสุทธิ</p>
              <h3 className="text-lg font-bold mt-1 text-green-700">{formatMoney(profit)}</h3>
            </div>
            <div className="p-2 bg-green-100 rounded-full text-green-600 gsap-pulse-icon">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="metric-card gsap-card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500">VAT สุทธิ (ภ.พ.30)</p>
              <h3 className="text-lg font-bold mt-1 text-purple-700">{formatMoney(vatPayable)}</h3>
            </div>
            <div className="p-2 bg-purple-100 rounded-full text-purple-600 gsap-pulse-icon">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="metric-card gsap-card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500">มูลค่าคลังสินค้า (Avg)</p>
              <h3 className="text-lg font-bold mt-1 text-indigo-700">{formatMoney(inventoryValuation)}</h3>
            </div>
            <div className="p-2 bg-indigo-100 rounded-full text-indigo-600 gsap-pulse-icon">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="metric-card gsap-card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500">ลูกหนี้เกินกำหนด</p>
              <h3 className="text-lg font-bold mt-1 text-amber-700">{overdueCount} รายการ</h3>
            </div>
            <div className="p-2 bg-orange-100 rounded-full text-orange-600 gsap-pulse-icon">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Express Document Workflow Strip */}
      {expressWorkflow && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card gsap-card p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">
              วงจรซื้อและเจ้าหนี้ (AP Express Flow)
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/ap/purchase-orders"
                className="flex-1 min-w-[110px] p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 transition-colors"
              >
                <div className="text-slate-500">1. ใบสั่งซื้อ (PO)</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {expressWorkflow.poPendingCount} รอรับของ
                </div>
              </Link>
              <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
              <Link
                href="/ap/goods-receipts"
                className="flex-1 min-w-[110px] p-3 rounded-xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 transition-colors"
              >
                <div className="text-amber-700">2. รับสินค้า (RR)</div>
                <div className="text-base font-bold text-amber-900 mt-0.5">
                  {expressWorkflow.rrUnpaidCount} ค้างจ่าย
                </div>
              </Link>
              <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
              <Link
                href="/ap/payment-vouchers"
                className="flex-1 min-w-[110px] p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 hover:border-emerald-400 transition-colors"
              >
                <div className="text-emerald-700">3. จ่ายหนี้ (PV)</div>
                <div className="text-base font-bold text-emerald-900 mt-0.5">
                  {expressWorkflow.pvPaidCount} จ่ายแล้ว
                </div>
              </Link>
            </div>
          </div>

          <div className="card gsap-card p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">
              วงจรขายและลูกหนี้ (AR Express Flow)
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/ar/quotations"
                className="flex-1 min-w-[90px] p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 transition-colors"
              >
                <div className="text-slate-500">1. เสนอราคา (QT)</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {expressWorkflow.qtPendingCount} รายการ
                </div>
              </Link>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              <Link
                href="/ar/sales-orders"
                className="flex-1 min-w-[90px] p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 transition-colors"
              >
                <div className="text-slate-500">2. สั่งขาย (SO)</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {expressWorkflow.soPendingCount} รอส่งบิล
                </div>
              </Link>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              <Link
                href="/income/invoices"
                className="flex-1 min-w-[90px] p-3 rounded-xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 transition-colors"
              >
                <div className="text-amber-700">3. บิลขาย (IV)</div>
                <div className="text-base font-bold text-amber-900 mt-0.5">
                  {expressWorkflow.ivUnpaidCount} ค้างรับ
                </div>
              </Link>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              <Link
                href="/income/receipts"
                className="flex-1 min-w-[90px] p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 hover:border-emerald-400 transition-colors"
              >
                <div className="text-emerald-700">4. ใบเสร็จ (RE)</div>
                <div className="text-base font-bold text-emerald-900 mt-0.5">
                  {expressWorkflow.rePaidCount} รับเงินแล้ว
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* AR Aging & AP Aging Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AR Aging */}
        <div className="card gsap-card">
          <div className="card-header flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">ลูกหนี้ค้างชำระ (AR Aging)</h2>
              <p className="text-xs text-slate-500">ยอดค้างรับรวม: {formatMoney(arAging?.total || 0, true)}</p>
            </div>
            <button onClick={() => handleExportAgingCsv('AR')} className="btn-secondary text-xs py-1.5 px-2.5">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-b grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 bg-white rounded-lg border">
              <div className="text-slate-500">ยังไม่ถึงกำหนด</div>
              <div className="font-bold text-slate-800 mt-0.5">{formatMoney(arAging?.current || 0)}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border">
              <div className="text-amber-600">เกิน 1-30 วัน</div>
              <div className="font-bold text-amber-700 mt-0.5">{formatMoney(arAging?.days1to30 || 0)}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border">
              <div className="text-orange-600">เกิน 31-60 วัน</div>
              <div className="font-bold text-orange-700 mt-0.5">{formatMoney(arAging?.days31to60 || 0)}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border">
              <div className="text-red-600">เกิน 60 วัน</div>
              <div className="font-bold text-red-700 mt-0.5">{formatMoney(arAging?.over60 || 0)}</div>
            </div>
          </div>
          <div className="card-body p-0 overflow-x-auto max-h-64">
            <table className="table w-full text-xs">
              <thead>
                <tr>
                  <th>เลขที่บิล</th>
                  <th>ลูกค้า</th>
                  <th>ครบกำหนด</th>
                  <th className="text-right">ยอดค้างรับ</th>
                  <th className="text-center">อายุหนี้</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {arAgingDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">ไม่มีลูกหนี้ค้างชำระ</td>
                  </tr>
                ) : (
                  arAgingDocs.slice(0, 6).map((doc) => (
                    <tr key={doc.id}>
                      <td className="font-mono font-semibold text-primary-600">{doc.docNumber}</td>
                      <td>{doc.contactName}</td>
                      <td>{formatDateShort(doc.dueDate)}</td>
                      <td className="text-right font-semibold">{formatMoney(doc.netAmount)}</td>
                      <td className="text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium ${
                            doc.daysOverdue > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {doc.daysOverdue > 0 ? `เกิน ${doc.daysOverdue} วัน` : doc.bucket}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AP Aging */}
        <div className="card gsap-card">
          <div className="card-header flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">เจ้าหนี้ครบกำหนดชำระ (AP Aging)</h2>
              <p className="text-xs text-slate-500">ยอดค้างจ่ายรวม: {formatMoney(apAging?.total || 0, true)}</p>
            </div>
            <button onClick={() => handleExportAgingCsv('AP')} className="btn-secondary text-xs py-1.5 px-2.5">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-b grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 bg-white rounded-lg border">
              <div className="text-slate-500">ยังไม่ถึงกำหนด</div>
              <div className="font-bold text-slate-800 mt-0.5">{formatMoney(apAging?.current || 0)}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border">
              <div className="text-amber-600">เกิน 1-30 วัน</div>
              <div className="font-bold text-amber-700 mt-0.5">{formatMoney(apAging?.days1to30 || 0)}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border">
              <div className="text-orange-600">เกิน 31-60 วัน</div>
              <div className="font-bold text-orange-700 mt-0.5">{formatMoney(apAging?.days31to60 || 0)}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border">
              <div className="text-red-600">เกิน 60 วัน</div>
              <div className="font-bold text-red-700 mt-0.5">{formatMoney(apAging?.over60 || 0)}</div>
            </div>
          </div>
          <div className="card-body p-0 overflow-x-auto max-h-64">
            <table className="table w-full text-xs">
              <thead>
                <tr>
                  <th>เลขที่ RR</th>
                  <th>เจ้าหนี้ / คู่ค้า</th>
                  <th>ครบกำหนด</th>
                  <th className="text-right">ยอดค้างจ่าย</th>
                  <th className="text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {apAgingDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">ไม่มีเจ้าหนี้ค้างชำระ</td>
                  </tr>
                ) : (
                  apAgingDocs.slice(0, 6).map((doc) => (
                    <tr key={doc.id}>
                      <td className="font-mono font-semibold text-indigo-600">{doc.docNumber}</td>
                      <td>{doc.contactName}</td>
                      <td>{formatDateShort(doc.dueDate)}</td>
                      <td className="text-right font-semibold">{formatMoney(doc.netAmount)}</td>
                      <td className="text-center">
                        <Link
                          href={`/ap/payment-vouchers/new?rrId=${doc.id}`}
                          className={`inline-block px-2 py-0.5 rounded-full font-medium ${
                            doc.daysOverdue > 0
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          {doc.daysOverdue > 0 ? `เกิน ${doc.daysOverdue} วัน (จ่าย)` : 'รอจ่าย'}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Stock Alert + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card gsap-card lg:col-span-2">
          <div className="card-header border-b px-4 sm:px-6 py-4">
            <h2 className="text-lg font-medium">รายได้และค่าใช้จ่าย 6 เดือนล่าสุด</h2>
          </div>
          <div className="card-body p-3 sm:p-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatMoney(value)} />
                <Legend />
                <Bar dataKey="revenue" name="รายได้" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="ค่าใช้จ่าย/ซื้อ" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alert Card */}
        <div className="card gsap-card flex flex-col">
          <div className="card-header flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="text-base font-bold text-slate-900">สินค้าใกล้หมด (Low Stock)</h2>
            </div>
            <Link href="/products" className="text-xs text-primary-600 hover:underline">
              จัดการคลัง
            </Link>
          </div>
          <div className="card-body p-0 flex-1 overflow-y-auto max-h-80">
            {lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-sm text-emerald-600 flex flex-col items-center gap-2">
                <Package className="w-8 h-8 opacity-60" />
                สต็อกสินค้าทุกรายการอยู่ในเกณฑ์ปกติ
              </div>
            ) : (
              <div className="divide-y">
                {lowStockProducts.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                    <div>
                      <div className="font-mono font-semibold text-slate-800">{item.code}</div>
                      <div className="text-slate-600">{item.name}</div>
                      <div className="text-[11px] text-slate-400">
                        จุดสั่งซื้อขั้นต่ำ: {item.reorderPoint} {item.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                        เหลือ {item.currentStock} {item.unit}
                      </span>
                      <div className="mt-1">
                        <Link href="/ap/purchase-orders/new" className="text-[11px] text-indigo-600 hover:underline font-medium">
                          + สั่งซื้อ (PO)
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card gsap-card">
          <div className="card-header border-b px-4 sm:px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-medium">ใบแจ้งหนี้ล่าสุด</h2>
            <Link href="/income/invoices" className="text-sm text-blue-600 hover:underline">
              ดูทั้งหมด
            </Link>
          </div>
          <div className="card-body p-0 overflow-x-auto">
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
          <div className="card-header border-b px-4 sm:px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-medium">ค่าใช้จ่ายล่าสุด</h2>
            <Link href="/expenses" className="text-sm text-blue-600 hover:underline">
              ดูทั้งหมด
            </Link>
          </div>
          <div className="card-body p-0 overflow-x-auto">
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
