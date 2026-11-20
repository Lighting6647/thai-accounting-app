'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, X, Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/format';

export default function NewPaymentVoucherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [unpaidRrs, setUnpaidRrs] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  const [pvDate, setPvDate] = useState(new Date().toISOString().split('T')[0]);
  const [rrId, setRrId] = useState('');
  const [contactId, setContactId] = useState('');
  const [contactName, setContactName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CASH' | 'CHEQUE'>('TRANSFER');
  const [chequeNumber, setChequeNumber] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [whtAmount, setWhtAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [rrRes, vRes] = await Promise.all([
          fetch('/api/ap/goods-receipts?status=UNPAID'),
          fetch('/api/contacts?type=vendor'),
        ]);
        const rrList = rrRes.ok ? await rrRes.json() : [];
        const vList = vRes.ok ? await vRes.json() : [];
        setUnpaidRrs(rrList);
        setVendors(vList);

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const qRrId = params.get('rrId');
          if (qRrId) {
            const matched = rrList.find((r: any) => r.id === qRrId);
            if (matched) {
              setRrId(matched.id);
              setContactId(matched.contactId || '');
              setContactName(matched.contactName || '');
              setAmount(Number(matched.totalAmount) || 0);
              setWhtAmount(Number(matched.whtAmount) || 0);
              setNotes(`จ่ายชำระหนี้ตามบิล ${matched.rrNumber}`);
            }
          }
        }
      } catch {
        toast.error('ไม่สามารถโหลดข้อมูลเจ้าหนี้ได้');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelectRr = (selectedRrId: string) => {
    setRrId(selectedRrId);
    if (!selectedRrId) {
      setAmount(0);
      setWhtAmount(0);
      return;
    }
    const matched = unpaidRrs.find((r) => r.id === selectedRrId);
    if (matched) {
      setContactId(matched.contactId || '');
      setContactName(matched.contactName || '');
      setAmount(Number(matched.totalAmount) || 0);
      setWhtAmount(Number(matched.whtAmount) || 0);
      setNotes(`จ่ายชำระหนี้ตามบิล ${matched.rrNumber}`);
    }
  };

  const handleSelectVendor = (selectedVendorId: string) => {
    setContactId(selectedVendorId);
    const v = vendors.find((x) => x.id === selectedVendorId);
    if (v) setContactName(v.name);
  };

  const netPaid = Math.max(0, amount - whtAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!contactName.trim()) {
      toast.error('กรุณาระบุชื่อเจ้าหนี้ / ผู้รับเงิน');
      return;
    }
    if (amount <= 0) {
      toast.error('จำนวนเงินต้องมากกว่า 0');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/ap/payment-vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pvDate,
          rrId: rrId || null,
          contactId: contactId || null,
          contactName: contactName.trim(),
          paymentMethod,
          chequeNumber: paymentMethod === 'CHEQUE' ? chequeNumber : null,
          amount,
          whtAmount,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'บันทึกไม่สำเร็จ');
      toast.success('บันทึกใบสำคัญจ่ายและล้างเจ้าหนี้เรียบร้อยแล้ว');
      router.push('/ap/payment-vouchers');
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">สร้างใบสำคัญจ่ายชำระหนี้ (PV)</h1>
          <p className="text-sm text-slate-500">ตัดจ่ายชำระหนี้จากใบรับสินค้า/ซื้อเชื่อ (RR) พร้อมลงบัญชี Auto-GL</p>
        </div>
        <button onClick={() => router.push('/ap/payment-vouchers')} className="btn-secondary text-sm">
          กลับหน้ารายการ
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-header bg-slate-50/70">
          <h2 className="text-base font-semibold text-slate-800">ข้อมูลการจ่ายชำระหนี้</h2>
        </div>

        <div className="card-body space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">วันที่จ่ายเงิน</label>
              <input
                type="date"
                value={pvDate}
                onChange={(e) => setPvDate(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">อ้างอิงใบรับสินค้า / บิลค้างจ่าย (RR)</label>
              <select
                value={rrId}
                onChange={(e) => handleSelectRr(e.target.value)}
                className="input"
              >
                <option value="">-- จ่ายชำระตรง (ไม่อ้างอิง RR) --</option>
                {unpaidRrs.map((rr) => (
                  <option key={rr.id} value={rr.id}>
                    {rr.rrNumber} — {rr.contactName} ({formatMoney(rr.totalAmount)} บ.)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">เลือกผู้ขาย / เจ้าหนี้</label>
              <select
                value={contactId}
                onChange={(e) => handleSelectVendor(e.target.value)}
                className="input"
                disabled={Boolean(rrId)}
              >
                <option value="">-- เลือกจากรายชื่อคู่ค้า --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">ชื่อผู้รับเงิน *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">วิธีชำระเงิน</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="input"
              >
                <option value="TRANSFER">โอนเงินธนาคาร</option>
                <option value="CASH">เงินสด</option>
                <option value="CHEQUE">เช็คจ่าย</option>
              </select>
            </div>

            {paymentMethod === 'CHEQUE' && (
              <div>
                <label className="label">เลขที่เช็ค</label>
                <input
                  type="text"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  className="input"
                  placeholder="ระบุเลขที่เช็ค"
                />
              </div>
            )}

            <div>
              <label className="label">ยอดหนี้ที่ชำระ (บาท) *</label>
              <input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input text-right font-semibold"
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="label">หักภาษี ณ ที่จ่าย (บาท)</label>
              <input
                type="number"
                value={whtAmount || ''}
                onChange={(e) => setWhtAmount(Number(e.target.value))}
                className="input text-right"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
            <span className="font-semibold text-slate-700">ยอดจ่ายเงินสุทธิ (Net Paid)</span>
            <span className="text-xl font-bold text-primary-700">{formatMoney(netPaid, true)}</span>
          </div>

          <div>
            <label className="label">หมายเหตุ</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[80px]"
            />
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
          <button
            type="button"
            onClick={() => router.push('/ap/payment-vouchers')}
            className="btn-ghost"
            disabled={submitting}
          >
            <X className="w-4 h-4" /> ยกเลิก
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            <Save className="w-4 h-4" />
            {submitting ? 'กำลังบันทึก...' : 'บันทึกใบสำคัญจ่าย'}
          </button>
        </div>
      </form>
    </div>
  );
}
