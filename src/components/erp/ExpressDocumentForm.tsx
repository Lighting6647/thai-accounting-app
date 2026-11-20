'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, X, Plus, Trash2, AlertTriangle, Link2, Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { calculateLineAmount, calculateTax, VatType } from '@/lib/tax-engine';

export type ExpressDocKind = 'QT' | 'SO' | 'IV' | 'PO' | 'RR';

interface ExpressDocumentFormProps {
  docKind: ExpressDocKind;
  title: string;
  subtitle: string;
  backHref: string;
  submitEndpoint: string;
  contactFilter: 'customer' | 'vendor';
  contactLabel: string;
  dateLabel: string;
  secondaryDateLabel: string;
  defaultDaysOffset?: number;
  showWarehouse?: boolean;
  showVendorInvoiceNo?: boolean;
  showWht?: boolean;
  checkStockWarning?: boolean;
  sourceConfig?: {
    label: string;
    listEndpoint: string;
    detailEndpoint: string;
    numberField: string;
    targetField: string; // e.g., 'qtId' | 'soId' | 'poId'
  };
}

interface LineRow {
  rowKey: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export default function ExpressDocumentForm({
  docKind,
  title,
  subtitle,
  backHref,
  submitEndpoint,
  contactFilter,
  contactLabel,
  dateLabel,
  secondaryDateLabel,
  defaultDaysOffset = 30,
  showWarehouse = true,
  showVendorInvoiceNo = false,
  showWht = false,
  checkStockWarning = false,
  sourceConfig,
}: ExpressDocumentFormProps) {
  const router = useRouter();
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [sourceDocs, setSourceDocs] = useState<any[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultSecDate = new Date();
  defaultSecDate.setDate(defaultSecDate.getDate() + defaultDaysOffset);

  const [docDate, setDocDate] = useState(todayStr);
  const [secondaryDate, setSecondaryDate] = useState(defaultSecDate.toISOString().split('T')[0]);
  const [contactId, setContactId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [vatType, setVatType] = useState<VatType>('EXCLUSIVE');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [hasWht, setHasWht] = useState(false);
  const [whtRate, setWhtRate] = useState<number>(3);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<LineRow[]>([
    { rowKey: '1', productId: '', description: '', quantity: 1, unitPrice: 0, discount: 0 },
  ]);

  const isAp = docKind === 'PO' || docKind === 'RR';

  const applySourceDetail = useCallback((detail: any) => {
    if (!detail) return;
    if (detail.contactId) setContactId(detail.contactId);
    if (detail.warehouseId) setWarehouseId(detail.warehouseId);
    if (detail.vatType) setVatType(detail.vatType as VatType);
    if (typeof detail.discountAmount === 'number') setDiscountAmount(detail.discountAmount);
    if (detail.notes) setNotes(detail.notes);

    if (Array.isArray(detail.items) && detail.items.length > 0) {
      setItems(
        detail.items.map((it: any, idx: number) => ({
          rowKey: `${Date.now()}-${idx}`,
          productId: it.productId || '',
          description: it.description || '',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
        }))
      );
    }
  }, []);

  useEffect(() => {
    async function loadMasterData() {
      setInitializing(true);
      try {
        const requests: Promise<Response>[] = [
          fetch(`/api/contacts?type=${contactFilter}`),
          fetch('/api/products'),
          showWarehouse ? fetch('/api/ic/warehouses') : Promise.resolve(new Response('[]')),
          sourceConfig ? fetch(sourceConfig.listEndpoint) : Promise.resolve(new Response('[]')),
        ];
        const [cRes, pRes, wRes, sRes] = await Promise.all(requests);

        if (cRes.ok) setContacts(await cRes.json());
        if (pRes.ok) setProducts(await pRes.json());
        if (wRes.ok) {
          const whList = await wRes.json();
          setWarehouses(whList);
          const defWh = whList.find((w: any) => w.isDefault) || whList[0];
          if (defWh) setWarehouseId(defWh.id);
        }
        if (sRes.ok) setSourceDocs(await sRes.json());

        // Check ?sourceId= query parameter
        if (sourceConfig && typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const qSourceId = urlParams.get('sourceId');
          if (qSourceId) {
            setSourceId(qSourceId);
            const detailRes = await fetch(`${sourceConfig.detailEndpoint}?id=${encodeURIComponent(qSourceId)}`);
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              applySourceDetail(detailData);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load master data', err);
        toast.error('ไม่สามารถโหลดข้อมูลหลักได้');
      } finally {
        setInitializing(false);
      }
    }
    loadMasterData();
  }, [contactFilter, showWarehouse, sourceConfig, applySourceDetail]);

  const handleSelectSource = async (selectedId: string) => {
    setSourceId(selectedId);
    if (!selectedId || !sourceConfig) return;
    try {
      const res = await fetch(`${sourceConfig.detailEndpoint}?id=${encodeURIComponent(selectedId)}`);
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลเอกสารอ้างอิงได้');
      const detail = await res.json();
      applySourceDetail(detail);
      toast.success(`ดึงข้อมูลจากเอกสาร ${detail[sourceConfig.numberField]} แล้ว`);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        rowKey: `${Date.now()}-${Math.random()}`,
        productId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
      },
    ]);
  };

  const handleRemoveRow = (rowKey: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((r) => r.rowKey !== rowKey));
  };

  const handleSelectProduct = (rowKey: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((row) => {
        if (row.rowKey !== rowKey) return row;
        if (!product) {
          return { ...row, productId: '' };
        }
        return {
          ...row,
          productId: product.id,
          description: `${product.code} - ${product.name}`,
          unitPrice: isAp ? Number(product.costPrice) || 0 : Number(product.sellingPrice) || 0,
        };
      })
    );
  };

  const updateRow = (rowKey: string, field: keyof LineRow, value: any) => {
    setItems((prev) =>
      prev.map((row) => (row.rowKey === rowKey ? { ...row, [field]: value } : row))
    );
  };

  const rawLinesTotal = items.reduce(
    (sum, item) => sum + calculateLineAmount(item.quantity, item.unitPrice, item.discount),
    0
  );

  const tax = calculateTax({
    subtotal: rawLinesTotal,
    discountAmount,
    vatType,
    vatRate: 7,
    whtRate: showWht && hasWht ? whtRate : 0,
  });

  const hasInsufficientStock = checkStockWarning
    ? items.some((row) => {
        if (!row.productId) return false;
        const p = products.find((prod) => prod.id === row.productId);
        return p ? row.quantity > p.currentStock : false;
      })
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!contactId) {
      toast.error(`กรุณาเลือก${contactLabel}`);
      return;
    }

