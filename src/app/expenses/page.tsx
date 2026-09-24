'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Search, Plus, Eye, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getStatusLabel } from '@/lib/format';
import { ExpenseListItem } from '@/types';
import DocumentDetailModal from '@/components/ui/DocumentDetailModal';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setExpenses(data);
    } catch (err) {
      toast.error('ไม่สามารถดึงข้อมูลค่าใช้จ่ายได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const filteredExpenses = expenses.filter((exp) => {
    const s = search.toLowerCase();
    const matchesSearch =
      (exp.expenseNumber || '').toLowerCase().includes(s) ||
      (exp.contactName || '').toLowerCase().includes(s);
    const matchesFilter = filter === 'ALL' || exp.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ค่าใช้จ่าย</h1>
        <Link href="/expenses/new" className="btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          บันทึกค่าใช้จ่าย
        </Link>
      </div>

      <div className="card">
        <div className="card-header border-b px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2">
            {['ALL', 'RECORDED', 'VOIDED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-sm rounded-md ${
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
              placeholder="ค้นหาเลขที่ หรือ ผู้รับเงิน..."
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
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center p-8 text-gray-500">ไม่พบข้อมูลค่าใช้จ่าย</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-6 py-3">เลขที่</th>
                  <th className="px-6 py-3">วันที่</th>
                  <th className="px-6 py-3">ผู้รับเงิน</th>
                  <th className="px-6 py-3">หมวด</th>
                  <th className="px-6 py-3 text-right">ยอดรวม</th>
                  <th className="px-6 py-3 text-right">ยอดจ่ายสุทธิ</th>
                  <th className="px-6 py-3 text-center">สถานะ</th>
                  <th className="px-6 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredExpenses.map((exp) => {
                  const statusInfo = getStatusLabel(exp.status);
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedExpenseId(exp.id)}
                            className="text-primary-600 font-semibold hover:underline"
                          >
                            {exp.expenseNumber}
                          </button>
                          {exp.attachmentUrl && (
                            <a
                              href={exp.attachmentUrl}
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
                      <td className="px-6 py-3">{formatDateThai(exp.expenseDate)}</td>
                      <td className="px-6 py-3">{exp.contactName || '-'}</td>
                      <td className="px-6 py-3">{exp.category || '-'}</td>
                      <td className="px-6 py-3 text-right">{formatMoney(exp.totalAmount)}</td>
                      <td className="px-6 py-3 text-right font-medium">{formatMoney(exp.netPayment)}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={statusInfo.className}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => setSelectedExpenseId(exp.id)}
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
        type="expense"
        id={selectedExpenseId}
        onClose={() => setSelectedExpenseId(null)}
        onStatusChanged={fetchExpenses}
      />
    </div>
  );
}
