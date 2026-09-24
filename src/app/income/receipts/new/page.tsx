'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
import FileUploadZone from '@/components/ui/FileUploadZone'

type Invoice = {
  id: string
  docNo: string
  contactName: string
  netTotal: number
}

export default function NewReceiptPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [invoiceId, setInvoiceId] = useState('')
  const [contactName, setContactName] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [whtAmount, setWhtAmount] = useState<number>(0)
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await fetch('/api/invoices?status=UNPAID')
        if (res.ok) {
          const data = await res.json()
          setInvoices(data)
        }
      } catch (error) {
        console.error('Failed to fetch unpaid invoices', error)
      }
    }
    fetchInvoices()
  }, [])

  const handleInvoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    setInvoiceId(selectedId)
    
    if (selectedId) {
      const inv = invoices.find(i => i.id === selectedId)
      if (inv) {
        setContactName(inv.contactName)
        setAmount(inv.netTotal)
      }
    } else {
      setContactName('')
      setAmount(0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!contactName) {
      toast.error('กรุณาระบุผู้จ่ายเงิน')
      return
    }

    if (amount <= 0) {
      toast.error('กรุณาระบุจำนวนเงินให้ถูกต้อง')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptDate: date,
          invoiceId: invoiceId || undefined,
          contactName,
          amount,
          paymentMethod,
          whtAmount,
          attachmentUrl,
          notes: note
        })
      })

      if (!res.ok) throw new Error('Failed to create receipt')
      
      toast.success('สร้างใบเสร็จรับเงินสำเร็จ')
      router.push('/income/receipts')
    } catch (error) {
      console.error(error)
      toast.error('เกิดข้อผิดพลาดในการสร้างใบเสร็จรับเงิน')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">สร้างใบเสร็จรับเงิน</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">รายละเอียดการรับเงิน</h2>
        </div>
        <div className="card-body space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label">วันที่รับเงิน</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="input" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="label">อ้างอิงใบแจ้งหนี้</label>
              <select 
                value={invoiceId} 
                onChange={handleInvoiceChange} 
                className="input"
              >
                <option value="">ไม่มี (รับเงินตรง)</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.docNo} - {inv.contactName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="label">ผู้จ่ายเงิน *</label>
              <input 
                type="text" 
                value={contactName} 
                onChange={(e) => setContactName(e.target.value)} 
                className="input" 
                required 
              />
            </div>

            <div className="space-y-2">
              <label className="label">วิธีชำระเงิน</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)} 
                className="input"
              >
                <option value="CASH">เงินสด</option>
                <option value="TRANSFER">โอนเงิน</option>
                <option value="CHEQUE">เช็ค</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="label">จำนวนเงิน *</label>
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
              <label className="label">ภาษีหัก ณ ที่จ่าย (ถ้ามี)</label>
              <input 
                type="number" 
                value={whtAmount || ''} 
                onChange={(e) => setWhtAmount(Number(e.target.value))} 
                className="input text-right" 
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <FileUploadZone 
            value={attachmentUrl} 
            onChange={setAttachmentUrl} 
            label="แนบสลิป/หลักฐานการชำระเงิน"
          />

          <div className="space-y-2">
            <label className="label">หมายเหตุ</label>
            <textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              className="input min-h-[80px]" 
            />
          </div>
        </div>
        
        <div className="border-t p-6 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button 
            type="button" 
            onClick={() => router.push('/income/receipts')}
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
