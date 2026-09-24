'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, RefreshCw, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai } from '@/lib/format';

export default function BankReconcilePage() {
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoMatching, setAutoMatching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');

  const fetchLines = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bank-reconciliation');
      if (!res.ok) throw new Error('Failed to fetch statement lines');
      const data = await res.json();
      setLines(data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูล Statement ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLines();
  }, []);

  const handleAutoMatch = async () => {
    setAutoMatching(true);
    try {
      const res = await fetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'AUTO_MATCH' }),
      });

      if (!res.ok) throw new Error('Failed to auto match');
      const result = await res.json();
      toast.success(result.message || 'จับคู่สำเร็จ');
      fetchLines();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการจับคู่');
    } finally {
      setAutoMatching(false);
    }
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccount: 'SCB',
          transactionDate: transDate,
          description: desc,
          amount,
          type,
        }),
      });

      if (!res.ok) throw new Error('Failed to add statement line');

      toast.success('นำเข้ารายการ Statement เรียบร้อยแล้ว');
      setShowAddModal(false);
      setDesc('');
      setAmount(0);
      fetchLines();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const reconciledCount = lines.filter((l) => l.isReconciled).length;
  const unreconciledCount = lines.length - reconciledCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ระบบกระทบยอดเงินฝากธนาคาร (Bank Reconciliation)</h1>
          <p className="text-sm text-gray-500">นำเข้า Bank Statement และจับคู่รายการรับ-จ่ายเงินกับใบแจ้งหนี้/ค่าใช้จ่ายให้อัตโนมัติ</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAutoMatch} disabled={autoMatching} className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            {autoMatching ? 'กำลังจับคู่อัตโนมัติ...' : 'จับคู่อัตโนมัติ (Auto-Match)'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" /> นำเข้ารายการ Statement
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-gray-500">รายการ Statement ทั้งหมด</p>
          <h3 className="text-xl font-bold mt-1 text-gray-900">{lines.length} รายการ</h3>
        </div>
        <div className="card p-5 bg-green-50 border-green-200">
          <p className="text-xs text-green-600 font-medium">กระทบยอดแล้ว (Matched)</p>
          <h3 className="text-xl font-bold mt-1 text-green-700">{reconciledCount} รายการ</h3>
        </div>
        <div className="card p-5 bg-amber-50 border-amber-200">
          <p className="text-xs text-amber-600 font-medium">รอจับคู่ (Unreconciled)</p>
          <h3 className="text-xl font-bold mt-1 text-amber-700">{unreconciledCount} รายการ</h3>
        </div>
      </div>

      {/* Statement Table */}
      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : lines.length === 0 ? (
            <div className="text-center p-8 text-gray-500">ยังไม่มีรายการ Statement</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3">รายการ/รายละเอียด</th>
                  <th className="px-4 py-3 text-center">ประเภท</th>
                  <th className="px-4 py-3 text-right">จำนวนเงิน</th>
                  <th className="px-4 py-3 text-center">สถานะจับคู่</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {lines.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{formatDateThai(l.transactionDate)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{l.description}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        l.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {l.type === 'CREDIT' ? 'ฝาก/โอนเข้า (+)' : 'ถอน/จ่ายออก (-)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{formatMoney(l.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      {l.isReconciled ? (
                        <span className="inline-flex items-center text-xs font-semibold text-green-600 gap-1">
                          <CheckCircle2 className="w-4 h-4" /> จับคู่สำเร็จ ({l.matchedDocType})
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs text-amber-600 gap-1">
                          <AlertCircle className="w-4 h-4" /> รอจับคู่
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal - เพิ่ม Statement */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <form onSubmit={handleAddLine} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">นำเข้ารายการ Bank Statement</h2>
            <div className="space-y-3">
              <div>
                <label className="label">วันที่รายการ</label>
                <input type="date" value={transDate} onChange={(e) => setTransDate(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">ประเภทรายการ</label>
                <select value={type} onChange={(e: any) => setType(e.target.value)} className="input">
                  <option value="CREDIT">โอนเงินเข้า (+)</option>
                  <option value="DEBIT">ถอน/จ่ายเงินออก (-)</option>
                </select>
              </div>
              <div>
                <label className="label">รายละเอียดรายการ</label>
                <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} className="input" placeholder="เช่น รับโอนเงินค่าสินค้า" required />
              </div>
              <div>
                <label className="label">จำนวนเงิน (บาท)</label>
                <input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className="input text-right" step="0.01" required />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">ยกเลิก</button>
              <button type="submit" className="btn-primary">นำเข้า Statement</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