    if (items.some((i) => !i.description.trim() || i.quantity <= 0 || i.unitPrice < 0)) {
      toast.error('กรุณากรอกรายละเอียดสินค้าและจำนวนให้ครบถ้วน');
      return;
    }

    if (hasInsufficientStock) {
      toast.error('มีสินค้าคงเหลือไม่เพียงพอ กรุณาตรวจสอบจำนวนก่อนออกบิล');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        contactId,
        warehouseId: showWarehouse && warehouseId ? warehouseId : undefined,
        vatType,
        vatRate: 7,
        discountAmount: Number(discountAmount) || 0,
        whtRate: showWht && hasWht ? whtRate : 0,
        notes,
        items: items.map((i) => ({
          productId: i.productId || null,
          description: i.description.trim(),
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          discount: Number(i.discount) || 0,
          amount: calculateLineAmount(i.quantity, i.unitPrice, i.discount),
        })),
      };

      if (docKind === 'QT') {
        payload.qtDate = docDate;
        payload.validUntil = secondaryDate;
      } else if (docKind === 'SO') {
        payload.soDate = docDate;
        payload.deliveryDate = secondaryDate;
      } else if (docKind === 'IV') {
        payload.invoiceDate = docDate;
        payload.dueDate = secondaryDate;
      } else if (docKind === 'PO') {
        payload.poDate = docDate;
        payload.expectedDate = secondaryDate;
      } else if (docKind === 'RR') {
        payload.rrDate = docDate;
        payload.dueDate = secondaryDate;
        payload.vendorInvoiceNo = vendorInvoiceNo;
      }

