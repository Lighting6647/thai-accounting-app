'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Search, Loader2, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/format';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Form State - Add Product
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('ชิ้น');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [reorderPoint, setReorderPoint] = useState<number>(5);

  // Form State - Adjust Stock
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลสินค้าได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

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
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create product');
      }

      toast.success('เพิ่มสินค้าเรียบร้อยแล้ว');
      setShowAddModal(false);
      resetAddForm();
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          type: adjustType,
          quantity: adjustQty,
          notes: adjustNotes,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to adjust stock');
      }

      toast.success('ปรับปรุงสต็อกเรียบร้อยแล้ว');
      setShowAdjustModal(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const resetAddForm = () => {
    setCode('');
    setName('');
    setUnit('ชิ้น');
    setSellingPrice(0);
    setCostPrice(0);
    setInitialStock(0);
    setReorderPoint(5);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">สินค้าคงคลัง & คลังสินค้า (Inventory)</h1>
          <p className="text-sm text-gray-500">จัดการรหัสสินค้า, ราคาขาย, ต้นทุนสินค้า และปรับปรุงยอดสต็อกคงเหลือ</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> เพิ่มสินค้าใหม่
        </button>
      </div>

      <div className="card">
        <div className="card-header border-b px-6 py-4 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหารหัส หรือ ชื่อสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-sm w-full"
            />
          </div>
        </div>

        <div className="card-body p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center p-8 text-gray-500">ไม่พบรายการสินค้า</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-6 py-3">รหัสสินค้า</th>
                  <th className="px-6 py-3">ชื่อสินค้า/บริการ</th>
                  <th className="px-6 py-3 text-center">หน่วย</th>
                  <th className="px-6 py-3 text-right">ราคาขาย</th>
                  <th className="px-6 py-3 text-right">ต้นทุน/หน่วย</th>
                  <th className="px-6 py-3 text-center">คงเหลือในคลัง</th>
                  <th className="px-6 py-3 text-center">จัดการสต็อก</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {products.map((p) => {
                  const isLowStock = p.currentStock <= p.reorderPoint;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono font-medium text-gray-900">{p.code}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-6 py-3 text-center text-gray-500">{p.unit}</td>
                      <td className="px-6 py-3 text-right font-medium text-primary-700">{formatMoney(p.sellingPrice)}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{formatMoney(p.costPrice)}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {isLowStock && <AlertCircle className="w-3.5 h-3.5 mr-1" />}
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setShowAdjustModal(true);
                          }}
                          className="btn-secondary text-xs px-2.5 py-1"
                        >
                          ปรับสต็อก
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

      {/* Modal - เพิ่มสินค้าใหม่ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <form onSubmit={handleCreateProduct} className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">เพิ่มสินค้า/บริการใหม่</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">รหัสสินค้า</label>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="input" placeholder="เช่น P-001" required />
              </div>
              <div>
                <label className="label">ชื่อสินค้า</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="ชื่อสินค้า/บริการ" required />
              </div>
              <div>
                <label className="label">หน่วยนับ</label>
                <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className="input" placeholder="ชิ้น, กล่อง, ชม." required />
              </div>
              <div>
                <label className="label">จุดสั่งซื้อเพิ่ม (Reorder)</label>
                <input type="number" value={reorderPoint} onChange={(e) => setReorderPoint(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="label">ราคาขาย (บาท)</label>
                <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="input" step="0.01" />
              </div>
              <div>
                <label className="label">ต้นทุนสินค้า (บาท)</label>
                <input type="number" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} className="input" step="0.01" />
              </div>
              <div className="col-span-2">
                <label className="label">ยอดยกมาเริ่มต้น (จำนวน)</label>
                <input type="number" value={initialStock} onChange={(e) => setInitialStock(Number(e.target.value))} className="input" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">ยกเลิก</button>
              <button type="submit" className="btn-primary">บันทึกสินค้า</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal - ปรับสต็อก */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <form onSubmit={handleAdjustStock} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">ปรับสต็อก: {selectedProduct.name} ({selectedProduct.code})</h2>
            <p className="text-xs text-gray-500">คงเหลือปัจจุบัน: {selectedProduct.currentStock} {selectedProduct.unit}</p>

            <div className="space-y-3">
              <div>
                <label className="label">ประเภทการปรับปรุง</label>
                <select value={adjustType} onChange={(e: any) => setAdjustType(e.target.value)} className="input">
                  <option value="IN">รับเข้าสต็อก (+)</option>
                  <option value="OUT">จ่ายออกจากสต็อก (-)</option>
                  <option value="ADJUST">ปรับยอดคงเหลือให้เป็น (=)</option>
                </select>
              </div>

              <div>
                <label className="label">จำนวน</label>
                <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} className="input" min="0" required />
              </div>

              <div>
                <label className="label">หมายเหตุ</label>
                <input type="text" value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} className="input" placeholder="เช่น นับสต็อกประจำปี" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowAdjustModal(false)} className="btn-secondary">ยกเลิก</button>
              <button type="submit" className="btn-primary">บันทึกปรับสต็อก</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
