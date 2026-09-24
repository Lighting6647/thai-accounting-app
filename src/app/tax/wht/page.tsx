'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai } from '@/lib/format';

export default function WhtPage() {
  const [whtDocs, setWhtDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formType, setFormType] = useState('ALL');
  const [monthYear, setMonthYear] = useState('');

  useEffect(() => {
    const fetchWhtDocs = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (monthYear) query.append('monthYear', monthYear);
        
        const res = await fetch(`/api/wht?${query.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setWhtDocs(data);
      } catch (err) {
        toast.error('ไม่สามารถดึงข้อมูลหัก ณ ที่จ่ายได้');
      } finally {
        setLoading(false);
      }
    };
    fetchWhtDocs();
  }, [monthYear]);

  const filteredDocs = whtDocs.filter(doc => {
    const docNo = doc.whtNumber || doc.docNo || '';
    const payee = doc.payeeName || '';
    const payer = doc.payerName || '';
    const matchesSearch = docNo.toLowerCase().includes(search.toLowerCase()) || 
                          payee.toLowerCase().includes(search.toLowerCase()) || 
                          payer.toLowerCase().includes(search.toLowerCase());
    const matchesForm = formType === 'ALL' || doc.formType === formType;
    return matchesSearch && matchesForm;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">หนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ)</h1>
        <Link href="/tax/wht/new" className="btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          สร้าง 50 ทวิ
        </Link>
      </div>

      <div className="card">
        <div className="card-header border-b px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {['ALL', 'PND3', 'PND53'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setFormType(tab)}
                  className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                    formType === tab 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'ALL' ? 'ทั้งหมด' : tab === 'PND3' ? 'ภ.ง.ด.3' : 'ภ.ง.ด.53'}
                </button>
              ))}
            </div>
            
            <input 
              type="month" 
              className="input text-sm" 
              value={monthYear}
              onChange={e => setMonthYear(e.target.value)}
            />
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="ค้นหาเลขที่, ชื่อผู้จ่าย/รับ..." 
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
          ) : filteredDocs.length === 0 ? (
            <div className="text-center p-8 text-gray-500">ไม่พบข้อมูลหนังสือรับรองหัก ณ ที่จ่าย</div>
          ) : (
            <table className="table w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-6 py-3">เลขที่</th>
                  <th className="px-6 py-3">วันที่</th>
                  <th className="px-6 py-3">ผู้จ่ายเงิน</th>
                  <th className="px-6 py-3">ผู้รับเงิน</th>
                  <th className="px-6 py-3">ประเภท</th>
                  <th className="px-6 py-3 text-right">ฐานภาษี</th>
                  <th className="px-6 py-3 text-right">อัตรา%</th>
                  <th className="px-6 py-3 text-right">ภาษีหัก</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">
                      <Link href={`/tax/wht/${doc.id}`} className="text-blue-600 hover:underline font-semibold">
                        {doc.whtNumber || doc.docNo}
                      </Link>
                    </td>
                    <td className="px-6 py-3">{formatDateThai(doc.paymentDate || doc.issueDate)}</td>
                    <td className="px-6 py-3">{doc.payerName}</td>
                    <td className="px-6 py-3">{doc.payeeName}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-semibold">
                        {doc.formType === 'PND3' ? 'ภ.ง.ด.3' : 'ภ.ง.ด.53'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">{formatMoney(doc.baseAmount)}</td>
                    <td className="px-6 py-3 text-right">{doc.whtRate ?? doc.taxRate ?? 0}%</td>
                    <td className="px-6 py-3 text-right font-semibold text-blue-600">{formatMoney(doc.whtAmount ?? doc.taxAmount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
