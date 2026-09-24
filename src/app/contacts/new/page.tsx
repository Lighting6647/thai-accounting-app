'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'

export default function NewContactPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    branchType: 'HEAD_OFFICE',
    branchCode: '00000',
    address: '',
    phone: '',
    email: '',
    isCustomer: true,
    isVendor: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      toast.error('กรุณาระบุชื่อผู้ติดต่อ')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error('Failed to create contact')
      
      toast.success('เพิ่มผู้ติดต่อสำเร็จ')
      router.push('/contacts')
    } catch (error) {
      console.error(error)
      toast.error('เกิดข้อผิดพลาดในการเพิ่มผู้ติดต่อ')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">เพิ่มผู้ติดต่อใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">ข้อมูลผู้ติดต่อ</h2>
        </div>
        <div className="card-body space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label">ชื่อ *</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                className="input" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="label">เลขประจำตัวผู้เสียภาษี</label>
              <input 
                type="text" 
                name="taxId" 
                value={formData.taxId} 
                onChange={handleChange} 
                className="input"
                maxLength={13}
              />
            </div>

            <div className="space-y-2">
              <label className="label">ประเภทสาขา</label>
              <select 
                name="branchType" 
                value={formData.branchType} 
                onChange={handleChange} 
                className="input"
              >
                <option value="HEAD_OFFICE">สำนักงานใหญ่</option>
                <option value="BRANCH">สาขา</option>
              </select>
            </div>

            {formData.branchType === 'BRANCH' && (
              <div className="space-y-2">
                <label className="label">รหัสสาขา</label>
                <input 
                  type="text" 
                  name="branchCode" 
                  value={formData.branchCode} 
                  onChange={handleChange} 
                  className="input" 
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="label">โทรศัพท์</label>
              <input 
                type="text" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                className="input" 
              />
            </div>

            <div className="space-y-2">
              <label className="label">อีเมล</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                className="input" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">ที่อยู่</label>
            <textarea 
              name="address" 
              value={formData.address} 
              onChange={handleChange} 
              className="input min-h-[100px]" 
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                name="isCustomer" 
                checked={formData.isCustomer} 
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" 
              />
              <span>เป็นลูกค้า</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                name="isVendor" 
                checked={formData.isVendor} 
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" 
              />
              <span>เป็นคู่ค้า</span>
            </label>
          </div>
        </div>
        
        <div className="border-t p-6 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button 
            type="button" 
            onClick={() => router.push('/contacts')}
            className="btn-ghost"
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            ยกเลิก
          </button>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading}
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
