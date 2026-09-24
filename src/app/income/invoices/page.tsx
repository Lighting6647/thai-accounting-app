'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Search, Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getStatusLabel } from '@/lib/format';
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ใบแจ้งหนี้</h1>
        <Link href="/income/invoices/new" className="btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          สร้างใบแจ้งหนี้
        </Link>
      </div>

      <div className="card">
        <div className="card-header border-b px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto">
            {['ALL', 'DRAFT', 'UNPAID', 'OVERDUE', 'PAID', 'VOIDED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
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
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ หรือ ชื่อลูกค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
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
                          className="text-primary-600 font-semibold hover:underline"
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
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="p-1 text-gray-500 hover:text-primary-600 rounded"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
