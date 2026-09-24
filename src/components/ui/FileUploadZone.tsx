'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Trash2, Loader2, Eye } from 'lucide-react';

interface FileUploadZoneProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export default function FileUploadZone({ value, onChange, label = 'แนบเอกสาร / ใบเสร็จ' }: FileUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPdf = value?.toLowerCase().endsWith('.pdf');
  const isImage = value && !isPdf;

  const handleFileChange = async (file: File) => {
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการอัปโหลด');
      }

      onChange(data.url);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถอัปโหลดไฟล์ได้');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>

      {value ? (
        <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              {isImage ? (
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img src={value} alt="Receipt preview" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600">
                  <FileText className="h-8 w-8" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {value.split('/').pop()}
                </p>
                <p className="text-xs text-slate-500">
                  {isPdf ? 'เอกสาร PDF' : 'ไฟล์รูปภาพ'}
                </p>
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                >
                  <Eye className="h-3.5 w-3.5" /> ดูเอกสารแนบ
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="ลบเอกสารแนบ"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
            isDragOver
              ? 'border-sky-500 bg-sky-50/50'
              : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          {uploading ? (
            <div className="flex flex-col items-center justify-center py-2 text-sky-600">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-2 text-xs font-medium">กำลังอัปโหลดเอกสาร...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="text-sm">
                <span className="font-semibold text-sky-600 hover:underline">คลิกเพื่ออัปโหลด</span> หรือลากไฟล์มาวางที่นี่
              </div>
              <p className="text-xs text-slate-400">
                รองรับไฟล์ JPG, PNG, WEBP, GIF หรือ PDF (ขนาดไม่เกิน 10MB)
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-500 font-medium">{error}</p>
      )}
    </div>
  );
}
