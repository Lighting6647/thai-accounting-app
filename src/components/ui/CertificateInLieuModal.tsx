'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, CheckCircle, Sparkles } from 'lucide-react';
import { formatMoney, formatDateThai, arabicToThaiBaht } from '@/lib/format';

interface CertificateItem {
  date?: string;
  description: string;
  amount: number;
  notes?: string;
}

interface CertificateInLieuModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    docNumber?: string;
    docDate?: string | Date;
    companyName?: string;
    companyAddress?: string;
    contactName?: string;
    payerName?: string;
    position?: string;
    amount: number;
    description?: string;
    items?: CertificateItem[];
    notes?: string;
    attachmentUrl?: string | null;
  } | null;
}

export default function CertificateInLieuModal({ isOpen, onClose, data }: CertificateInLieuModalProps) {
  const [companyInfo, setCompanyInfo] = useState<{ name: string; address?: string }>({
    name: 'บริษัท เฟิร์น เอสเธติก จำกัด',
    address: '616/16 หมู่บ้าน เดอะ พาร์ค อารียา ถนนลาดปลาเค้า แขวงจรเข้บัว เขตลาดพร้าว',
  });

  const [claimantName, setClaimantName] = useState('พนักงานผู้จ่ายเงิน');
  const [position, setPosition] = useState('พนักงานประจำ');
  const [approverName, setApproverName] = useState('สุภาพ แสนจันทร์');

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch('/api/company');
        if (res.ok) {
          const json = await res.json();
          if (json?.name) {
            setCompanyInfo({
              name: json.name || 'บริษัท เฟิร์น เอสเธติก จำกัด',
              address: json.address || '616/16 หมู่บ้าน เดอะ พาร์ค อารียา ถนนลาดปลาเค้า แขวงจรเข้บัว เขตลาดพร้าว',
            });
          }
        }
      } catch (err) {
        // Fallback
      }
    };
    fetchCompany();
  }, []);

  useEffect(() => {
    if (data?.payerName || data?.contactName) {
      setClaimantName(data.payerName || data.contactName || 'พนักงานผู้จ่ายเงิน');
    }
  }, [data]);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const docDateStr = formatDateThai(data.docDate || new Date());
  const totalAmount = data.amount || 0;

  // Build items array matching user format
  const itemList: CertificateItem[] =
    data.items && data.items.length > 0
      ? data.items.map((it) => ({
          date: it.date || docDateStr,
          description: it.description,
          amount: it.amount,
          notes: it.notes || '',
        }))
      : [
          {
            date: docDateStr,
            description: data.description || data.notes || 'ค่าใช้จ่ายในการดำเนินงาน',
            amount: totalAmount,
            notes: '',
          },
        ];

  // Grid padding rows up to 12 rows like Excel template
  const MIN_ROWS = 12;
  const paddingRowsCount = Math.max(0, MIN_ROWS - itemList.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden">
        {/* Modal Toolbar (Hidden on Print) */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-emerald-950 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">ฟอร์มใบรับรองแทนใบเสร็จรับเงิน (ตามรูปแบบมาตรฐานบริษัท)</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <Printer className="w-4 h-4" /> พิมพ์แบบฟอร์ม
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Excel-Style Document Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200 print:p-0 print:bg-white print:overflow-visible">
          <div className="max-w-3xl mx-auto bg-white border border-slate-300 shadow-xl print:shadow-none print:border-none p-6 text-slate-900 text-xs font-sans">
            
            {/* Top Green Notification Bar */}
            <div className="bg-emerald-400 border border-emerald-500 text-slate-900 font-semibold text-center p-2 rounded-sm text-[11px] leading-tight mb-4">
              ใช้ในกรณี กิจการจ่ายเงินค่าซื้อสินค้าหรือบริการเบ็ดเตล็ด แต่ไม่สามารถเรียกใบเสร็จรับเงินจากผู้ขายหรือผู้ให้บริการได้ ต้องให้พนักงานของกิจการเป็นผู้รับรองการจ่ายเงินดังกล่าว
            </div>

            {/* Document Title */}
            <h1 className="text-lg font-bold text-center my-3 tracking-wide text-slate-900">
              ใบรับรองแทนใบเสร็จรับเงิน
            </h1>

            {/* Company & Buyer Banner */}
            <div className="bg-emerald-100/70 border border-emerald-300 p-2 text-xs font-bold text-slate-900 mb-2 flex justify-between items-center">
              <div>
                <span className="text-slate-700">บจ. / หจก.</span> &nbsp;&nbsp; {companyInfo.name}
              </div>
              <div className="text-slate-600 text-[11px] font-normal">(ผู้ซื้อ/ผู้รับบริการ)</div>
            </div>

            <div className="text-[11px] text-slate-700 mb-3 px-1">
              {companyInfo.address}
            </div>

            {/* Items Table (Green Header & Excel Grid Lines) */}
            <div className="border border-slate-800 mb-2">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-500 text-slate-950 font-bold border-b border-slate-800 text-center">
                    <th className="p-2 border-r border-slate-800 w-24">วัน เดือน ปี</th>
                    <th className="p-2 border-r border-slate-800">รายละเอียด</th>
                    <th className="p-2 border-r border-slate-800 w-28 text-right">จำนวนเงิน</th>
                    <th className="p-2 w-24">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {itemList.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-300 text-slate-900 h-8">
                      <td className="p-1.5 text-center border-r border-slate-300 whitespace-nowrap">{item.date}</td>
                      <td className="p-1.5 border-r border-slate-300 font-medium px-3">{item.description}</td>
                      <td className="p-1.5 text-right border-r border-slate-300 font-mono font-bold px-3">{formatMoney(item.amount)}</td>
                      <td className="p-1.5 text-center text-slate-600 px-2">{item.notes}</td>
                    </tr>
                  ))}

                  {/* Empty Grid Rows to match Excel height */}
                  {Array.from({ length: paddingRowsCount }).map((_, i) => (
                    <tr key={'pad-' + i} className="border-b border-slate-200 h-8">
                      <td className="border-r border-slate-300"></td>
                      <td className="border-r border-slate-300"></td>
                      <td className="border-r border-slate-300"></td>
                      <td></td>
                    </tr>
                  ))}

                  {/* Total Summary Row (Grey Header) */}
                  <tr className="bg-slate-200 border-t-2 border-slate-800 font-bold text-slate-900 h-9">
                    <td colSpan={2} className="p-2 text-center border-r border-slate-800 text-sm">
                      จำนวนเงินรวมทั้งสิ้น
                    </td>
                    <td className="p-2 text-right border-r border-slate-800 font-mono text-sm px-3 bg-slate-300">
                      {formatMoney(totalAmount)}
                    </td>
                    <td className="p-2 bg-slate-200"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Declaration Text Section */}
            <div className="space-y-2 mt-4 px-2 text-[12px] leading-relaxed text-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <span>ข้าพเจ้า</span>
                <input
                  type="text"
                  value={claimantName}
                  onChange={(e) => setClaimantName(e.target.value)}
                  className="font-bold border-b border-slate-400 bg-transparent px-2 text-center min-w-[200px] outline-none print:border-none"
                />
                <span>(ผู้เบิก) ตำแหน่ง</span>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="font-semibold border-b border-slate-400 bg-transparent px-2 text-center min-w-[150px] outline-none print:border-none"
                />
              </div>

              <p className="pl-6">
                ขอรับรองว่า รายจ่ายข้างต้นนี้ไม่อาจเรียกเก็บใบเสร็จรับเงินจากผู้รับได้ และข้าพเจ้าได้จ่ายไปในงานของทาง
              </p>
              <p className="pl-6 font-semibold">
                {companyInfo.name} โดยแท้
              </p>
            </div>

            {/* Bottom Remarks & Signatures Layout (Matching Excel) */}
            <div className="grid grid-cols-12 gap-2 mt-8 pt-4 text-[11px] text-slate-800">
              
              {/* Left Column: Remarks & Checkboxes */}
              <div className="col-span-5 space-y-2">
                <p className="font-bold">หมายเหตุ</p>
                <p className="font-semibold pl-2">เอกสารแนบใบแทนใบเสร็จรับเงิน</p>
                <div className="pl-4 space-y-1 text-slate-700">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded border-slate-400 text-emerald-600" />
                    <span>1. บิลเงินสด</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded border-slate-400 text-emerald-600" />
                    <span>2. สลิปการโอนเงิน</span>
                  </label>
                </div>
              </div>

              {/* Right Column: Signatures */}
              <div className="col-span-7 space-y-5 text-right font-medium pr-4">
                <div className="flex items-center justify-end gap-3">
                  <span>ลงชื่อ</span>
                  <span className="border-b border-dotted border-slate-400 w-48 inline-block text-center text-slate-400">...................................................</span>
                  <span className="w-16 text-left">(ผู้รับเงิน)</span>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <span>ลงชื่อ</span>
                  <span className="border-b border-slate-400 font-bold text-slate-900 px-4 min-w-[180px] text-center inline-block">
                    {approverName || claimantName}
                  </span>
                  <span className="w-16 text-left">(ผู้จ่าย)</span>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <span>ลงชื่อ</span>
                  <span className="border-b border-dotted border-slate-400 w-48 inline-block text-center text-slate-400">...................................................</span>
                  <span className="w-16 text-left">(ผู้อนุมัติ)</span>
                </div>
              </div>
            </div>

            {/* Bottom Green Accent Bar */}
            <div className="bg-emerald-500 h-3 w-full mt-6 rounded-xs"></div>

            {/* Attachment Link Preview */}
            {data.attachmentUrl && (
              <div className="mt-4 pt-3 border-t border-slate-200 print:hidden flex justify-between items-center text-xs">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> เอกสารแนบหลักฐานการโอนเงินครบถ้วน
                </span>
                <a
                  href={data.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 font-bold hover:underline"
                >
                  เปิดสลิปหลักฐานแนบขนาดเต็ม ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
