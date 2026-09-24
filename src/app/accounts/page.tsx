'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { getCategoryLabel } from '@/lib/format';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    nameTh: '',
    nameEn: '',
    category: 'ASSET',
    normalBalance: 'DEBIT',
    parentId: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      toast.error('ไม่สามารถดึงข้อมูลผังบัญชีได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.code.includes(search) || acc.nameTh.includes(search);
    const matchesFilter = filter === 'ALL' || acc.category === filter;
    return matchesSearch && matchesFilter;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) throw new Error('Failed to create');
      
      toast.success('เพิ่มบัญชีสำเร็จ');
      setIsModalOpen(false);
      fetchAccounts();
      setFormData({
        code: '',
        nameTh: '',
        nameEn: '',
        category: 'ASSET',
        normalBalance: 'DEBIT',
        parentId: '',
        isActive: true
      });
    } catch (err) {
      toast.error('ไม่สามารถเพิ่มบัญชีได้');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ASSET': return 'text-blue-600 bg-blue-50';
      case 'LIABILITY': return 'text-red-600 bg-red-50';
      case 'EQUITY': return 'text-purple-600 bg-purple-50';
      case 'REVENUE': return 'text-green-600 bg-green-50';
      case 'EXPENSE': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ผังบัญชี (Chart of Accounts)</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มบัญชี
        </button>
      </div>

      <div className="card">
        <div className="card-header border-b px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                  filter === tab 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'ALL' ? 'ทั้งหมด' : getCategoryLabel(tab)}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="ค้นหารหัส หรือ ชื่อบัญชี..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="card-body p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center p-8 text-gray-500">ไม่พบข้อมูลบัญชี</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-6 py-3">รหัส</th>
                  <th className="px-6 py-3">ชื่อบัญชี</th>
                  <th className="px-6 py-3">หมวด</th>
                  <th className="px-6 py-3">ด้านปกติ</th>
                  <th className="px-6 py-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{acc.code}</td>
                    <td className="px-6 py-3">
                      <div>{acc.nameTh}</div>
                      {acc.nameEn && <div className="text-xs text-gray-500">{acc.nameEn}</div>}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getCategoryColor(acc.category)}`}>
                        {getCategoryLabel(acc.category)}
                      </span>
                    </td>
                    <td className="px-6 py-3">{acc.normalBalance === 'DEBIT' ? 'เดบิต (Dr)' : 'เครดิต (Cr)'}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${acc.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {acc.isActive ? 'ใช้งาน' : 'ระงับ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">เพิ่มบัญชีใหม่</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">รหัสบัญชี</label>
                <input 
                  type="text" 
                  required 
                  className="input" 
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                />
              </div>
              
              <div>
                <label className="label">ชื่อบัญชี (ไทย)</label>
                <input 
                  type="text" 
                  required 
                  className="input" 
                  value={formData.nameTh}
                  onChange={e => setFormData({...formData, nameTh: e.target.value})}
                />
              </div>

              <div>
                <label className="label">ชื่อบัญชี (อังกฤษ)</label>
                <input 
                  type="text" 
                  className="input" 
                  value={formData.nameEn}
                  onChange={e => setFormData({...formData, nameEn: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">หมวดบัญชี</label>
                  <select 
                    className="input" 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="ASSET">สินทรัพย์</option>
                    <option value="LIABILITY">หนี้สิน</option>
                    <option value="EQUITY">ส่วนของเจ้าของ</option>
                    <option value="REVENUE">รายได้</option>
                    <option value="EXPENSE">ค่าใช้จ่าย</option>
                  </select>
                </div>
                
                <div>
                  <label className="label">ด้านปกติ</label>
                  <select 
                    className="input" 
                    value={formData.normalBalance}
                    onChange={e => setFormData({...formData, normalBalance: e.target.value})}
                  >
                    <option value="DEBIT">เดบิต</option>
                    <option value="CREDIT">เครดิต</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm">เปิดใช้งานบัญชีนี้</label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ghost"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
