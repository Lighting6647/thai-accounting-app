'use client';

import { useState, useEffect } from 'react';
import { X, Printer, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { formatMoney, formatDateThai, getStatusLabel, getVatTypeLabel } from '@/lib/format';
import { toast } from 'sonner';
import CertificateInLieuModal from '@/components/ui/CertificateInLieuModal';

interface DocumentDetailModalProps {
  type: 'invoice' | 'expense';
  id: string | null;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export default function DocumentDetailModal({ type, id, onClose, onStatusChanged }: DocumentDetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const endpoint = type === 'invoice' ? `/api/invoices?id=${id}` : `/api/expenses?id=${id}`;
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to fetch details');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        toast.error('ไม่สามารถโหลดข้อมูลเอกสารได้');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, type]);

  if (!id) return null;

  const handleVoid = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกเอกสารนี้? ระบบจะสร้างรายการกลับบัญชี (Reversal Entry) ให้อัตโนมัติ')) {
      return;
    }

    setVoiding(true);
    try {
      const endpoint = type === 'invoice' ? '/api/invoices' : '/api/expenses';
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'VOID' }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to void document');
      }

      toast.success('ยกเลิกเอกสารเรียบร้อยแล้ว (สร้างรายการกลับบัญชีแล้ว)');
      onStatusChanged?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการยกเลิกเอกสาร');
    } finally {
      setVoiding(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const docNumber = data?.invoiceNumber || data?.expenseNumber || '';
  const docDate = data?.invoiceDate || data?.expenseDate;
  const statusInfo = getStatusLabel(data?.status || 'DRAFT');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                รายละเอียด{type === 'invoice' ? 'ใบแจ้งหนี้' : 'ค่าใช้จ่าย'}: {docNumber}
              </h2>
              <p className="text-xs text-gray-500">วันที่: {formatDateThai(docDate)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCertModal(true)}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                title="พิมพ์/ดูฟอร์มใบรับรองแทนใบเสร็จรับเงิน"
              >
                <FileText className="w-4 h-4 text-amber-600" /> ใบรับรองแทนใบเสร็จ
              </button>
              <button onClick={handlePrint} className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1">
                <Printer className="w-4 h-4" /> พิมพ์
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : !data ? (
            <div className="text-center py-12 text-red-500">ไม่พบข้อมูลเอกสาร</div>
          ) : (
            <>
              {/* Document Info Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg text-sm border">
                <div>
                  <span className="text-gray-500 block">ผู้ติดต่อ:</span>
                  <span className="font-semibold text-gray-900">{data.contact?.name || 'ทั่วไป'}</span>
                  {data.contact?.taxId && (
                    <span className="text-xs text-gray-500 block">เลขภาษี: {data.contact.taxId}</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 block">ประเภท VAT:</span>
                  <span className="font-medium text-gray-900">{getVatTypeLabel(data.vatType)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">สถานะ:</span>
                  <span className={statusInfo.className}>{statusInfo.label}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-bold text-gray-800 mb-2">รายการสินค้า/บริการ</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="table w-full">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500">
                        <th className="px-4 py-2">รายละเอียด</th>
                        <th className="px-4 py-2 text-center w-24">จำนวน</th>
                        <th className="px-4 py-2 text-right w-32">ราคา/หน่วย</th>
                        <th className="px-4 py-2 text-right w-36">รวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {data.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2.5">{item.description}</td>
                          <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right">{formatMoney(item.unitPrice)}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{formatMoney(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-72 bg-gray-50 p-4 rounded-lg border space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ฐานภาษี (Subtotal):</span>
                    <span>{formatMoney(data.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT ({data.vatRate}%):</span>
                    <span>{formatMoney(data.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>ยอดรวม (Total):</span>
                    <span>{formatMoney(data.totalAmount)}</span>
                  </div>
                  {data.whtAmount > 0 && (
                    <div className="flex justify-between text-red-600 text-xs">
                      <span>หัก ณ ที่จ่าย ({data.whtRate}%):</span>
                      <span>-{formatMoney(data.whtAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-1 text-primary-700">
                    <span>ยอดรับ/จ่ายสุทธิ:</span>
                    <span>{formatMoney(data.netAmount || data.netPayment)}</span>
                  </div>
                </div>
              </div>

              {/* Attachment Preview */}
              {data.attachmentUrl && (
                <div className="border-t pt-4">
                  <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-600" /> เอกสารแนบ / หลักฐานชำระเงิน
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    {data.attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 font-bold text-xs">
                          PDF
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {data.attachmentUrl.split('/').pop()}
                          </p>
                          <a
                            href={data.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-600 hover:underline font-semibold"
                          >
                            เปิดดู / ดาวน์โหลดเอกสาร PDF
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="max-h-64 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <img
                            src={data.attachmentUrl}
                            alt="Receipt Attachment"
                            className="max-h-64 object-contain mx-auto"
                          />
                        </div>
                        <div className="text-right">
                          <a
                            href={data.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-600 hover:underline font-semibold"
                          >
                            เปิดรูปภาพขนาดเต็ม ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Linked Journal Entry */}
              {data.journalEntry && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-gray-800">
                      บันทึกในสมุดรายวัน ({data.journalEntry.entryNumber})
                    </h3>
                  </div>
                  <div className="border rounded-lg overflow-hidden bg-slate-50">
                    <table className="table w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-gray-600">
                          <th className="px-3 py-2">รหัสบัญชี</th>
                          <th className="px-3 py-2">ชื่อบัญชี</th>
                          <th className="px-3 py-2 text-right">เดบิต (Dr)</th>
                          <th className="px-3 py-2 text-right">เครดิต (Cr)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.journalEntry.lines?.map((line: any) => (
                          <tr key={line.id}>
                            <td className="px-3 py-2 font-mono text-gray-500">{line.account?.code}</td>
                            <td className="px-3 py-2">{line.account?.nameTh}</td>
                            <td className="px-3 py-2 text-right font-medium">
                              {line.debitAmount > 0 ? formatMoney(line.debitAmount) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {line.creditAmount > 0 ? formatMoney(line.creditAmount) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          {data?.status !== 'VOIDED' ? (
            <button
              onClick={handleVoid}
              disabled={voiding || loading}
              className="btn-danger text-sm py-2 px-3 flex items-center gap-1"
            >
              <AlertTriangle className="w-4 h-4" />
              {voiding ? 'กำลังยกเลิก...' : 'ยกเลิกเอกสาร (VOID)'}
            </button>
          ) : (
            <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> เอกสารนี้ถูกยกเลิกแล้ว (มีรายการกลับบัญชี)
            </span>
          )}

          <button onClick={onClose} className="btn-secondary text-sm">
            ปิด
          </button>
        </div>
      </div>
    </div>

    <CertificateInLieuModal
      isOpen={showCertModal}
      onClose={() => setShowCertModal(false)}
      data={data ? {
        docNumber,
        docDate,
        contactName: data.contact?.name,
        payerName: data.contact?.name || 'พนักงาน / ผู้ขอเบิก',
        amount: data.netAmount || data.netPayment || data.totalAmount || data.amount || 0,
        items: data.items,
        notes: data.notes,
        attachmentUrl: data.attachmentUrl
      } : null}
    />
  </>
);
}
