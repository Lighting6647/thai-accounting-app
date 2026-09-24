'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Search, Plus, Calendar, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getStatusLabel } from '@/lib/format';
import JournalDetailModal from '@/components/ui/JournalDetailModal';

export default function JournalsPage() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);

  const fetchJournals = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);

      const res = await fetch(`/api/journals?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setJournals(data);
    } catch (err) {
      toast.error('ไม่สามารถดึงข้อมูลสมุดรายวันได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, [startDate, endDate]);

  const filteredJournals = journals.filter((j) => {
    const s = search.toLowerCase();
    return (
      (j.entryNumber || '').toLowerCase().includes(s) ||
      (j.memo || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">สมุดรายวัน</h1>
        <Link href="/journals/new" className="btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          บันทึกรายวัน
        </Link>
      </div>

      <div className="card">
        <div className="card-header border-b px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              className="input text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>-</span>
            <input
              type="date"
              className="input text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ หรือ รายละเอียด..."
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
          ) : filteredJournals.length === 0 ? (
            <div className="text-center p-8 text-gray-500">ไม่พบข้อมูลสมุดรายวัน</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-6 py-3">เลขที่</th>
                  <th className="px-6 py-3">วันที่</th>
                  <th className="px-6 py-3">ประเภท</th>
                  <th className="px-6 py-3">รายละเอียด</th>
                  <th className="px-6 py-3 text-right">เดบิต</th>
                  <th className="px-6 py-3 text-right">เครดิต</th>
                  <th className="px-6 py-3 text-center">สถานะ</th>
                  <th className="px-6 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredJournals.map((journal) => {
                  const statusInfo = getStatusLabel(journal.status);
                  return (
                    <tr key={journal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">
                        <button
                          onClick={() => setSelectedJournalId(journal.id)}
                          className="text-primary-600 font-semibold hover:underline"
                        >
                          {journal.entryNumber}
                        </button>
                      </td>
                      <td className="px-6 py-3">{formatDateThai(journal.entryDate)}</td>
                      <td className="px-6 py-3">{journal.journalType}</td>
                      <td className="px-6 py-3 max-w-xs truncate">{journal.memo || '-'}</td>
                      <td className="px-6 py-3 text-right">{formatMoney(journal.totalDebit)}</td>
                      <td className="px-6 py-3 text-right">{formatMoney(journal.totalCredit)}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={statusInfo.className}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => setSelectedJournalId(journal.id)}
                          className="p-1 text-gray-500 hover:text-primary-600 rounded"
                          title="ดูขาบัญชี (Dr/Cr)"
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

      <JournalDetailModal
        id={selectedJournalId}
        onClose={() => setSelectedJournalId(null)}
      />
    </div>
  );
}
