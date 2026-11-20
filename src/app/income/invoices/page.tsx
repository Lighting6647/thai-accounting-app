'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Search, Plus, Eye, Printer, Download, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getStatusLabel } from '@/lib/format';
import { exportToCsv } from '@/lib/csv-export';
import { InvoiceListItem } from '@/types';
import DocumentDetailModal from '@/components/ui/DocumentDetailModal';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      toast.error('ไม่สามารถดึงข้อมูลใบแจ้งหนี้ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const s = search.toLowerCase();
    const matchesSearch =
      (inv.invoiceNumber || '').toLowerCase().includes(s) ||
      (inv.contactName || '').toLowerCase().includes(s);
    const matchesFilter = filter === 'ALL' || inv.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleExportCsv = () => {
    exportToCsv(
      `invoices-${new Date().toISOString().split('T')[0]}`,
      ['เลขที่ใบแจ้งหนี้', 'วันที่', 'วันครบกำหนด', 'ลูกค้า', 'ยอดรวม', 'ยอดรับสุทธิ', 'สถานะ'],
      filteredInvoices.map((inv) => [
        inv.invoiceNumber,
        formatDateThai(inv.invoiceDate),
        formatDateThai(inv.dueDate),
        inv.contactName,
        inv.totalAmount,
        inv.netAmount,
        getStatusLabel(inv.status).label,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ใบแจ้งหนี้ / ใบกำกับภาษีขาย (IV)</h1>
          <p className="text-sm text-slate-500">
            ออกบิลขายจากใบสั่งขาย (SO) พร้อมตัดสต็อก Auto-GL ตั้งลูกหนี้ และบันทึกภาษีขาย (ภ.พ.30) อัตโนมัติ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Link href="/income/invoices/new" className="btn-primary text-sm flex items-center">
            <Plus className="w-4 h-4 mr-1" />
            สร้างใบแจ้งหนี้ (IV)
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header border-b px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'DRAFT', 'UNPAID', 'OVERDUE', 'PAID', 'VOIDED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  filter === tab
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'ALL' ? 'ทั้งหมด' : getStatusLabel(tab).label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ หรือ ชื่อลูกค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 py-2 text-sm w-full"
            />
          </div>
        </div>

        <div className="card-body p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center p-8 text-gray-500">ไม่พบข้อมูลใบแจ้งหนี้</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-6 py-3">เลขที่</th>
                  <th className="px-6 py-3">วันที่</th>
                  <th className="px-6 py-3">ลูกค้า</th>
                  <th className="px-6 py-3">ครบกำหนด</th>
                  <th className="px-6 py-3 text-right">ยอดรวม</th>
                  <th className="px-6 py-3 text-right">ยอดสุทธิ</th>
                  <th className="px-6 py-3 text-center">สถานะ</th>
                  <th className="px-6 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredInvoices.map((inv) => {
                  const statusInfo = getStatusLabel(inv.status);
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="text-primary-600 font-mono font-semibold hover:underline"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="px-6 py-3">{formatDateThai(inv.invoiceDate)}</td>
                      <td className="px-6 py-3">{inv.contactName}</td>
                      <td className="px-6 py-3">{formatDateThai(inv.dueDate)}</td>
                      <td className="px-6 py-3 text-right">{formatMoney(inv.totalAmount)}</td>
                      <td className="px-6 py-3 text-right font-medium">{formatMoney(inv.netAmount)}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={statusInfo.className}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedInvoiceId(inv.id)}
                            className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg"
                            title="ดูรายละเอียด & Auto-GL"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/print/iv/${inv.id}`}
                            target="_blank"
                            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg"
                            title="พิมพ์ใบแจ้งหนี้ / ใบกำกับภาษี"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                          {(inv.status === 'UNPAID' || inv.status === 'OVERDUE') && (
                            <Link
                              href={`/income/receipts/new?invoiceId=${inv.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                              title="รับเงิน / ออกใบเสร็จรับเงิน (RE)"
                            >
                              รับเงิน <ArrowRight className="w-3 h-3" />
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

      <DocumentDetailModal
        type="invoice"
        id={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        onStatusChanged={fetchInvoices}
      />
    </div>
  );
}
