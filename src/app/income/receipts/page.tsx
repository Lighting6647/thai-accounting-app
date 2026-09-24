'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Search, Plus, Paperclip, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getPaymentMethodLabel } from '@/lib/format';
import ImportReceiptModal from '@/components/ui/ImportReceiptModal';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/receipts');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setReceipts(data);
    } catch (err) {
      toast.error('ไม่สามารถดึงข้อมูลใบเสร็จรับเงินได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const filteredReceipts = receipts.filter(r => {
    const docNo = r.receiptNumber || r.docNo || '';
    const name = r.contactName || r.customerName || '';
    const invNo = r.invoiceNumber || r.invoiceNo || '';
    return docNo.toLowerCase().includes(search.toLowerCase()) || 
           name.toLowerCase().includes(search.toLowerCase()) || 
           invNo.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ใบเสร็จรับเงิน</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn-secondary flex items-center border-slate-300 hover:border-sky-500 hover:text-sky-600 shadow-sm transition-all"
          >
            <Upload className="w-4 h-4 mr-2 text-sky-600" />
            นำเข้าใบเสร็จ
          </button>
          <Link href="/income/receipts/new" className="btn-primary flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            สร้างใบเสร็จ
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header border-b px-6 py-4 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="ค้นหาเลขที่, ชื่อผู้จ่าย, หรือ อ้างอิงใบแจ้งหนี้..." 
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
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center p-8 text-gray-500">ไม่พบข้อมูลใบเสร็จรับเงิน</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-6 py-3">เลขที่</th>
                  <th className="px-6 py-3">วันที่</th>
                  <th className="px-6 py-3">ผู้จ่าย</th>
                  <th className="px-6 py-3 text-right">จำนวนเงิน</th>
                  <th className="px-6 py-3">วิธีชำระ</th>
                  <th className="px-6 py-3">อ้างอิงใบแจ้งหนี้</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-600 font-semibold">{receipt.receiptNumber || receipt.docNo}</span>
                        {receipt.attachmentUrl && (
                          <a
                            href={receipt.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-slate-400 hover:text-sky-600"
                            title="ดูเอกสารแนบ"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">{formatDateThai(receipt.receiptDate || receipt.issueDate)}</td>
                    <td className="px-6 py-3">{receipt.contactName || receipt.customerName}</td>
                    <td className="px-6 py-3 text-right font-medium">{formatMoney(receipt.amount)}</td>
                    <td className="px-6 py-3">{getPaymentMethodLabel(receipt.paymentMethod)}</td>
                    <td className="px-6 py-3">{receipt.invoiceNumber || receipt.invoiceNo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ImportReceiptModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchReceipts}
      />
    </div>
  );
}
