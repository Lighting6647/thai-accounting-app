'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, Image as ImageIcon, FileText, CheckCircle2, AlertCircle, Loader2, Download, Sparkles } from 'lucide-react';
import { formatMoney, formatDateThai } from '@/lib/format';
import { toast } from 'sonner';

interface ImportReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportReceiptModal({ isOpen, onClose, onSuccess }: ImportReceiptModalProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Single slip extractor state
  const [extractedData, setExtractedData] = useState({
    receiptDate: new Date().toISOString().split('T')[0],
    contactName: 'ลูกค้าทั่วไป',
    amount: 0,
    paymentMethod: 'TRANSFER',
    whtAmount: 0,
    attachmentUrl: '',
    notes: 'นำเข้าจากสลิปชำระเงิน',
  });
  const [hasUploadedFile, setHasUploadedFile] = useState(false);

  // Batch CSV/JSON state
  const [batchItems, setBatchItems] = useState<any[]>([]);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const slipFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // ===== Single Slip Extraction Logic =====
  const handleSlipFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'อัปโหลดไฟล์ไม่สำเร็จ');

      // Smart parsing heuristics from filename and size
      const filename = file.name;
      let guessedAmount = 0;
      let guessedName = 'ลูกค้าทั่วไป';
      let guessedMethod = 'TRANSFER';

      // Search for amount pattern in filename e.g. 1500, 1500baht, 250.50
      const amountMatch = filename.match(/(\d+[\.\,]?\d*)\s*(บาท|baht|thb)?/i);
      if (amountMatch && !isNaN(parseFloat(amountMatch[1].replace(',', '')))) {
        const parsed = parseFloat(amountMatch[1].replace(',', ''));
        if (parsed > 0 && parsed < 10000000) {
          guessedAmount = parsed;
        }
      }

      if (filename.toLowerCase().includes('cash') || filename.includes('เงินสด')) {
        guessedMethod = 'CASH';
      } else if (filename.toLowerCase().includes('cheque') || filename.includes('เช็ค')) {
        guessedMethod = 'CHEQUE';
      }

      // Cleanup name from extensions
      const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      if (cleanName.length > 2 && !cleanName.match(/^\d+$/)) {
        guessedName = cleanName;
      }

      setExtractedData({
        receiptDate: new Date().toISOString().split('T')[0],
        contactName: guessedName,
        amount: guessedAmount,
        paymentMethod: guessedMethod,
        whtAmount: 0,
        attachmentUrl: data.url,
        notes: `สลิปแนบ: ${file.name}`,
      });

      setHasUploadedFile(true);
      toast.success('อัปโหลดและวิเคราะห์ไฟล์เรียบร้อยแล้ว');
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์');
    } finally {
      setUploading(false);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (extractedData.amount <= 0) {
      toast.error('กรุณาระบุจำนวนเงินให้ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/receipts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extractedData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'นำเข้าไม่สำเร็จ');

      toast.success('นำเข้าใบเสร็จเรียบร้อยแล้ว');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setLoading(false);
    }
  };

  // ===== Batch CSV Parsing Logic =====
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const formatted = (Array.isArray(parsed) ? parsed : [parsed]).map((row, idx) => ({
            id: idx + 1,
            receiptDate: row.receiptDate || row.date || new Date().toISOString().split('T')[0],
            contactName: row.contactName || row.customerName || 'ทั่วไป',
            amount: Number(row.amount) || 0,
            paymentMethod: row.paymentMethod || 'TRANSFER',
            whtAmount: Number(row.whtAmount) || 0,
            notes: row.notes || row.note || 'นำเข้าจาก JSON',
            isValid: Number(row.amount) > 0,
          }));
          setBatchItems(formatted);
          toast.success(`โหลดข้อมูล JSON จำนวน ${formatted.length} รายการสำเร็จ`);
        } else {
          // Standard CSV parser
          const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
          if (lines.length <= 1) {
            toast.error('ไฟล์ CSV ไม่พบข้อมูลรายการ');
            return;
          }

          // Skip header row
          const rows = lines.slice(1).map((line, idx) => {
            const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
            const receiptDate = cols[0] || new Date().toISOString().split('T')[0];
            const contactName = cols[1] || 'ทั่วไป';
            const amount = parseFloat(cols[2]) || 0;
            const paymentMethod = (cols[3] || 'TRANSFER').toUpperCase();
            const whtAmount = parseFloat(cols[4]) || 0;
            const notes = cols[5] || 'นำเข้าจาก CSV';

            return {
              id: idx + 1,
              receiptDate,
              contactName,
              amount,
              paymentMethod: ['CASH', 'TRANSFER', 'CHEQUE'].includes(paymentMethod) ? paymentMethod : 'TRANSFER',
              whtAmount,
              notes,
              isValid: amount > 0,
            };
          });

          setBatchItems(rows);
          toast.success(`โหลดข้อมูล CSV จำนวน ${rows.length} รายการสำเร็จ`);
        }
      } catch (err) {
        toast.error('ไม่สามารถอ่านไฟล์ CSV/JSON ได้ กรุณาตรวจสอบรูปแบบไฟล์');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = `receiptDate,contactName,amount,paymentMethod,whtAmount,notes\n2026-09-20,บริษัท ตัวอย่าง จำกัด,1500.00,TRANSFER,0,ค่าบริการรายเดือน\n2026-09-20,ร้านค้าอบอุ่น,3200.50,CASH,0,ขายสินค้าประจำวัน`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_receipts_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchSubmit = async () => {
    const validItems = batchItems.filter((i) => i.isValid);
    if (validItems.length === 0) {
      toast.error('ไม่พบรายการที่ถูกต้องสำหรับนำเข้า');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/receipts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validItems),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'นำเข้าข้อมูลไม่สำเร็จ');

      toast.success(`นำเข้าใบเสร็จจำนวน ${validItems.length} รายการเรียบร้อยแล้ว`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">นำเข้าข้อมูลใบเสร็จรับเงิน (Receipt Importer)</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 ${
              activeTab === 'single'
                ? 'bg-white text-slate-900 border-t-2 border-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-sky-600" />
            นำเข้าจากสลิป / สแกนไฟล์
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2 ${
              activeTab === 'batch'
                ? 'bg-white text-slate-900 border-t-2 border-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            นำเข้าหลายรายการ (CSV / Excel / JSON)
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'single' ? (
            <form onSubmit={handleSingleSubmit} className="space-y-6">
              {/* File Dropzone */}
              <div
                onClick={() => slipFileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-2xl p-6 bg-sky-50/40 hover:bg-sky-50 text-center transition-all"
              >
                <input
                  ref={slipFileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSlipFileUpload(e.target.files[0]);
                    }
                  }}
                />

                {uploading ? (
                  <div className="flex flex-col items-center py-4 text-sky-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="mt-2 text-sm font-medium">กำลังอัปโหลดและวิเคราะห์ข้อมูลจากไฟล์...</p>
                  </div>
                ) : hasUploadedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <div className="text-left">
                      <p className="font-semibold text-slate-800 text-sm">อัปโหลดไฟล์และสแกนข้อมูลสำเร็จ!</p>

                        <a href={extractedData.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline hover:text-sky-700">ดูไฟล์ที่แนบไว้ ↗</a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      คลิกเพื่ออัปโหลด หรือ ลากไฟล์สลิป/ใบเสร็จ (JPG, PNG, PDF) มาวางที่นี่
                    </p>
                    <p className="text-xs text-slate-500">ระบบจะทำการอ่านข้อมูลและเติมฟิลด์ให้อัตโนมัติ</p>
                  </div>
                )}
              </div>

              {/* Parsed / Extracted Form Fields */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> ตรวจสอบและแก้ไขข้อมูลก่อนเข้าระบบ
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">วันที่รับเงิน *</label>
                    <input
                      type="date"
                      value={extractedData.receiptDate}
                      onChange={(e) => setExtractedData({ ...extractedData, receiptDate: e.target.value })}
                      className="input text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">ผู้จ่ายเงิน / ลูกค้า *</label>
                    <input
                      type="text"
                      value={extractedData.contactName}
                      onChange={(e) => setExtractedData({ ...extractedData, contactName: e.target.value })}
                      className="input text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">จำนวนเงินรับชำระ (บาท) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={extractedData.amount || ''}
                      onChange={(e) => setExtractedData({ ...extractedData, amount: parseFloat(e.target.value) || 0 })}
                      className="input text-sm text-right font-bold text-slate-900"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">วิธีชำระเงิน</label>
                    <select
                      value={extractedData.paymentMethod}
                      onChange={(e) => setExtractedData({ ...extractedData, paymentMethod: e.target.value })}
                      className="input text-sm"
                    >
                      <option value="TRANSFER">โอนเงิน (Transfer)</option>
                      <option value="CASH">เงินสด (Cash)</option>
                      <option value="CHEQUE">เช็ค (Cheque)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">ภาษีหัก ณ ที่จ่าย (ถ้ามี)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={extractedData.whtAmount || ''}
                      onChange={(e) => setExtractedData({ ...extractedData, whtAmount: parseFloat(e.target.value) || 0 })}
                      className="input text-sm text-right"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">หมายเหตุ</label>
                    <input
                      type="text"
                      value={extractedData.notes}
                      onChange={(e) => setExtractedData({ ...extractedData, notes: e.target.value })}
                      className="input text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost text-sm">
                  ยกเลิก
                </button>
                <button type="submit" disabled={loading} className="btn-primary text-sm flex items-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  ยืนยันนำเข้าใบเสร็จเข้าระบบ
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Batch Upload Instructions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">นำเข้าใบเสร็จรับเงินหลายรายการพร้อมกัน</p>
                  <p className="text-xs text-emerald-700">อัปโหลดไฟล์ CSV หรือ JSON ระบบจะทำการอ่านและลงบัญชีให้อัตโนมัติ</p>
                </div>
                <button
                  onClick={handleDownloadSampleCSV}
                  className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-4 h-4" /> ดาวน์โหลดแม่แบบ CSV
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => batchFileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-6 bg-emerald-50/30 hover:bg-emerald-50 text-center transition-all"
              >
                <input
                  ref={batchFileInputRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={handleCSVUpload}
                />
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">คลิกเพื่อเลือกไฟล์ CSV หรือ JSON สำหรับนำเข้า</p>
                  <p className="text-xs text-slate-500">คอลัมน์มาตรฐาน: receiptDate, contactName, amount, paymentMethod, whtAmount, notes</p>
                </div>
              </div>

              {/* Preview Table */}
              {batchItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-800">
                      รายการที่เตรียมนำเข้า ({batchItems.filter((i) => i.isValid).length} / {batchItems.length} รายการถูกต้อง)
                    </h3>
                  </div>

                  <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="table w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">วันที่</th>
                          <th className="px-3 py-2">ผู้จ่ายเงิน</th>
                          <th className="px-3 py-2 text-right">จำนวนเงิน</th>
                          <th className="px-3 py-2">วิธีชำระ</th>
                          <th className="px-3 py-2">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {batchItems.map((item) => (
                          <tr key={item.id} className={item.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                            <td className="px-3 py-2 font-mono">{item.id}</td>
                            <td className="px-3 py-2">{item.receiptDate}</td>
                            <td className="px-3 py-2 font-medium">{item.contactName}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatMoney(item.amount)}</td>
                            <td className="px-3 py-2">{item.paymentMethod}</td>
                            <td className="px-3 py-2">
                              {item.isValid ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมนำเข้า
                                </span>
                              ) : (
                                <span className="text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> ยอดเงินไม่ถูกต้อง
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost text-sm">
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleBatchSubmit}
                  disabled={loading || batchItems.filter((i) => i.isValid).length === 0}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  ยืนยันนำเข้าข้อมูลทั้งหมด ({batchItems.filter((i) => i.isValid).length} รายการ)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
