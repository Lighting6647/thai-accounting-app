'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, X, Plus, Trash2 } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { calculateTax } from '@/lib/tax-engine'

type Contact = {
  id: string
  name: string
}

type InvoiceItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export default function NewInvoicePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const defaultDueDate = new Date()
  defaultDueDate.setDate(defaultDueDate.getDate() + 30)
  const [dueDate, setDueDate] = useState(defaultDueDate.toISOString().split('T')[0])

  const [contactId, setContactId] = useState('')
  const [vatType, setVatType] = useState<'EXCLUSIVE' | 'INCLUSIVE' | 'NO_VAT'>('EXCLUSIVE')
  const [hasWht, setHasWht] = useState(false)
  const [whtRate, setWhtRate] = useState<number>(3)
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ])

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch('/api/contacts?type=customer')
        if (res.ok) {
          const data = await res.json()
          setContacts(data)
        }
      } catch (error) {
        console.error('Failed to fetch contacts', error)
      }
    }
    fetchContacts()
  }, [])

  const handleAddItem = () => {
    setItems([...items, { id: Math.random().toString(), description: '', quantity: 1, unitPrice: 0 }])
  }

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

  const taxResult = calculateTax({
    subtotal: subTotal,
    vatType,
    vatRate: 7,
    whtRate: hasWht ? whtRate : 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contactId) {
      toast.error('กรุณาเลือกลูกค้า')
      return
    }

    if (items.some(i => !i.description || i.quantity <= 0 || i.unitPrice <= 0)) {
      toast.error('กรุณากรอกข้อมูลรายการให้ครบถ้วน')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: date,
          dueDate,
          contactId,
          vatType,
          vatRate: 7,
          whtRate: hasWht ? whtRate : 0,
          notes,
          items: items.map(i => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            amount: i.quantity * i.unitPrice
          }))
        })
      })

      if (!res.ok) throw new Error('Failed to create invoice')

      toast.success('สร้างใบแจ้งหนี้สำเร็จ')
      router.push('/income/invoices')
    } catch (error) {
      console.error(error)
      toast.error('เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">สร้างใบแจ้งหนี้ใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-header">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="label">วันที่ออก</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="label">วันครบกำหนด</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="label">ลูกค้า</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="input"
                required
              >
                <option value="">เลือกลูกค้า</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3">
              <label className="label">ประเภท VAT</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="vatType" checked={vatType === 'EXCLUSIVE'} onChange={() => setVatType('EXCLUSIVE')} className="text-primary-600 focus:ring-primary-500" />
                  <span>แยก VAT</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="vatType" checked={vatType === 'INCLUSIVE'} onChange={() => setVatType('INCLUSIVE')} className="text-primary-600 focus:ring-primary-500" />
                  <span>รวม VAT</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="vatType" checked={vatType === 'NO_VAT'} onChange={() => setVatType('NO_VAT')} className="text-primary-600 focus:ring-primary-500" />
                  <span>ไม่มี VAT</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasWht}
                  onChange={(e) => setHasWht(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                หัก ณ ที่จ่าย
              </label>
              {hasWht && (
                <select
                  value={whtRate}
                  onChange={(e) => setWhtRate(Number(e.target.value))}
                  className="input"
                >
                  <option value={1}>1%</option>
                  <option value={2}>2%</option>
                  <option value={3}>3%</option>
                  <option value={5}>5%</option>
                </select>
              )}
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="label">หมายเหตุ</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>รายละเอียด</th>
                  <th className="w-32">จำนวน</th>
                  <th className="w-48">ราคาต่อหน่วย</th>
                  <th className="w-48 text-right">จำนวนเงิน</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="input"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className="input text-center"
                        min="1"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                        className="input text-right"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="text-right font-medium align-middle">
                      {formatMoney(item.quantity * item.unitPrice)}
                    </td>
                    <td className="align-middle">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between items-start">
            <button
              type="button"
              onClick={handleAddItem}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มรายการ
            </button>

            <div className="w-80 space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ราคาก่อน VAT</span>
                <span>{formatMoney(taxResult.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT 7%</span>
                <span>{formatMoney(taxResult.vatAmount)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>ยอดรวม</span>
                <span>{formatMoney(taxResult.totalAmount)}</span>
              </div>
              {hasWht && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>หัก ณ ที่จ่าย {whtRate}%</span>
                  <span>-{formatMoney(taxResult.whtAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                <span>ยอดสุทธิ</span>
                <span>{formatMoney(taxResult.netAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t p-6 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={() => router.push('/income/invoices')}
            className="btn-ghost"
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            ยกเลิก
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || items.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
