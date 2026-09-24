'use client';

import { useState, useEffect } from 'react';
import { formatMoney, formatDateThai, getVatTypeLabel } from '@/lib/format';

export default function InvoicePrintPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/invoices?id=${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [params.id]);

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดเอกสาร...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">ไม่พบเอกสารใบแจ้งหนี้</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-black min-h-screen font-sans">
      <div className="no-print flex justify-end gap-2 mb-6">
        <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700">
          🖨️ สั่งพิมพ์เอกสาร (Print)
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">บริษัท ตัวอย่าง จำกัด</h1>
          <p className="text-sm">123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110</p>
          <p className="text-sm">เลขประจำตัวผู้เสียภาษี: 0105500000001 (สำนักงานใหญ่)</p>
          <p className="text-sm">โทร: 02-123-4567 | อีเมล: info@example.co.th</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-indigo-900 uppercase tracking-wide">ใบแจ้งหนี้ / ใบกำกับภาษี</h2>
          <p className="text-sm font-semibold mt-1">INVOICE / TAX INVOICE</p>
          <p className="text-sm font-mono mt-2 font-bold">เลขที่: {data.invoiceNumber}</p>
          <p className="text-sm">วันที่: {formatDateThai(data.invoiceDate)}</p>
          <p className="text-sm">ครบกำหนด: {formatDateThai(data.dueDate)}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="border p-4 rounded mb-6 text-sm grid grid-cols-2 gap-4">
        <div>
          <p className="font-bold text-gray-700">ชื่อและที่อยู่ลูกค้า:</p>
          <p className="font-semibold text-base mt-1">{data.contact?.name || 'ทั่วไป'}</p>
          <p className="text-gray-600">{data.contact?.address || '-'}</p>
          <p className="text-gray-600">โทร: {data.contact?.phone || '-'}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-600">เลขประจำตัวผู้เสียภาษี: {data.contact?.taxId || '-'}</p>
          <p className="text-gray-600">สาขา: {data.contact?.branchCode || '00000'}</p>
          <p className="text-gray-600">ประเภท VAT: {getVatTypeLabel(data.vatType)}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm border-collapse mb-6">
        <thead>
          <tr className="border-y-2 border-black bg-gray-100">
            <th className="py-2 text-center w-12">ลำดับ</th>
            <th className="py-2 text-left">รายการสินค้า / บริการ</th>
            <th className="py-2 text-center w-20">จำนวน</th>
            <th className="py-2 text-right w-28">ราคา/หน่วย</th>
            <th className="py-2 text-right w-32">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody className="divide-y border-b border-black">
          {data.items?.map((item: any, idx: number) => (
            <tr key={item.id}>
              <td className="py-2 text-center">{idx + 1}</td>
              <td className="py-2">{item.description}</td>
              <td className="py-2 text-center">{item.quantity}</td>
              <td className="py-2 text-right">{formatMoney(item.unitPrice)}</td>
              <td className="py-2 text-right font-medium">{formatMoney(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-between items-start text-sm mb-12">
        <div className="w-1/2 p-3 bg-gray-50 border rounded">
          <p className="font-semibold text-gray-700">หมายเหตุ:</p>
          <p className="text-gray-600 mt-1">{data.notes || 'กรุณาชำระเงินภายในวันครบกำหนด'}</p>
        </div>
        <div className="w-72 space-y-1.5 text-right font-sans">
          <div className="flex justify-between">
            <span className="text-gray-600">ราคาก่อน VAT (Subtotal):</span>
            <span>{formatMoney(data.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ภาษีมูลค่าเพิ่ม VAT {data.vatRate}%:</span>
            <span>{formatMoney(data.vatAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-black pt-1">
            <span>จำนวนเงินรวมทั้งสิ้น:</span>
            <span>{formatMoney(data.totalAmount)}</span>
          </div>
          {data.whtAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>หัก ณ ที่จ่าย ({data.whtRate}%):</span>
              <span>-{formatMoney(data.whtAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-1 text-indigo-900">
            <span>ยอดชำระสุทธิ:</span>
            <span>{formatMoney(data.netAmount)}</span>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-2 gap-8 text-center text-sm pt-8 border-t border-dashed border-gray-300">
        <div className="space-y-12">
          <p>ผู้รับใบแจ้งหนี้ / Customer Received</p>
          <p>วันที่ ...../...../..........</p>
        </div>
        <div className="space-y-12">
          <p>ผู้ออกใบแจ้งหนี้ / Authorized Signature</p>
          <p>วันที่ ...../...../..........</p>
        </div>
      </div>
    </div>
  );
}
