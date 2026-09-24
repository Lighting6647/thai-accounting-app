'use client';

import { useState, useEffect } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { formatMoney, formatDateThai, getStatusLabel } from '@/lib/format';
import { toast } from 'sonner';

interface JournalDetailModalProps {
  id: string | null;
  onClose: () => void;
}

export default function JournalDetailModal({ id, onClose }: JournalDetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/journals?id=${id}`);
        if (!res.ok) throw new Error('Failed to fetch journal');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        toast.error('ไม่สามารถโหลดข้อมูลสมุดรายวันได้');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (!id) return null;

  const statusInfo = getStatusLabel(data?.status || 'POSTED');

  let totalDebit = 0;
  let totalCredit = 0;
  if (data?.lines) {
    data.lines.forEach((line: any) => {
      totalDebit += line.debitAmount || 0;
      totalCredit += line.creditAmount || 0;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              สมุดรายวัน: {data?.entryNumber || ''}
            </h2>
            <p className="text-xs text-gray-500">วันที่: {formatDateThai(data?.entryDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1">
              <Printer className="w-4 h-4" /> พิมพ์
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : !data ? (
            <div className="text-center py-12 text-red-500">ไม่พบข้อมูลสมุดรายวัน</div>
          ) : (
            <>
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border text-sm">
                <div>
                  <span className="text-gray-500 block">รายละเอียด (Memo):</span>
                  <span className="font-semibold text-gray-900">{data.memo || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">ประเภท:</span>
                  <span className="font-medium text-gray-900">{data.journalType}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">สถานะ:</span>
                  <span className={statusInfo.className}>{statusInfo.label}</span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="table w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600">
                      <th className="px-4 py-2 w-28 text-center">รหัสบัญชี</th>
                      <th className="px-4 py-2">ชื่อบัญชี</th>
                      <th className="px-4 py-2">คำอธิบาย</th>
                      <th className="px-4 py-2 text-right w-32">เดบิต (Dr)</th>
                      <th className="px-4 py-2 text-right w-32">เครดิต (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.lines?.map((line: any) => (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-center text-gray-500">{line.account?.code}</td>
                        <td className="px-4 py-2.5 font-medium">{line.account?.nameTh}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{line.description || '-'}</td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {line.debitAmount > 0 ? formatMoney(line.debitAmount) : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {line.creditAmount > 0 ? formatMoney(line.creditAmount) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold border-t border-gray-300">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right">รวมทั้งสิ้น</td>
                      <td className="px-4 py-3 text-right text-primary-700">{formatMoney(totalDebit)}</td>
                      <td className="px-4 py-3 text-right text-primary-700">{formatMoney(totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
