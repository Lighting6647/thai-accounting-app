'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Warehouse,
  ClipboardList,
  History,
  Download,
  Printer,
  Eye,
  X,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai, getStatusLabel } from '@/lib/format';
import { exportToCsv } from '@/lib/csv-export';
import ExpressDetailModal from '@/components/erp/ExpressDetailModal';

type TabKey = 'products' | 'warehouses' | 'adjustments';

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false);
  const [showAjModal, setShowAjModal] = useState(false);
  const [stockCardProduct, setStockCardProduct] = useState<any>(null);
  const [selectedAjId, setSelectedAjId] = useState<string | null>(null);

  // Form: Add Product
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('ชิ้น');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [reorderPoint, setReorderPoint] = useState<number>(5);
  const [productWarehouseId, setProductWarehouseId] = useState('');

  // Form: Add Warehouse
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whLocation, setWhLocation] = useState('');
  const [whIsDefault, setWhIsDefault] = useState(false);

  // Form: Stock Adjustment (AJ)
  const [ajDate, setAjDate] = useState(new Date().toISOString().split('T')[0]);
  const [ajWarehouseId, setAjWarehouseId] = useState('');
  const [ajType, setAjType] = useState<'IN' | 'OUT' | 'COUNT'>('IN');
  const [ajReason, setAjReason] = useState('');
  const [ajItems, setAjItems] = useState<{ rowKey: string; productId: string; quantity: number; unitCost: number; notes: string }[]>([
    { rowKey: '1', productId: '', quantity: 1, unitCost: 0, notes: '' },
  ]);
  const [ajSubmitting, setAjSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, wRes, aRes] = await Promise.all([
        fetch(`/api/products?search=${encodeURIComponent(search)}`),
        fetch('/api/ic/warehouses'),
        fetch('/api/ic/adjustments'),
      ]);
      if (pRes.ok) setProducts(await pRes.json());
      if (wRes.ok) {
        const whData = await wRes.json();
        setWarehouses(whData);
        const def = whData.find((w: any) => w.isDefault) || whData[0];
        if (def) {
          setProductWarehouseId((prev) => prev || def.id);
          setAjWarehouseId((prev) => prev || def.id);
        }
      }
      if (aRes.ok) setAdjustments(await aRes.json());
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลคลังสินค้าได้');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalInventoryValue = products.reduce(
    (sum, p) => sum + (Number(p.currentStock) || 0) * (Number(p.costPrice) || 0),
    0
  );
  const lowStockCount = products.filter((p) => p.currentStock <= p.reorderPoint).length;

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          unit,
          sellingPrice,
          costPrice,
          initialStock,
          reorderPoint,
          warehouseId: productWarehouseId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'เพิ่มสินค้าไม่สำเร็จ');
      toast.success('เพิ่มสินค้าใหม่เรียบร้อยแล้ว');
      setShowAddProductModal(false);
      setCode('');
      setName('');
      setUnit('ชิ้น');
      setSellingPrice(0);
      setCostPrice(0);
      setInitialStock(0);
      setReorderPoint(5);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ic/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: whCode,
          name: whName,
          location: whLocation,
          isDefault: whIsDefault,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'สร้างคลังสินค้าไม่สำเร็จ');
      toast.success('เพิ่มคลังสินค้าเรียบร้อยแล้ว');
      setShowAddWarehouseModal(false);
      setWhCode('');
      setWhName('');
      setWhLocation('');
      setWhIsDefault(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ajSubmitting) return;
    if (ajItems.some((it) => !it.productId || it.quantity < 0)) {
      toast.error('กรุณาเลือกสินค้าและระบุจำนวนให้ครบถ้วน');
      return;
    }
    setAjSubmitting(true);
    try {
      const res = await fetch('/api/ic/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustDate: ajDate,
          warehouseId: ajWarehouseId,
          adjustType: ajType,
          reason: ajReason,
          items: ajItems.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            unitCost: Number(it.unitCost),
            notes: it.notes,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'บันทึกเอกสารปรับปรุงไม่สำเร็จ');
      toast.success(`บันทึกใบปรับปรุงสต็อก ${json.adjustNumber} พร้อม Auto-GL แล้ว`);
      setShowAjModal(false);
      setAjReason('');
      setAjItems([{ rowKey: '1', productId: '', quantity: 1, unitCost: 0, notes: '' }]);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setAjSubmitting(false);
    }
  };

  const handleExportProductsCsv = () => {
    exportToCsv(
      `inventory-products-${new Date().toISOString().split('T')[0]}`,
      ['รหัสสินค้า', 'ชื่อสินค้า', 'หน่วยนับ', 'ราคาขาย', 'ต้นทุนเฉลี่ย (Moving Avg)', 'คงเหลือรวม', 'มูลค่ารวม', 'จุดสั่งซื้อขั้นต่ำ'],
      products.map((p) => [
        p.code,
        p.name,
        p.unit,
        p.sellingPrice,
        p.costPrice,
        p.currentStock,
        p.currentStock * p.costPrice,
        p.reorderPoint,
      ])
    );
  };

  const handleExportAdjustmentsCsv = () => {
    exportToCsv(
      `stock-adjustments-${new Date().toISOString().split('T')[0]}`,
      ['เลขที่ AJ', 'วันที่', 'คลังสินค้า', 'ประเภท', 'เหตุผล', 'มูลค่ารวม', 'สถานะ'],
      adjustments.map((aj) => [
        aj.adjustNumber,
        formatDateThai(aj.adjustDate),
        aj.warehouse?.name || '-',
        aj.adjustType,
        aj.reason || '-',
        aj.totalValue,
        getStatusLabel(aj.status).label,
      ])
    );
  };

  const handleExportStockCardCsv = () => {
    if (!stockCardProduct) return;
    exportToCsv(
      `stock-card-${stockCardProduct.code}`,
      ['วันที่', 'ประเภท', 'คลังสินค้า', 'อ้างอิงเอกสาร', 'จำนวน', 'ต้นทุน/หน่วย', 'คงเหลือหลังรายการ', 'ต้นทุนเฉลี่ยหลังรายการ', 'หมายเหตุ'],
      (stockCardProduct.movements || []).map((m: any) => [
        formatDateThai(m.movementDate),
        m.type,
        m.warehouse?.name || '-',
        m.referenceDocType || '-',
        m.quantity,
        m.unitCost,
        m.balanceAfter || '-',
        m.avgCostAfter || m.unitCost,
        m.notes || '-',
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">สินค้าคงคลัง & หลายคลังสินค้า (Inventory)</h1>
          <p className="text-sm text-slate-500">
            ทะเบียนสินค้า, ต้นทุนถัวเฉลี่ยเคลื่อนที่ (Moving Average), สมุดคุมสต็อก (Stock Card) และเอกสารปรับปรุงสต็อก (AJ)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'products' && (
            <>
              <button onClick={handleExportProductsCsv} className="btn-secondary text-sm">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={() => setShowAddProductModal(true)} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> เพิ่มสินค้าใหม่
              </button>
            </>
          )}
          {activeTab === 'warehouses' && (
            <button onClick={() => setShowAddWarehouseModal(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> เพิ่มคลังสินค้า
            </button>
          )}
          {activeTab === 'adjustments' && (
            <>
              <button onClick={handleExportAdjustmentsCsv} className="btn-secondary text-sm">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={() => setShowAjModal(true)} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> สร้างใบปรับปรุงสต็อก (AJ)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="metric-card p-4">
          <span className="text-xs text-slate-500">จำนวนรายการสินค้า (SKU)</span>
          <span className="text-xl font-bold text-slate-900">{products.length} รายการ</span>
        </div>
        <div className="metric-card p-4">
          <span className="text-xs text-slate-500">มูลค่าสินค้าคงเหลือรวม (Moving Avg)</span>
          <span className="text-xl font-bold text-indigo-700">{formatMoney(totalInventoryValue, true)}</span>
        </div>
        <div className="metric-card p-4">
          <span className="text-xs text-slate-500">จำนวนคลังสินค้า</span>
          <span className="text-xl font-bold text-slate-900">{warehouses.length} คลัง</span>
        </div>
        <div className="metric-card p-4">
          <span className="text-xs text-slate-500">สินค้าใกล้หมด (Low Stock Alert)</span>
          <span className={`text-xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {lowStockCount} รายการ
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'products'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" /> ทะเบียนสินค้า & Stock Card
        </button>
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'warehouses'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Warehouse className="w-4 h-4" /> หลายคลังสินค้า ({warehouses.length})
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'adjustments'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> ใบปรับปรุงสต็อก (AJ) ({adjustments.length})
        </button>
      </div>

      {/* Tab 1: Products */}
      {activeTab === 'products' && (
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหารหัส SKU หรือ ชื่อสินค้า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm w-full"
              />
            </div>
          </div>

          <div className="card-body p-0 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center p-8 text-slate-500">ไม่พบรายการสินค้า</div>
            ) : (
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>รหัส SKU</th>
                    <th>ชื่อสินค้า/บริการ</th>
                    <th className="text-right">ราคาขาย</th>
                    <th className="text-right">ต้นทุนเฉลี่ย (Avg)</th>
                    <th className="text-center">คงเหลือรวม</th>
                    <th>แยกตามคลัง</th>
                    <th className="text-center">สมุดคุมสต็อก</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {products.map((p) => {
                    const isLowStock = p.currentStock <= p.reorderPoint;
                    return (
                      <tr key={p.id}>
                        <td className="font-mono font-semibold text-slate-900">{p.code}</td>
                        <td className="font-medium text-slate-900">
                          <div>{p.name}</div>
                          <div className="text-xs text-slate-400">หน่วย: {p.unit} | จุดสั่งซื้อ: {p.reorderPoint}</div>
                        </td>
                        <td className="text-right font-medium text-primary-700">{formatMoney(p.sellingPrice)}</td>
                        <td className="text-right text-slate-700 font-medium">{formatMoney(p.costPrice)}</td>
                        <td className="text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isLowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isLowStock && <AlertCircle className="w-3.5 h-3.5 mr-1" />}
                            {p.currentStock} {p.unit}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(p.warehouseStocks || []).length === 0 ? (
                              <span className="text-xs text-slate-400">-</span>
                            ) : (
                              p.warehouseStocks.map((ws: any) => (
                                <span
                                  key={ws.id}
                                  className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                                >
                                  {ws.warehouse?.code}: <b>{ws.quantity}</b>
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => setStockCardProduct(p)}
                            className="btn-secondary text-xs px-2.5 py-1.5"
                          >
                            <History className="w-3.5 h-3.5" /> Stock Card
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Multi-Warehouse */}
      {activeTab === 'warehouses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {warehouses.map((wh) => (
            <div key={wh.id} className="card overflow-hidden">
              <div className="card-header bg-slate-50 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                      {wh.code}
                    </span>
                    <h3 className="font-bold text-slate-900">{wh.name}</h3>
                    {wh.isDefault && (
                      <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                        คลังหลัก
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{wh.location || 'ไม่ได้ระบุที่ตั้ง'}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">มูลค่าคงคลัง</div>
                  <div className="font-bold text-indigo-700">{formatMoney(wh.totalValue, true)}</div>
                </div>
              </div>
              <div className="card-body p-0 overflow-x-auto max-h-64">
                <table className="table w-full text-xs">
                  <thead>
                    <tr>
                      <th>รหัส SKU</th>
                      <th>สินค้า</th>
                      <th className="text-right">จำนวนคงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(wh.stocks || []).filter((s: any) => s.quantity > 0).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-slate-400">
                          ยังไม่มีสินค้าในคลังนี้
                        </td>
                      </tr>
                    ) : (
                      wh.stocks
                        .filter((s: any) => s.quantity > 0)
                        .map((st: any) => (
                          <tr key={st.id}>
                            <td className="font-mono font-semibold">{st.product?.code}</td>
                            <td>{st.product?.name}</td>
                            <td className="text-right font-semibold">
                              {st.quantity} {st.product?.unit}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Stock Adjustments (AJ) */}
      {activeTab === 'adjustments' && (
        <div className="card">
          <div className="card-body p-0 overflow-x-auto">
            {adjustments.length === 0 ? (
              <div className="text-center p-10 text-slate-500">ยังไม่มีเอกสารปรับปรุงสต็อก (AJ)</div>
            ) : (
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>เลขที่ AJ</th>
                    <th>วันที่ปรับปรุง</th>
                    <th>คลังสินค้า</th>
                    <th>ประเภท</th>
                    <th>เหตุผล</th>
                    <th className="text-right">มูลค่าปรับปรุง</th>
                    <th className="text-center">สถานะ</th>
                    <th className="text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {adjustments.map((aj) => {
                    const st = getStatusLabel(aj.status);
                    return (
                      <tr key={aj.id}>
                        <td>
                          <button
                            onClick={() => setSelectedAjId(aj.id)}
                            className="font-mono font-semibold text-primary-600 hover:underline"
                          >
                            {aj.adjustNumber}
                          </button>
                        </td>
                        <td>{formatDateThai(aj.adjustDate)}</td>
                        <td>{aj.warehouse?.name || '-'}</td>
                        <td>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {aj.adjustType === 'IN'
                              ? 'ปรับเพิ่ม (+)'
                              : aj.adjustType === 'OUT'
                                ? 'ปรับลด (-)'
                                : 'ตรวจนับจริง (=)'}
                          </span>
                        </td>
                        <td className="text-slate-600">{aj.reason || '-'}</td>
                        <td className="text-right font-semibold">{formatMoney(aj.totalValue)}</td>
                        <td className="text-center">
                          <span className={st.className}>{st.label}</span>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedAjId(aj.id)}
                              className="p-1.5 text-slate-500 hover:text-primary-600 rounded-lg"
                              title="ดูรายละเอียด & Auto-GL"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/print/aj/${aj.id}`}
                              target="_blank"
                              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg"
                              title="พิมพ์ใบปรับปรุงสต็อก"
                            >
                              <Printer className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal: Stock Card (สมุดคุมสต็อก) */}
      {stockCardProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  สมุดคุมสต็อก (Stock Card): {stockCardProduct.code} — {stockCardProduct.name}
                </h2>
                <p className="text-xs text-slate-500">
                  คงเหลือปัจจุบัน: {stockCardProduct.currentStock} {stockCardProduct.unit} | ต้นทุนเฉลี่ย (Moving Avg):{' '}
                  {formatMoney(stockCardProduct.costPrice, true)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExportStockCardCsv} className="btn-secondary text-xs py-1.5 px-3">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
                <button onClick={() => setStockCardProduct(null)} className="p-2 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <table className="table w-full text-xs">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>คลังสินค้า</th>
                    <th>ประเภท</th>
                    <th>เอกสารอ้างอิง</th>
                    <th className="text-right">จำนวน</th>
                    <th className="text-right">ต้นทุน/หน่วย</th>
                    <th className="text-right">คงเหลือหลังรายการ</th>
                    <th className="text-right">ต้นทุนเฉลี่ยหลังรายการ</th>
                    <th>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(stockCardProduct.movements || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        ยังไม่มีประวัติการเคลื่อนไหวสต็อก
                      </td>
                    </tr>
                  ) : (
                    stockCardProduct.movements.map((m: any) => (
                      <tr key={m.id}>
                        <td>{formatDateThai(m.movementDate)}</td>
                        <td>{m.warehouse?.name || 'คลังหลัก'}</td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              m.type === 'IN'
                                ? 'bg-emerald-100 text-emerald-700'
                                : m.type === 'OUT'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="font-mono">{m.referenceDocType || '-'}</td>
                        <td className="text-right font-semibold">
                          {m.type === 'IN' ? '+' : m.type === 'OUT' ? '-' : ''}
                          {m.quantity}
                        </td>
                        <td className="text-right">{formatMoney(m.unitCost)}</td>
                        <td className="text-right font-bold text-slate-800">{m.balanceAfter || '-'}</td>
                        <td className="text-right text-indigo-700 font-medium">
                          {formatMoney(m.avgCostAfter || m.unitCost)}
                        </td>
                        <td className="text-slate-600">{m.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: เพิ่มสินค้าใหม่ */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleCreateProduct} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">เพิ่มสินค้า/บริการใหม่</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">รหัสสินค้า (SKU)</label>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="input" placeholder="เช่น SKU-006" required />
              </div>
              <div>
                <label className="label">ชื่อสินค้า</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">หน่วยนับ</label>
                <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">จุดสั่งซื้อขั้นต่ำ (Reorder)</label>
                <input type="number" value={reorderPoint} onChange={(e) => setReorderPoint(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="label">ราคาขาย (บาท)</label>
                <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="input" step="0.01" />
              </div>
              <div>
                <label className="label">ต้นทุนเริ่มต้น (บาท)</label>
                <input type="number" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} className="input" step="0.01" />
              </div>
              <div>
                <label className="label">ยอดยกมาเริ่มต้น</label>
                <input type="number" value={initialStock} onChange={(e) => setInitialStock(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="label">คลังที่เก็บยอดยกมา</label>
                <select value={productWarehouseId} onChange={(e) => setProductWarehouseId(e.target.value)} className="input">
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowAddProductModal(false)} className="btn-secondary">ยกเลิก</button>
              <button type="submit" className="btn-primary">บันทึกสินค้า</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: เพิ่มคลังสินค้าใหม่ */}
      {showAddWarehouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleCreateWarehouse} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">เพิ่มคลังสินค้าใหม่</h2>
            <div className="space-y-3">
              <div>
                <label className="label">รหัสคลัง *</label>
                <input type="text" value={whCode} onChange={(e) => setWhCode(e.target.value)} className="input" placeholder="เช่น WH-03" required />
              </div>
              <div>
                <label className="label">ชื่อคลังสินค้า *</label>
                <input type="text" value={whName} onChange={(e) => setWhName(e.target.value)} className="input" placeholder="เช่น คลังสินค้าบางนา" required />
              </div>
              <div>
                <label className="label">ที่ตั้ง / สาขา</label>
                <input type="text" value={whLocation} onChange={(e) => setWhLocation(e.target.value)} className="input" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={whIsDefault} onChange={(e) => setWhIsDefault(e.target.checked)} />
                ตั้งเป็นคลังสินค้าหลักเริ่มต้น
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowAddWarehouseModal(false)} className="btn-secondary">ยกเลิก</button>
              <button type="submit" className="btn-primary">บันทึกคลังสินค้า</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: สร้างเอกสารปรับปรุงสต็อก (AJ) */}
      {showAjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleCreateAdjustment} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">สร้างเอกสารปรับปรุงสต็อก (AJ) + Auto-GL</h2>
              <button type="button" onClick={() => setShowAjModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">วันที่เอกสาร</label>
                  <input type="date" value={ajDate} onChange={(e) => setAjDate(e.target.value)} className="input" required />
                </div>
                <div>
                  <label className="label">คลังสินค้า</label>
                  <select value={ajWarehouseId} onChange={(e) => setAjWarehouseId(e.target.value)} className="input" required>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">ประเภทการปรับปรุง</label>
                  <select value={ajType} onChange={(e) => setAjType(e.target.value as any)} className="input">
                    <option value="IN">ปรับเพิ่มเข้าคลัง (+)</option>
                    <option value="OUT">ปรับลด/ตัดชำรุด (-)</option>
                    <option value="COUNT">ตรวจนับยอดคงเหลือจริง (=)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">เหตุผลการปรับปรุง</label>
                <input
                  type="text"
                  value={ajReason}
                  onChange={(e) => setAjReason(e.target.value)}
                  className="input"
                  placeholder="เช่น ตรวจนับสต็อกประจำเดือน / สินค้าชำรุดเสียหาย"
                />
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="table w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs">
                      <th>สินค้า (SKU)</th>
                      <th className="w-28 text-center">จำนวน</th>
                      <th className="w-32 text-right">ต้นทุน/หน่วย</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ajItems.map((row) => (
                      <tr key={row.rowKey}>
                        <td>
                          <select
                            value={row.productId}
                            onChange={(e) => {
                              const pid = e.target.value;
                              const p = products.find((x) => x.id === pid);
                              setAjItems((prev) =>
                                prev.map((it) =>
                                  it.rowKey === row.rowKey
                                    ? { ...it, productId: pid, unitCost: p ? p.costPrice : 0 }
                                    : it
                                )
                              );
                            }}
                            className="input py-1.5 text-sm"
                            required
                          >
                            <option value="">-- เลือกสินค้า --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.code} - {p.name} (คงเหลือ {p.currentStock})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.quantity}
                            onChange={(e) =>
                              setAjItems((prev) =>
                                prev.map((it) =>
                                  it.rowKey === row.rowKey ? { ...it, quantity: Number(e.target.value) } : it
                                )
                              )
                            }
                            className="input py-1.5 text-center text-sm"
                            min="0"
                            step="any"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.unitCost}
                            onChange={(e) =>
                              setAjItems((prev) =>
                                prev.map((it) =>
                                  it.rowKey === row.rowKey ? { ...it, unitCost: Number(e.target.value) } : it
                                )
                              )
                            }
                            className="input py-1.5 text-right text-sm"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            disabled={ajItems.length <= 1}
                            onClick={() => setAjItems((prev) => prev.filter((it) => it.rowKey !== row.rowKey))}
                            className="p-1 text-red-500 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() =>
                  setAjItems((prev) => [
                    ...prev,
                    { rowKey: `${Date.now()}`, productId: '', quantity: 1, unitCost: 0, notes: '' },
                  ])
                }
                className="btn-secondary text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มรายการสินค้า
              </button>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAjModal(false)} className="btn-secondary">
                ยกเลิก
              </button>
              <button type="submit" disabled={ajSubmitting} className="btn-primary">
                {ajSubmitting ? 'กำลังบันทึก...' : 'บันทึกปรับปรุงสต็อก & Auto-GL'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ExpressDetailModal
        docType="aj"
        id={selectedAjId}
        onClose={() => setSelectedAjId(null)}
        onChanged={fetchAll}
      />
    </div>
  );
}
