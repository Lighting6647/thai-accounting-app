'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Loader2, Eye, Download, ArrowRight, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getStatusLabel } from '@/lib/format';
import { exportToCsv } from '@/lib/csv-export';
import ExpressDetailModal from '@/components/erp/ExpressDetailModal';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ar/quotations');
      if (!res.ok) throw new Error('Failed to fetch');
      setQuotations(await res.json());
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลใบเสนอราคาได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const filtered = quotations.filter((qt) => {
    const s = search.toLowerCase();
    const matchSearch =
      (qt.qtNumber || '').toLowerCase().includes(s) ||
      (qt.contactName || '').toLowerCase().includes(s);
    const matchFilter = filter === 'ALL' || qt.status === filter;
    return matchSearch && matchFilter;
  });

  const handleExportCsv = () => {
    exportToCsv(
      `quotations-${new Date().toISOString().split('T')[0]}`,
      ['เลขที่ QT', 'วันที่', 'ใช้ได้ถึง', 'ลูกค้า', 'ฐานภาษี', 'VAT', 'ยอดรวม', 'สถานะ'],
      filtered.map((qt) => [
        qt.qtNumber,
        formatDateThai(qt.qtDate),
        formatDateThai(qt.validUntil),
        qt.contactName,
        qt.subtotal,
        qt.vatAmount,
        qt.totalAmount,
        getStatusLabel(qt.status).label,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ใบเสนอราคา (QT - Quotation)</h1>
          <p className="text-sm text-slate-500">จัดทำใบเสนอราคาให้ลูกค้า และแปลงเป็นใบสั่งขาย (SO) ได้ในคลิกเดียว</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Link href="/ar/quotations/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> สร้างใบเสนอราคา (QT)
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'DRAFT', 'APPROVED', 'ORDERED', 'VOIDED'].map((tab) => (
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
              placeholder="ค้นหาเลขที่ QT หรือชื่อลูกค้า..."
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
            <div className="text-center p-10 text-slate-500">ไม่พบรายการใบเสนอราคา</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th>เลขที่ QT</th>
                  <th>วันที่เสนอราคา</th>
                  <th>ใช้ได้ถึงวันที่</th>
                  <th>ลูกค้า</th>
                  <th className="text-right">ยอดรวมทั้งสิ้น</th>
                  <th className="text-center">สถานะ</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((qt) => {
                  const st = getStatusLabel(qt.status);
                  return (
                    <tr key={qt.id}>
                      <td>
                        <button
                          onClick={() => setSelectedId(qt.id)}
                          className="font-mono font-semibold text-primary-600 hover:underline"
                        >
                          {qt.qtNumber}
                        </button>
                      </td>
                      <td>{formatDateThai(qt.qtDate)}</td>
                      <td className="text-xs text-slate-600">{formatDateThai(qt.validUntil)}</td>
                      <td className="font-medium text-slate-800">{qt.contactName}</td>
                      <td className="text-right font-semibold">{formatMoney(qt.totalAmount)}</td>
                      <td className="text-center">
                        <span className={st.className}>{st.label}</span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedId(qt.id)}
                            className="p-1.5 text-slate-500 hover:text-primary-600 rounded-lg"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/print/qt/${qt.id}`}
                            target="_blank"
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg"
                            title="พิมพ์ใบเสนอราคา"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                          {['DRAFT', 'APPROVED'].includes(qt.status) && (
                            <Link
                              href={`/ar/sales-orders/new?sourceId=${qt.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                              title="แปลงเป็นใบสั่งขาย (SO)"
                            >
                              เปิด SO <ArrowRight className="w-3 h-3" />
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
        docType="qt"
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={fetchQuotations}
      />
    </div>
  );
}
