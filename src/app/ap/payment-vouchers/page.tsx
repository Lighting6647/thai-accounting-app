'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Loader2, Eye, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getStatusLabel, getPaymentMethodLabel } from '@/lib/format';
import { exportToCsv } from '@/lib/csv-export';
import ExpressDetailModal from '@/components/erp/ExpressDetailModal';

export default function PaymentVouchersPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ap/payment-vouchers');
      if (!res.ok) throw new Error('Failed to fetch');
      setVouchers(await res.json());
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลใบสำคัญจ่ายได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const filtered = vouchers.filter((pv) => {
    const s = search.toLowerCase();
    return (
      (pv.pvNumber || '').toLowerCase().includes(s) ||
      (pv.contactName || '').toLowerCase().includes(s) ||
      (pv.rrNumber || '').toLowerCase().includes(s)
    );
  });

  const handleExportCsv = () => {
    exportToCsv(
      `payment-vouchers-${new Date().toISOString().split('T')[0]}`,
      ['เลขที่ PV', 'วันที่จ่าย', 'อ้างอิง RR', 'ผู้รับเงิน/เจ้าหนี้', 'วิธีชำระ', 'ยอดหนี้', 'หัก ณ ที่จ่าย', 'จ่ายสุทธิ', 'สถานะ'],
      filtered.map((pv) => [
        pv.pvNumber,
        formatDateThai(pv.pvDate),
        pv.rrNumber || '-',
        pv.contactName,
        getPaymentMethodLabel(pv.paymentMethod),
        pv.amount,
        pv.whtAmount,
        pv.netPaid,
        getStatusLabel(pv.status).label,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ใบสำคัญจ่ายชำระหนี้ (PV - Payment Voucher)</h1>
          <p className="text-sm text-slate-500">ตัดจ่ายชำระเจ้าหนี้จากบิลซื้อเชื่อ (RR) พร้อมล้างเจ้าหนี้ Auto-GL อัตโนมัติ</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Link href="/ap/payment-vouchers/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> สร้างใบสำคัญจ่าย (PV)
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ PV, อ้างอิง RR หรือชื่อเจ้าหนี้..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 py-2 text-sm"
            />
          </div>
        </div>

        <div className="card-body p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-10 text-slate-500">ไม่พบรายการใบสำคัญจ่าย</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th>เลขที่ PV</th>
                  <th>วันที่จ่าย</th>
                  <th>ผู้รับเงิน / เจ้าหนี้</th>
                  <th>อ้างอิงบิล RR</th>
                  <th>วิธีชำระ</th>
                  <th className="text-right">จ่ายสุทธิ</th>
                  <th className="text-center">สถานะ</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((pv) => {
                  const st = getStatusLabel(pv.status);
                  return (
                    <tr key={pv.id}>
                      <td>
                        <button
                          onClick={() => setSelectedId(pv.id)}
                          className="font-mono font-semibold text-primary-600 hover:underline"
                        >
                          {pv.pvNumber}
                        </button>
                      </td>
                      <td>{formatDateThai(pv.pvDate)}</td>
                      <td className="font-medium text-slate-800">{pv.contactName}</td>
                      <td className="font-mono text-xs text-slate-500">{pv.rrNumber || '-'}</td>
                      <td>{getPaymentMethodLabel(pv.paymentMethod)}</td>
                      <td className="text-right font-semibold">{formatMoney(pv.netPaid)}</td>
                      <td className="text-center">
                        <span className={st.className}>{st.label}</span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedId(pv.id)}
                            className="p-1.5 text-slate-500 hover:text-primary-600 rounded-lg"
                            title="ดูรายละเอียด & Auto-GL"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/print/pv/${pv.id}`}
                            target="_blank"
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg"
                            title="พิมพ์ใบสำคัญจ่าย"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ExpressDetailModal
        docType="pv"
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={fetchVouchers}
      />
    </div>
  );
}
