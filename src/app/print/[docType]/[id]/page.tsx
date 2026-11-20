'use client';

import { useState, useEffect } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import {
  formatMoney,
  formatDateThai,
  getVatTypeLabel,
  getPaymentMethodLabel,
  arabicToThaiBaht,
} from '@/lib/format';

const DOC_META: Record<string, { api: string; titleTh: string; titleEn: string }> = {
  po: { api: '/api/ap/purchase-orders', titleTh: 'ใบสั่งซื้อสินค้า', titleEn: 'PURCHASE ORDER' },
  rr: { api: '/api/ap/goods-receipts', titleTh: 'ใบรับสินค้า / ใบตั้งเจ้าหนี้', titleEn: 'GOODS RECEIPT / AP BILL' },
  pv: { api: '/api/ap/payment-vouchers', titleTh: 'ใบสำคัญจ่าย', titleEn: 'PAYMENT VOUCHER' },
  qt: { api: '/api/ar/quotations', titleTh: 'ใบเสนอราคา', titleEn: 'QUOTATION' },
  so: { api: '/api/ar/sales-orders', titleTh: 'ใบสั่งขาย', titleEn: 'SALES ORDER' },
  iv: { api: '/api/invoices', titleTh: 'ใบแจ้งหนี้ / ใบกำกับภาษี', titleEn: 'INVOICE / TAX INVOICE' },
  re: { api: '/api/receipts', titleTh: 'ใบเสร็จรับเงิน', titleEn: 'OFFICIAL RECEIPT' },
  aj: { api: '/api/ic/adjustments', titleTh: 'ใบปรับปรุงสินค้าคงคลัง', titleEn: 'STOCK ADJUSTMENT' },
};

