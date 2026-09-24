'use client'

import { useState, useEffect } from 'react'
import { Building2, Mail, MapPin, Phone, Hash, Save, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    branch: '',
    address: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    // In a real app, fetch from API. Hardcoded seed data for now.
    setFormData({
      name: 'บริษัท ตัวอย่าง จำกัด',
      taxId: '0105566778899',
      branch: 'สำนักงานใหญ่',
      address: '123 ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
      phone: '02-123-4567',
      email: 'contact@example.co.th'
    })
    setLoading(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate API call
    setTimeout(() => {
      toast.success('บันทึกข้อมูลบริษัทสำเร็จ')
      setIsEditing(false)
    }, 500)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าบริษัท</h1>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="btn-secondary"
          >
            แก้ไขข้อมูล
          </button>
        )}
      </div>

      <div className="card shadow-md">
        <div className="card-header bg-gray-50 border-b flex items-center gap-3 py-4">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">ข้อมูลบริษัท</h2>
        </div>
        
        <div className="card-body p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="label text-sm font-medium text-gray-700">ชื่อบริษัท <span className="text-red-500">*</span></label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="input w-full"
                      required
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-800 font-medium">
                      {formData.name}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="label text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    เลขประจำตัวผู้เสียภาษี <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleChange}
                      className="input w-full"
                      required
                      maxLength={13}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-800">
                      {formData.taxId}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="label text-sm font-medium text-gray-700">สาขา</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      className="input w-full"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-800">
                      {formData.branch}
                    </div>
                  )}
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="label text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    ที่อยู่
                  </label>
                  {isEditing ? (
                    <textarea 
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="input w-full min-h-[100px]"
                      rows={3}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-800 whitespace-pre-wrap">
                      {formData.address}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="label text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    โทรศัพท์
                  </label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="input w-full"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-800">
                      {formData.phone || '-'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="label text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    อีเมล
                  </label>
                  {isEditing ? (
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="input w-full"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-800">
                      {formData.email || '-'}
                    </div>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="btn-ghost"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> บันทึกข้อมูล
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