      if (sourceConfig && sourceId) {
        payload[sourceConfig.targetField] = sourceId;
      }

      const res = await fetch(submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || 'เกิดข้อผิดพลาดในการบันทึกเอกสาร');
      }

      toast.success('บันทึกเอกสารและประมวลผลสำเร็จ');
      router.push(backHref);
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถบันทึกข้อมูลได้');
      setSubmitting(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลดข้อมูลแบบฟอร์ม...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="btn-secondary text-sm self-start sm:self-auto"
        >
          กลับหน้ารายการ
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {/* Top Metadata Header */}
        <div className="card-header bg-slate-50/70">
          {sourceConfig && (
            <div className="mb-4 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-indigo-900 text-sm font-semibold whitespace-nowrap">
                <Link2 className="w-4 h-4 text-indigo-600" />
                {sourceConfig.label}
              </div>
              <select
                value={sourceId}
                onChange={(e) => handleSelectSource(e.target.value)}
                className="input bg-white text-sm flex-1"
              >
                <option value="">-- ไม่ดึงเอกสารต้นทาง (คีย์รายการใหม่เอง) --</option>
                {sourceDocs.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc[sourceConfig.numberField]} — {doc.contactName} ({formatMoney(doc.totalAmount)} บ.)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">{dateLabel}</label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">{secondaryDateLabel}</label>
              <input
                type="date"
                value={secondaryDate}
                onChange={(e) => setSecondaryDate(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">{contactLabel} *</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="input"
                required
              >
                <option value="">-- เลือก{contactLabel} --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {showWarehouse && (
              <div>
                <label className="label">คลังสินค้า</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="input"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showVendorInvoiceNo && (
              <div>
                <label className="label">เลขที่ใบกำกับภาษีผู้ขาย (ถ้ามี)</label>
                <input
                  type="text"
                  value={vendorInvoiceNo}
                  onChange={(e) => setVendorInvoiceNo(e.target.value)}
                  className="input"
                  placeholder="เช่น SUP-INV-001"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="label">ประเภทภาษีมูลค่าเพิ่ม (VAT 7%)</label>
              <div className="flex flex-wrap gap-4 pt-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="vatType"
                    checked={vatType === 'EXCLUSIVE'}
                    onChange={() => setVatType('EXCLUSIVE')}
                    className="text-primary-600"
                  />
                  <span>แยกนอก (Exclude VAT 7%)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="vatType"
                    checked={vatType === 'INCLUSIVE'}
                    onChange={() => setVatType('INCLUSIVE')}
                    className="text-primary-600"
                  />
                  <span>รวมใน (Include VAT 7%)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="vatType"
                    checked={vatType === 'NO_VAT'}
                    onChange={() => setVatType('NO_VAT')}
                    className="text-primary-600"
                  />
                  <span>ยกเว้น VAT</span>
                </label>
              </div>
            </div>

            {showWht && (
              <div>
                <label className="label flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasWht}
                    onChange={(e) => setHasWht(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  หัก ณ ที่จ่าย (WHT)
                </label>
                {hasWht && (
                  <select
                    value={whtRate}
                    onChange={(e) => setWhtRate(Number(e.target.value))}
                    className="input mt-1"
                  >
                    <option value={1}>1% (ค่าขนส่ง)</option>
                    <option value={2}>2% (ค่าโฆษณา)</option>
                    <option value={3}>3% (ค่าบริการ/จ้างทำของ)</option>
                    <option value={5}>5% (ค่าเช่า)</option>
                  </select>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="label">หมายเหตุเอกสาร</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                placeholder="เงื่อนไขการชำระเงิน หรือรายละเอียดเพิ่มเติม..."
              />
            </div>
          </div>
        </div>

        {/* Express Line Item Grid */}
        <div className="card-body space-y-6">
          <div className="overflow-x-auto border rounded-xl">
            <table className="table w-full min-w-[780px]">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-600">
                  <th className="w-10 text-center">#</th>
                  <th className="w-56">รหัสสินค้า (SKU)</th>
                  <th>รายละเอียดสินค้า / บริการ</th>
                  <th className="w-24 text-center">จำนวน</th>
                  <th className="w-32 text-right">ราคา/หน่วย</th>
                  <th className="w-28 text-right">ส่วนลด (฿)</th>
                  <th className="w-36 text-right">รวมเงิน (฿)</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((row, idx) => {
                  const selectedProduct = products.find((p) => p.id === row.productId);
                  const rowOverStock =
                    checkStockWarning && selectedProduct && row.quantity > selectedProduct.currentStock;
                  const lineNet = calculateLineAmount(row.quantity, row.unitPrice, row.discount);

                  return (
                    <tr key={row.rowKey} className={rowOverStock ? 'bg-red-50/50' : ''}>
                      <td className="text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                      <td>
                        <select
                          value={row.productId}
                          onChange={(e) => handleSelectProduct(row.rowKey, e.target.value)}
                          className="input py-1.5 text-xs"
                        >
                          <option value="">-- รายการอิสระ --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} : {p.name} (คงเหลือ {p.currentStock})
                            </option>
                          ))}
                        </select>
                        {selectedProduct && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                            <span
                              className={
                                rowOverStock ? 'text-red-600 font-semibold' : 'text-slate-500'
                              }
                            >
                              คงเหลือ: {selectedProduct.currentStock} {selectedProduct.unit}
                            </span>
                            {rowOverStock && <AlertTriangle className="w-3 h-3 text-red-600" />}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => updateRow(row.rowKey, 'description', e.target.value)}
                          className="input py-1.5 text-sm"
                          placeholder="ระบุชื่อสินค้าหรือบริการ"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.quantity || ''}
                          onChange={(e) => updateRow(row.rowKey, 'quantity', Number(e.target.value))}
                          className="input py-1.5 text-center text-sm"
                          min="0.01"
                          step="any"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.unitPrice ?? ''}
                          onChange={(e) => updateRow(row.rowKey, 'unitPrice', Number(e.target.value))}
                          className="input py-1.5 text-right text-sm"
                          min="0"
                          step="0.01"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.discount || ''}
                          onChange={(e) => updateRow(row.rowKey, 'discount', Number(e.target.value))}
                          className="input py-1.5 text-right text-sm"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="text-right font-semibold text-slate-900">
                        {formatMoney(lineNet)}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.rowKey)}
                          disabled={items.length <= 1}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30"
                          title="ลบแถว"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-3">
              <button type="button" onClick={handleAddRow} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> เพิ่มแถวรายการสินค้า
              </button>
              {hasInsufficientStock && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  ระบบป้องกันสต็อกติดลบ: จำนวนสินค้าบางรายการเกินกว่ายอดคงเหลือในคลัง
                </div>
              )}
            </div>

            {/* Express Summary Box */}
            <div className="w-full md:w-96 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">รวมเป็นเงิน (หลังส่วนลดรายตัว)</span>
                <span className="font-medium">{formatMoney(tax.grossAmount)}</span>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-600">ส่วนลดท้ายบิล (บาท)</span>
                <input
                  type="number"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="input py-1 px-2.5 w-32 text-right text-sm bg-white"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600">มูลค่าฐานภาษี (Subtotal)</span>
                <span className="font-medium">{formatMoney(tax.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">ภาษีมูลค่าเพิ่ม (VAT {tax.vatRate}%)</span>
                <span className="font-medium">{formatMoney(tax.vatAmount)}</span>
              </div>

              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
                <span>จำนวนเงินรวมทั้งสิ้น</span>
                <span>{formatMoney(tax.totalAmount)}</span>
              </div>

              {showWht && hasWht && (
                <div className="flex justify-between text-red-600 text-xs">
                  <span>หัก ณ ที่จ่าย ({whtRate}%)</span>
                  <span>-{formatMoney(tax.whtAmount)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-300 text-primary-700">
                <span>ยอดสุทธิ</span>
                <span>{formatMoney(tax.netAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="btn-ghost"
            disabled={submitting}
          >
            <X className="w-4 h-4" /> ยกเลิก
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || hasInsufficientStock}
          >
            <Save className="w-4 h-4" />
            {submitting ? 'กำลังบันทึกและลงบัญชี...' : 'บันทึกเอกสาร'}
          </button>
        </div>
      </form>
    </div>
  );
}