export default function StandardThaiPrintPage({
  params,
}: {
  params: { docType: string; id: string };
}) {
  const docType = (params.docType || '').toLowerCase();
  const meta = DOC_META[docType];

  const [doc, setDoc] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!meta) {
        setLoading(false);
        return;
      }
      try {
        const [dRes, cRes] = await Promise.all([
          fetch(`${meta.api}?id=${encodeURIComponent(params.id)}`),
          fetch('/api/company'),
        ]);
        if (dRes.ok) setDoc(await dRes.json());
        if (cRes.ok) setCompany(await cRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [docType, meta, params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังจัดเตรียมแบบฟอร์มเอกสาร...
      </div>
    );
  }

  if (!meta || !doc) {
    return <div className="p-10 text-center text-red-600">ไม่พบข้อมูลเอกสารสำหรับพิมพ์</div>;
  }

  const docNumber =
    doc.poNumber ||
    doc.rrNumber ||
    doc.pvNumber ||
    doc.qtNumber ||
    doc.soNumber ||
    doc.invoiceNumber ||
    doc.receiptNumber ||
    doc.adjustNumber ||
    '-';

  const docDate =
    doc.poDate ||
    doc.rrDate ||
    doc.pvDate ||
    doc.qtDate ||
    doc.soDate ||
    doc.invoiceDate ||
    doc.receiptDate ||
    doc.adjustDate;

  const secondaryDate = doc.dueDate || doc.validUntil || doc.expectedDate || doc.deliveryDate;
  const secondaryLabel =
    docType === 'qt'
      ? 'ยืนยันราคาถึงวันที่'
      : docType === 'po'
        ? 'กำหนดส่งมอบ'
        : docType === 'so'
          ? 'กำหนดจัดส่ง'
          : 'ครบกำหนดชำระ';

  const contact = doc.contact || doc.invoice?.contact || null;
  const contactName = contact?.name || doc.contactName || 'ทั่วไป';
  const items = doc.items || doc.invoice?.items || [];

  const grandTotal =
    docType === 'pv'
      ? doc.netPaid
      : docType === 're'
        ? doc.amount
        : docType === 'aj'
          ? doc.totalValue
          : doc.netAmount || doc.totalAmount || 0;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-black min-h-screen font-sans">
      <div className="no-print flex justify-between items-center mb-6 pb-4 border-b">
        <span className="text-xs text-slate-500">แบบฟอร์มเอกสารมาตรฐานบัญชีไทย (A4)</span>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 text-sm"
        >
          <Printer className="w-4 h-4" /> สั่งพิมพ์เอกสาร (Print)
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div className="space-y-0.5 max-w-md">
          <h1 className="text-xl font-bold">{company?.name || 'บริษัท ตัวอย่าง จำกัด'}</h1>
          <p className="text-xs text-gray-700">{company?.address || '-'}</p>
          <p className="text-xs text-gray-700">
            เลขประจำตัวผู้เสียภาษี: {company?.taxId || '-'} (สาขา {company?.branchCode || '00000'})
          </p>
          <p className="text-xs text-gray-700">
            โทร: {company?.phone || '-'} | อีเมล: {company?.email || '-'}
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-indigo-950">{meta.titleTh}</h2>
          <p className="text-xs font-semibold tracking-wider text-gray-600">{meta.titleEn}</p>
          <p className="text-sm font-mono mt-2 font-bold">เลขที่: {docNumber}</p>
          <p className="text-xs">วันที่: {formatDateThai(docDate)}</p>
          {secondaryDate && (
            <p className="text-xs">
              {secondaryLabel}: {formatDateThai(secondaryDate)}
            </p>
          )}
        </div>
      </div>

      {/* Contact / Warehouse Box */}
      <div className="border border-gray-400 p-4 rounded mb-6 text-xs grid grid-cols-2 gap-4">
        <div>
          <p className="font-bold text-gray-700">
            {docType === 'aj' ? 'คลังสินค้า:' : docType === 'po' || docType === 'rr' || docType === 'pv' ? 'ผู้ขาย / เจ้าหนี้:' : 'ลูกค้า / ผู้จ่ายเงิน:'}
          </p>
          <p className="font-semibold text-sm mt-1">
            {docType === 'aj' ? doc.warehouse?.name || '-' : contactName}
          </p>
          {contact?.address && <p className="text-gray-600 mt-0.5">{contact.address}</p>}
          {contact?.phone && <p className="text-gray-600">โทร: {contact.phone}</p>}
        </div>
        <div className="text-right space-y-0.5">
          {contact && (
            <>
              <p className="text-gray-700">เลขประจำตัวผู้เสียภาษี: {contact.taxId || '-'}</p>
              <p className="text-gray-700">สาขา: {contact.branchCode || '00000'}</p>
            </>
          )}
          {doc.vatType && <p className="text-gray-700">ประเภท VAT: {getVatTypeLabel(doc.vatType)}</p>}
          {doc.paymentMethod && (
            <p className="text-gray-700">วิธีชำระเงิน: {getPaymentMethodLabel(doc.paymentMethod)}</p>
          )}
          {doc.vendorInvoiceNo && (
            <p className="text-gray-700">อ้างอิงบิลผู้ขาย: {doc.vendorInvoiceNo}</p>
          )}
          {(doc.po?.poNumber || doc.qt?.qtNumber || doc.rr?.rrNumber || doc.invoice?.invoiceNumber) && (
            <p className="text-gray-700 font-semibold">
              อ้างอิงเอกสาร: {doc.po?.poNumber || doc.qt?.qtNumber || doc.rr?.rrNumber || doc.invoice?.invoiceNumber}
            </p>
          )}
        </div>
      </div>

      {/* Table of Items or Payment Voucher Box */}
      {items.length > 0 ? (
        <table className="w-full text-xs border-collapse mb-6">
          <thead>
            <tr className="border-y-2 border-black bg-gray-100">
              <th className="py-2 px-2 text-center w-12">ลำดับ</th>
              <th className="py-2 px-2 text-left">รายการสินค้า / บริการ</th>
              <th className="py-2 px-2 text-center w-20">จำนวน</th>
              <th className="py-2 px-2 text-right w-28">ราคา/หน่วย</th>
              <th className="py-2 px-2 text-right w-24">ส่วนลด</th>
              <th className="py-2 px-2 text-right w-32">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody className="divide-y border-b border-black">
            {items.map((item: any, idx: number) => (
              <tr key={item.id || idx}>
                <td className="py-2 px-2 text-center">{idx + 1}</td>
                <td className="py-2 px-2">{item.description || item.product?.name || '-'}</td>
                <td className="py-2 px-2 text-center">{item.quantity}</td>
                <td className="py-2 px-2 text-right">{formatMoney(item.unitPrice ?? item.unitCost ?? 0)}</td>
                <td className="py-2 px-2 text-right">{item.discount ? formatMoney(item.discount) : '-'}</td>
                <td className="py-2 px-2 text-right font-medium">
                  {formatMoney(item.amount ?? item.totalCost ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="border border-gray-400 rounded p-4 mb-6 text-xs space-y-2">
          <div className="flex justify-between font-semibold">
            <span>รายการชำระเงิน / รับชำระเงิน:</span>
            <span>{formatMoney(doc.amount || grandTotal)} บาท</span>
          </div>
          {doc.chequeNumber && <p className="text-gray-600">เลขที่เช็ค: {doc.chequeNumber}</p>}
        </div>
      )}

      {/* Summary & Thai Baht Text */}
      <div className="flex justify-between items-start text-xs mb-10 gap-6">
        <div className="flex-1 space-y-3">
          <div className="p-2.5 bg-gray-100 border border-gray-300 rounded font-semibold">
            จำนวนเงินตัวอักษร: ({arabicToThaiBaht(grandTotal)})
          </div>
          <div className="p-2.5 border border-gray-300 rounded min-h-[56px]">
            <span className="font-semibold text-gray-700">หมายเหตุ: </span>
            <span>{doc.notes || doc.reason || '-'}</span>
          </div>
        </div>

        <div className="w-72 space-y-1.5 text-right border border-gray-300 p-3 rounded">
          {docType !== 'pv' && docType !== 're' && docType !== 'aj' ? (
            <>
              {doc.discountAmount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>ส่วนลดท้ายบิล:</span>
                  <span>-{formatMoney(doc.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>ราคาก่อน VAT (Subtotal):</span>
                <span>{formatMoney(doc.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>ภาษีมูลค่าเพิ่ม VAT {doc.vatRate}%:</span>
                <span>{formatMoney(doc.vatAmount)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-black pt-1">
                <span>จำนวนเงินรวมทั้งสิ้น:</span>
                <span>{formatMoney(doc.totalAmount)}</span>
              </div>
              {doc.whtAmount > 0 && (
                <div className="flex justify-between text-red-700">
                  <span>หัก ณ ที่จ่าย ({doc.whtRate}%):</span>
                  <span>-{formatMoney(doc.whtAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t-2 border-black pt-1 text-indigo-950">
                <span>ยอดสุทธิ:</span>
                <span>{formatMoney(grandTotal)}</span>
              </div>
            </>
          ) : (
            <>
              {doc.whtAmount > 0 && (
                <div className="flex justify-between text-red-700">
                  <span>หัก ณ ที่จ่าย:</span>
                  <span>-{formatMoney(doc.whtAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-indigo-950">
                <span>ยอดสุทธิ:</span>
                <span>{formatMoney(grandTotal)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-6 text-center text-xs pt-8 border-t border-dashed border-gray-400">
        <div className="space-y-10">
          <p>ผู้จัดทำ / Prepared By</p>
          <p>วันที่ ...../...../..........</p>
        </div>
        <div className="space-y-10">
          <p>ผู้อนุมัติ / Authorized By</p>
          <p>วันที่ ...../...../..........</p>
        </div>
        <div className="space-y-10">
          <p>ผู้รับสินค้า/รับเงิน / Received By</p>
          <p>วันที่ ...../...../..........</p>
        </div>
      </div>
    </div>
  );
}
