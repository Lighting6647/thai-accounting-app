'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Loader2, Eye, Download, ArrowRight, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getStatusLabel } from '@/lib/format';
import { exportToCsv } from '@/lib/csv-export';
import ExpressDetailModal from '@/components/erp/ExpressDetailModal';

export default function GoodsReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ap/goods-receipts');
      if (!res.ok) throw new Error('Failed to fetch');
      setReceipts(await res.json());
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลใบรับสินค้า/ซื้อเชื่อได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const filtered = receipts.filter((rr) => {
    const s = search.toLowerCase();
    const matchSearch =
      (rr.rrNumber || '').toLowerCase().includes(s) ||
      (rr.vendorInvoiceNo || '').toLowerCase().includes(s) ||
      (rr.contactName || '').toLowerCase().includes(s);
    const matchFilter = filter === 'ALL' || rr.status === filter;
    return matchSearch && matchFilter;
  });

  const handleExportCsv = () => {
    exportToCsv(
      `goods-receipts-${new Date().toISOString().split('T')[0]}`,
      ['เลขที่ RR', 'วันที่รับของ', 'ครบกำหนดชำระ', 'อ้างอิง PO', 'ใบกำกับผู้ขาย', 'ผู้ขาย/เจ้าหนี้', 'ฐานภาษี', 'ภาษีซื้อ', 'ยอดสุทธิ', 'สถานะ'],
      filtered.map((rr) => [
        rr.rrNumber,
        formatDateThai(rr.rrDate),
        formatDateThai(rr.dueDate),
        rr.poNumber || '-',
        rr.vendorInvoiceNo || '-',
        rr.contactName,
        rr.subtotal,
        rr.vatAmount,
        rr.netAmount,
        getStatusLabel(rr.status).label,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รับสินค้า / ซื้อเชื่อ (RR - Goods Receipt)</h1>
          <p className="text-sm text-slate-500">
            รับสินค้าเข้าคลัง คำนวณต้นทุนเฉลี่ย Moving Average ตั้งเจ้าหนี้ Auto-GL และลงภาษีซื้ออัตโนมัติ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Link href="/ap/goods-receipts/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> บันทึกรับสินค้า (RR)
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'UNPAID', 'PAID', 'VOIDED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  filter === tab
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab === 'ALL' ? 'ทั้งหมด' : getStatusLabel(tab).label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ RR, บิลผู้ขาย, ชื่อคู่ค้า..."
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
            <div className="text-center p-10 text-slate-500">ไม่พบรายการใบรับสินค้า/ซื้อเชื่อ</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th>เลขที่ RR</th>
                  <th>วันที่รับของ</th>
                  <th>ครบกำหนด</th>
                  <th>ผู้ขาย / เจ้าหนี้</th>
                  <th>อ้างอิง PO</th>
                  <th className="text-right">ยอดตั้งหนี้</th>
                  <th className="text-center">สถานะ</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((rr) => {
                  const st = getStatusLabel(rr.status);
                  return (
                    <tr key={rr.id}>
                      <td>
                        <button
                          onClick={() => setSelectedId(rr.id)}
                          className="font-mono font-semibold text-primary-600 hover:underline"
                        >
                          {rr.rrNumber}
                        </button>
                      </td>
                      <td>{formatDateThai(rr.rrDate)}</td>
                      <td className="text-xs text-slate-600">{formatDateThai(rr.dueDate)}</td>
                      <td className="font-medium text-slate-800">{rr.contactName}</td>
                      <td className="font-mono text-xs text-slate-500">{rr.poNumber || '-'}</td>
                      <td className="text-right font-semibold">{formatMoney(rr.netAmount)}</td>
                      <td className="text-center">
                        <span className={st.className}>{st.label}</span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedId(rr.id)}
                            className="p-1.5 text-slate-500 hover:text-primary-600 rounded-lg"
                            title="ดูรายละเอียด & Auto-GL"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/print/rr/${rr.id}`}
                            target="_blank"
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg"
                            title="พิมพ์ใบรับสินค้า"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                          {rr.status === 'UNPAID' && (
                            <Link
                              href={`/ap/payment-vouchers/new?rrId=${rr.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                              title="สร้างใบสำคัญจ่ายชำระหนี้ (PV)"
                            >
                              จ่ายหนี้ <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
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
        docType="rr"
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={fetchReceipts}
      />
    </div>
  );
}
