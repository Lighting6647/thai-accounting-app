'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Loader2, Eye, Download, ArrowRight, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getStatusLabel } from '@/lib/format';
import { exportToCsv } from '@/lib/csv-export';
import ExpressDetailModal from '@/components/erp/ExpressDetailModal';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ap/purchase-orders');
      if (!res.ok) throw new Error('Failed to fetch');
      setOrders(await res.json());
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลใบสั่งซื้อได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((po) => {
    const s = search.toLowerCase();
    const matchSearch =
      (po.poNumber || '').toLowerCase().includes(s) ||
      (po.contactName || '').toLowerCase().includes(s);
    const matchFilter = filter === 'ALL' || po.status === filter;
    return matchSearch && matchFilter;
  });

  const handleExportCsv = () => {
    exportToCsv(
      `purchase-orders-${new Date().toISOString().split('T')[0]}`,
      ['เลขที่ใบสั่งซื้อ', 'วันที่', 'วันส่งมอบ', 'ผู้ขาย/คู่ค้า', 'คลังสินค้า', 'ก่อน VAT', 'VAT', 'ยอดรวม', 'สถานะ'],
      filtered.map((po) => [
        po.poNumber,
        formatDateThai(po.poDate),
        formatDateThai(po.expectedDate),
        po.contactName,
        po.warehouseName,
        po.subtotal,
        po.vatAmount,
        po.totalAmount,
        getStatusLabel(po.status).label,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ใบสั่งซื้อสินค้า (PO - Purchase Order)</h1>
          <p className="text-sm text-slate-500">ออกใบสั่งซื้อให้ผู้ขาย และส่งต่อไปรับสินค้าเข้าคลัง (RR)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Link href="/ap/purchase-orders/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> สร้างใบสั่งซื้อ (PO)
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'DRAFT', 'APPROVED', 'RECEIVED', 'VOIDED'].map((tab) => (
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
              placeholder="ค้นหาเลขที่ PO หรือชื่อผู้ขาย..."
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
            <div className="text-center p-10 text-slate-500">ไม่พบรายการใบสั่งซื้อ</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th>เลขที่ PO</th>
                  <th>วันที่สั่งซื้อ</th>
                  <th>ผู้ขาย / คู่ค้า</th>
                  <th>คลังรับของ</th>
                  <th className="text-right">ยอดสุทธิ</th>
                  <th className="text-center">สถานะ</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((po) => {
                  const st = getStatusLabel(po.status);
                  return (
                    <tr key={po.id}>
                      <td>
                        <button
                          onClick={() => setSelectedId(po.id)}
                          className="font-mono font-semibold text-primary-600 hover:underline"
                        >
                          {po.poNumber}
                        </button>
                      </td>
                      <td>{formatDateThai(po.poDate)}</td>
                      <td className="font-medium text-slate-800">{po.contactName}</td>
                      <td className="text-xs text-slate-500">{po.warehouseName}</td>
                      <td className="text-right font-semibold">{formatMoney(po.totalAmount)}</td>
                      <td className="text-center">
                        <span className={st.className}>{st.label}</span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedId(po.id)}
                            className="p-1.5 text-slate-500 hover:text-primary-600 rounded-lg"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/print/po/${po.id}`}
                            target="_blank"
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg"
                            title="พิมพ์ใบสั่งซื้อ"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                          {['DRAFT', 'APPROVED'].includes(po.status) && (
                            <Link
                              href={`/ap/goods-receipts/new?sourceId=${po.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                              title="รับสินค้าเข้าคลัง (สร้าง RR)"
                            >
                              รับของ <ArrowRight className="w-3 h-3" />
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
        docType="po"
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={fetchOrders}
      />
    </div>
  );
}
