'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { INCOME_TYPES, WHT_RATES } from '@/lib/tax-engine'

type Contact = {
  id: string
  name: string
}

export default function NewWhtPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])

  const [taxType, setTaxType] = useState('PND3')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [payerId, setPayerId] = useState('')
  const [receiverId, setReceiverId] = useState('')

  const [incomeType, setIncomeType] = useState<string>(INCOME_TYPES[0].code)
  const [incomeCategory, setIncomeCategory] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [whtRate, setWhtRate] = useState<number>(3)
  const [condition, setCondition] = useState('DEDUCT')

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch('/api/contacts')
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

  const whtAmount = amount * (whtRate / 100)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!payerId || !receiverId) {
      toast.error('กรุณาระบุผู้จ่ายเงินและผู้รับเงิน')
      return
    }

    if (amount <= 0) {
      toast.error('จำนวนเงินต้องมากกว่า 0')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/wht', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: taxType,
          paymentDate: date,
          payerContactId: payerId,
          payeeContactId: receiverId,
          incomeType,
          incomeCategory: incomeCategory || 'ค่าบริการ',
          baseAmount: amount,
          whtRate,
          whtCondition: condition === 'DEDUCT' ? '1' : condition === 'FOREVER' ? '2' : '3'
        })
      })

      if (!res.ok) throw new Error('Failed to create WHT document')

      toast.success('สร้างหนังสือรับรองหัก ณ ที่จ่าย สำเร็จ')
      router.push('/tax/wht')
    } catch (error) {
      console.error(error)
      toast.error('เกิดข้อผิดพลาดในการสร้างหนังสือรับรอง')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">สร้างหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ)</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">รายละเอียด 50 ทวิ</h2>
        </div>
        <div className="card-body space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label">แบบภาษี</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                className="input"
              >
                <option value="PND3">ภ.ง.ด.3 บุคคลธรรมดา</option>
                <option value="PND53">ภ.ง.ด.53 นิติบุคคล</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="label">วันที่จ่าย</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="label">ผู้จ่ายเงิน</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="input"
                required
              >
                <option value="">เลือกผู้จ่ายเงิน</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="label">ผู้รับเงิน</label>
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="input"
                required
              >
                <option value="">เลือกผู้รับเงิน</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="label">ประเภทเงินได้</label>
              <select
                value={incomeType}
                onChange={(e) => setIncomeType(e.target.value)}
                className="input"
              >
                {INCOME_TYPES.map(t => (
                  <option key={t.code} value={t.code}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="label">หมวดรายได้ (เช่น ค่าบริการ, ค่าเช่า)</label>
              <input
                type="text"
                value={incomeCategory}
                onChange={(e) => setIncomeCategory(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="label">จำนวนเงินที่จ่าย</label>
              <input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input text-right"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="label">อัตราภาษี %</label>
              <select
                value={whtRate}
                onChange={(e) => setWhtRate(Number(e.target.value))}
                className="input"
              >
                {WHT_RATES.map(r => (
                  <option key={r.rate} value={r.rate}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center border">
            <span className="font-medium text-gray-700">ภาษีที่หัก</span>
            <span className="text-2xl font-bold text-red-600">{formatMoney(whtAmount)}</span>
          </div>

          <div className="space-y-3">
            <label className="label">เงื่อนไข</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="condition" checked={condition === 'DEDUCT'} onChange={() => setCondition('DEDUCT')} className="text-primary-600 focus:ring-primary-500" />
                <span>1. หัก ณ ที่จ่าย</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="condition" checked={condition === 'FOREVER'} onChange={() => setCondition('FOREVER')} className="text-primary-600 focus:ring-primary-500" />
                <span>2. ออกให้ตลอดไป</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="condition" checked={condition === 'ONCE'} onChange={() => setCondition('ONCE')} className="text-primary-600 focus:ring-primary-500" />
                <span>3. ออกให้ครั้งเดียว</span>
              </label>
            </div>
          </div>
        </div>

        <div className="border-t p-6 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={() => router.push('/tax/wht')}
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
