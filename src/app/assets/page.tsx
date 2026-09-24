'use client';

import { useState, useEffect } from 'react';
import { Building, Plus, RefreshCw, Calculator, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateThai } from '@/lib/format';

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeprModal, setShowDeprModal] = useState(false);
  const [deprLoading, setDeprLoading] = useState(false);

  // Form State - Add Asset
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('อุปกรณ์สำนักงาน');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [costValue, setCostValue] = useState<number>(0);
  const [salvageValue, setSalvageValue] = useState<number>(1);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(5);

  // Form State - Run Depreciation
  const [deprYear, setDeprYear] = useState<number>(new Date().getFullYear());
  const [deprMonth, setDeprMonth] = useState<number>(new Date().getMonth() + 1);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error('Failed to fetch assets');
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลสินทรัพย์ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          category,
          purchaseDate,
          costValue,
          salvageValue,
          usefulLifeYears,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create asset');
      }

      toast.success('เพิ่มสินทรัพย์เรียบร้อยแล้ว');
      setShowAddModal(false);
      resetAddForm();
      fetchAssets();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleRunDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeprLoading(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RUN_DEPRECIATION',
          year: deprYear,
          month: deprMonth,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to run depreciation');
      }

      const result = await res.json();
      if (result.message) {
        toast.info(result.message);
      } else {
        toast.success(`คิดค่าเสื่อมราคาเรียบร้อยแล้ว (${result.count} รายการ, รวม ฿${formatMoney(result.totalDepreciation)}) - บันทึกในสมุดรายวันแล้ว`);
      }
      setShowDeprModal(false);
      fetchAssets();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการคำนวณค่าเสื่อมราคา');
    } finally {
      setDeprLoading(false);
    }
  };

  const resetAddForm = () => {
    setCode('');
    setName('');
    setCategory('อุปกรณ์สำนักงาน');
    setCostValue(0);
    setSalvageValue(1);
    setUsefulLifeYears(5);
  };

  const totalCost = assets.reduce((sum, a) => sum + (a.costValue || 0), 0);
  const totalAccum = assets.reduce((sum, a) => sum + (a.accumDepreciation || 0), 0);
  const totalNetBook = totalCost - totalAccum;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ทะเบียนสินทรัพย์ถาวร & ค่าเสื่อมราคา (Fixed Assets)</h1>
          <p className="text-sm text-gray-500">บันทึกสินทรัพย์, คำนวณค่าเสื่อมราคาแบบเส้นตรง (Straight-line) และลงสมุดรายวันอัตโนมัติ</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDeprModal(true)} className="btn-secondary flex items-center gap-2">
            <Calculator className="w-4 h-4 text-purple-600" /> คิดค่าเสื่อมราคาประจำเดือน
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> เพิ่มสินทรัพย์
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-gray-500">ราคาทุนสินทรัพย์รวม</p>
          <h3 className="text-xl font-bold mt-1 text-gray-900">{formatMoney(totalCost)}</h3>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500">ค่าเสื่อมราคาสะสมรวม</p>
          <h3 className="text-xl font-bold mt-1 text-red-600">-{formatMoney(totalAccum)}</h3>
        </div>
        <div className="card p-5 bg-indigo-50 border-indigo-200">
          <p className="text-xs text-indigo-600 font-medium">มูลค่าตามบัญชีสุทธิ (Net Book Value)</p>
          <h3 className="text-xl font-bold mt-1 text-indigo-900">{formatMoney(totalNetBook)}</h3>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center p-8 text-gray-500">ไม่มีรายการสินทรัพย์ถาวร</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3">รหัส</th>
                  <th className="px-4 py-3">ชื่อสินทรัพย์</th>
                  <th className="px-4 py-3">หมวด</th>
                  <th className="px-4 py-3">วันที่ซื้อ</th>
                  <th className="px-4 py-3 text-right">ราคาทุน</th>
                  <th className="px-4 py-3 text-right">ค่าเสื่อมสะสม</th>
                  <th className="px-4 py-3 text-right">มูลค่าตามบัญชี</th>
                  <th className="px-4 py-3 text-right">ค่าเสื่อม/เดือน</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium">{a.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-gray-500">{a.category}</td>
                    <td className="px-4 py-3">{formatDateThai(a.purchaseDate)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(a.costValue)}</td>
                    <td className="px-4 py-3 text-right text-red-600">-{formatMoney(a.accumDepreciation)}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-700">{formatMoney(a.netBookValue)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatMoney(a.monthlyDepr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal - เพิ่มสินทรัพย์ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <form onSubmit={handleCreateAsset} className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">เพิ่มสินทรัพย์ถาวรใหม่</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">รหัสสินทรัพย์</label>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="input" placeholder="เช่น AST-001" required />
              </div>
              <div>
                <label className="label">ชื่อสินทรัพย์</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="เช่น คอมพิวเตอร์ Dell" required />
              </div>
              <div>
                <label className="label">หมวดสินทรัพย์</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                  <option value="อาคาร">อาคาร</option>
                  <option value="อุปกรณ์สำนักงาน">อุปกรณ์สำนักงาน</option>
                  <option value="ยานพาหนะ">ยานพาหนะ</option>
                  <option value="คอมพิวเตอร์และซอฟต์แวร์">คอมพิวเตอร์และซอฟต์แวร์</option>
                </select>
              </div>
              <div>
                <label className="label">วันที่ซื้อ</label>
                <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">ราคาทุน (บาท)</label>
                <input type="number" value={costValue} onChange={(e) => setCostValue(Number(e.target.value))} className="input" step="0.01" required />
              </div>
              <div>
                <label className="label">มูลค่าซาก (บาท)</label>
                <input type="number" value={salvageValue} onChange={(e) => setSalvageValue(Number(e.target.value))} className="input" step="0.01" />
              </div>
              <div className="col-span-2">
                <label className="label">อายุการใช้งาน (ปี)</label>
                <input type="number" value={usefulLifeYears} onChange={(e) => setUsefulLifeYears(Number(e.target.value))} className="input" required />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">ยกเลิก</button>
              <button type="submit" className="btn-primary">บันทึกสินทรัพย์</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal - คิดค่าเสื่อมราคาประจำเดือน */}
      {showDeprModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <form onSubmit={handleRunDepreciation} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">ประมวลผลค่าเสื่อมราคาประจำเดือน</h2>
            <p className="text-xs text-gray-500">ระบบจะคำนวณค่าเสื่อมราคาและลงสมุดรายวันอัตโนมัติ (Dr. 5350 / Cr. 1221)</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">เดือน</label>
                <select value={deprMonth} onChange={(e) => setDeprMonth(Number(e.target.value))} className="input">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>เดือน {i + 1}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">ปี (ค.ศ.)</label>
                <input type="number" value={deprYear} onChange={(e) => setDeprYear(Number(e.target.value))} className="input" required />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setShowDeprModal(false)} className="btn-secondary" disabled={deprLoading}>ยกเลิก</button>
              <button type="submit" className="btn-primary" disabled={deprLoading}>
                {deprLoading ? 'กำลังประมวลผล...' : 'ประมวลผลและลงบัญชี'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
