'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Printer, AlertTriangle, CheckCircle, ArrowRight, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getStatusLabel, getVatTypeLabel } from '@/lib/format';

export type ExpressModalDocType = 'po' | 'rr' | 'pv' | 'qt' | 'so' | 'aj';

interface ExpressDetailModalProps {
  docType: ExpressModalDocType;
  id: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

const API_MAP: Record<ExpressModalDocType, { endpoint: string; title: string; nextStep?: { label: string; href: (id: string) => string; eligibleStatuses: string[] } }> = {
  po: {
    endpoint: '/api/ap/purchase-orders',
    title: 'ใบสั่งซื้อ (PO)',
    nextStep: {
      label: 'รับสินค้าเข้าคลัง (สร้าง RR)',
      href: (id) => `/ap/goods-receipts/new?sourceId=${id}`,
      eligibleStatuses: ['DRAFT', 'APPROVED'],
    },
  },
  rr: {
    endpoint: '/api/ap/goods-receipts',
    title: 'ใบรับสินค้า / ซื้อเชื่อ (RR)',
    nextStep: {
      label: 'จ่ายชำระหนี้ (สร้าง PV)',
      href: (id) => `/ap/payment-vouchers/new?rrId=${id}`,
      eligibleStatuses: ['UNPAID'],
    },
  },
  pv: {
    endpoint: '/api/ap/payment-vouchers',
    title: 'ใบสำคัญจ่ายชำระหนี้ (PV)',
  },
  qt: {
    endpoint: '/api/ar/quotations',
    title: 'ใบเสนอราคา (QT)',
    nextStep: {
      label: 'เปิดใบสั่งขาย (สร้าง SO)',
      href: (id) => `/ar/sales-orders/new?sourceId=${id}`,
      eligibleStatuses: ['DRAFT', 'APPROVED'],
    },
  },
  so: {
    endpoint: '/api/ar/sales-orders',
    title: 'ใบสั่งขาย (SO)',
    nextStep: {
      label: 'ออกใบแจ้งหนี้/ตัดสต็อก (สร้าง IV)',
      href: (id) => `/income/invoices/new?sourceId=${id}`,
      eligibleStatuses: ['DRAFT', 'APPROVED'],
    },
  },
  aj: {
    endpoint: '/api/ic/adjustments',
    title: 'ใบปรับปรุงสต็อก (AJ)',
  },
};

export default function ExpressDetailModal({
  docType,
  id,
  onClose,
  onChanged,
}: ExpressDetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const meta = API_MAP[docType];

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${meta.endpoint}?id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error('ไม่พบเอกสาร');
        return res.json();
      })
      .then((json) => setData(json))
      .catch(() => toast.error('ไม่สามารถโหลดข้อมูลเอกสารได้'))
      .finally(() => setLoading(false));
  }, [id, meta.endpoint]);

  if (!id) return null;

  const docNumber =
    data?.poNumber ||
    data?.rrNumber ||
    data?.pvNumber ||
    data?.qtNumber ||
    data?.soNumber ||
    data?.adjustNumber ||
    '';

  const docDate =
    data?.poDate ||
    data?.rrDate ||
    data?.pvDate ||
    data?.qtDate ||
    data?.soDate ||
    data?.adjustDate;

  const statusInfo = getStatusLabel(data?.status || 'DRAFT');

  const handleAction = async (action: 'APPROVE' | 'VOID') => {
    if (action === 'VOID') {
      if (!confirm(`ยืนยันการยกเลิกเอกสาร ${docNumber}?`)) return;
    }
    setProcessing(true);
    try {
      const res = await fetch(meta.endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'ดำเนินการไม่สำเร็จ');
      toast.success(action === 'APPROVE' ? 'อนุมัติเอกสารเรียบร้อย' : 'ยกเลิกเอกสารเรียบร้อย');
      onChanged?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {meta.title}: {docNumber}
            </h2>
            <p className="text-xs text-slate-500">วันที่เอกสาร: {formatDateThai(docDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/print/${docType}/${id}`}
              target="_blank"
              className="btn-secondary text-xs px-3 py-1.5"
            >
              <Printer className="w-4 h-4" /> พิมพ์ฟอร์มไทย
            </Link>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลด...
            </div>
          ) : !data ? (
            <div className="text-center py-12 text-red-500">ไม่พบข้อมูลเอกสาร</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl text-sm border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-xs">
                    {docType === 'aj' ? 'คลังสินค้า:' : 'คู่ค้า / ลูกค้า:'}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {docType === 'aj'
                      ? data.warehouse?.name || '-'
                      : data.contact?.name || data.contactName || '-'}
                  </span>
                  {data.warehouse?.name && docType !== 'aj' && (
                    <span className="text-xs text-slate-500 block mt-0.5">
                      คลัง: {data.warehouse.name}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">รายละเอียดเพิ่มเติม:</span>
                  <span className="font-medium text-slate-900">
                    {data.vatType ? getVatTypeLabel(data.vatType) : data.adjustType || data.paymentMethod || '-'}
                  </span>
                  {data.vendorInvoiceNo && (
                    <span className="text-xs text-slate-500 block mt-0.5">
                      ใบกำกับผู้ขาย: {data.vendorInvoiceNo}
                    </span>
                  )}
                  {(data.po?.poNumber || data.qt?.qtNumber || data.rr?.rrNumber) && (
                    <span className="text-xs text-indigo-600 block mt-0.5 font-medium">
                      อ้างอิง: {data.po?.poNumber || data.qt?.qtNumber || data.rr?.rrNumber}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-xs mb-1">สถานะเอกสาร:</span>
                  <span className={statusInfo.className}>{statusInfo.label}</span>
                </div>
              </div>

              {Array.isArray(data.items) && data.items.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  <table className="table w-full">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500">
                        <th className="px-4 py-2.5">รายการ</th>
                        <th className="px-4 py-2.5 text-center w-24">จำนวน</th>
                        <th className="px-4 py-2.5 text-right w-32">ราคา/หน่วย</th>
                        <th className="px-4 py-2.5 text-right w-24">ส่วนลด</th>
                        <th className="px-4 py-2.5 text-right w-32">รวมเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {data.items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2.5">
                            {item.description || item.product?.name || '-'}
                          </td>
                          <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right">
                            {formatMoney(item.unitPrice ?? item.unitCost ?? 0)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-500">
                            {item.discount ? formatMoney(item.discount) : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">
                            {formatMoney(item.amount ?? item.totalCost ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Financial Summary */}
              <div className="flex justify-end">
                <div className="w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                  {docType === 'pv' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">ยอดหนี้ที่ชำระ:</span>
                        <span>{formatMoney(data.amount)}</span>
                      </div>
                      {data.whtAmount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>หัก ณ ที่จ่าย:</span>
                          <span>-{formatMoney(data.whtAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base border-t pt-2 text-primary-700">
                        <span>ยอดจ่ายสุทธิ:</span>
                        <span>{formatMoney(data.netPaid)}</span>
                      </div>
                    </>
                  ) : docType === 'aj' ? (
                    <div className="flex justify-between font-bold text-base text-primary-700">
                      <span>มูลค่าปรับปรุงรวม:</span>
                      <span>{formatMoney(data.totalValue)}</span>
                    </div>
                  ) : (
                    <>
                      {data.discountAmount > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <span>ส่วนลดท้ายบิล:</span>
                          <span>-{formatMoney(data.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-600">ฐานภาษี (Subtotal):</span>
                        <span>{formatMoney(data.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">VAT ({data.vatRate}%):</span>
                        <span>{formatMoney(data.vatAmount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t pt-2 text-primary-700">
                        <span>ยอดรวมสุทธิ:</span>
                        <span>{formatMoney(data.netAmount || data.totalAmount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Linked Auto-GL Journal Entry */}
              {data.journalEntry && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800 text-sm">
                      ลงบัญชีอัตโนมัติ Auto-GL ({data.journalEntry.entryNumber})
                    </h3>
                  </div>
                  <div className="border rounded-xl overflow-hidden bg-slate-50">
                    <table className="table w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600">
                          <th className="px-3 py-2">รหัสบัญชี</th>
                          <th className="px-3 py-2">ชื่อบัญชี</th>
                          <th className="px-3 py-2 text-right">เดบิต (Dr)</th>
                          <th className="px-3 py-2 text-right">เครดิต (Cr)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.journalEntry.lines?.map((line: any) => (
                          <tr key={line.id}>
                            <td className="px-3 py-2 font-mono text-slate-500">{line.account?.code}</td>
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
        <div className="px-6 py-4 border-t bg-slate-50 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            {data && docType !== 'aj' && data.status !== 'VOIDED' && (
              <button
                onClick={() => handleAction('VOID')}
                disabled={processing || loading}
                className="btn-danger text-xs py-2 px-3"
              >
                <AlertTriangle className="w-4 h-4" /> ยกเลิกเอกสาร
              </button>
            )}
            {data && (docType === 'po' || docType === 'qt' || docType === 'so') && data.status === 'DRAFT' && (
              <button
                onClick={() => handleAction('APPROVE')}
                disabled={processing || loading}
                className="btn-primary text-xs py-2 px-3"
              >
                <CheckCircle className="w-4 h-4" /> อนุมัติเอกสาร
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {data && meta.nextStep && meta.nextStep.eligibleStatuses.includes(data.status) && (
              <Link
                href={meta.nextStep.href(id)}
                className="btn-primary text-xs py-2 px-3"
              >
                {meta.nextStep.label} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
