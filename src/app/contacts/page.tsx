'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/contacts');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setContacts(data);
      } catch (err) {
        toast.error('ไม่สามารถดึงข้อมูลผู้ติดต่อได้');
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.includes(search) || (c.taxId && c.taxId.includes(search));
    const matchesFilter = filter === 'ALL' || c.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ผู้ติดต่อ</h1>
        <Link href="/contacts/new" className="btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มผู้ติดต่อ
        </Link>
      </div>

      <div className="card">
        <div className="card-header border-b px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2">
            {['ALL', 'CUSTOMER', 'VENDOR'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-sm rounded-md ${
                  filter === tab 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'ALL' ? 'ทั้งหมด' : tab === 'CUSTOMER' ? 'ลูกค้า' : 'คู่ค้า'}
              </button>
            ))}
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ เลขผู้เสียภาษี..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>

        <div className="card-body p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center p-8 text-gray-500">ไม่พบข้อมูลผู้ติดต่อ</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-6 py-3">ชื่อ</th>
                  <th className="px-6 py-3">เลขประจำตัวผู้เสียภาษี</th>
                  <th className="px-6 py-3">สาขา</th>
                  <th className="px-6 py-3">โทรศัพท์</th>
                  <th className="px-6 py-3">อีเมล</th>
                  <th className="px-6 py-3 text-center">ประเภท</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">
                      <Link href={`/contacts/${contact.id}`} className="text-blue-600 hover:underline">
                        {contact.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3">{contact.taxId || '-'}</td>
                    <td className="px-6 py-3">{contact.branch || '-'}</td>
                    <td className="px-6 py-3">{contact.phone || '-'}</td>
                    <td className="px-6 py-3">{contact.email || '-'}</td>
                    <td className="px-6 py-3 text-center">
                      {contact.type === 'CUSTOMER' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          ลูกค้า
                        </span>
                      )}
                      {contact.type === 'VENDOR' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          คู่ค้า
                        </span>
                      )}
                      {contact.type === 'BOTH' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          ลูกค้า/คู่ค้า
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
