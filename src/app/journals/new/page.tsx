'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, X, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { formatMoney } from '@/lib/format'

type Account = {
  id: string
  code: string
  nameTh: string
}

type JournalLine = {
  id: string
  accountId: string
  debit: number
  credit: number
  description: string
}

export default function NewJournalPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [type, setType] = useState('GENERAL')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', accountId: '', debit: 0, credit: 0, description: '' },
    { id: '2', accountId: '', debit: 0, credit: 0, description: '' }
  ])

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/accounts')
        if (res.ok) {
          const data = await res.json()
          setAccounts(data)
        }
      } catch (error) {
        console.error('Failed to fetch accounts', error)
      }
    }
    fetchAccounts()
  }, [])

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0
  const difference = Math.abs(totalDebit - totalCredit)

  const handleAddLine = () => {
    setLines([...lines, { id: Math.random().toString(), accountId: '', debit: 0, credit: 0, description: '' }])
  }

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 2) {
      toast.error('ต้องมีอย่างน้อย 2 รายการ')
      return
    }
    setLines(lines.filter(l => l.id !== id))
  }

  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setLines(lines.map(l => {
      if (l.id !== id) return l
      const newLine = { ...l, [field]: value }
      if (field === 'debit' && value > 0) newLine.credit = 0
      if (field === 'credit' && value > 0) newLine.debit = 0
      return newLine
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isBalanced) {
      toast.error('ยอดเดบิตและเครดิตต้องเท่ากัน')
      return
    }

    if (lines.some(l => !l.accountId)) {
      toast.error('กรุณาเลือกบัญชีให้ครบทุกรายการ')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryDate: date,
          journalType: type,
          memo: description,
          lines: lines.map(l => ({
            accountId: l.accountId,
            debitAmount: l.debit || 0,
            creditAmount: l.credit || 0,
            description: l.description
          }))
        })
      })

      if (!res.ok) throw new Error('Failed to create journal')

      toast.success('บันทึกรายวันสำเร็จ')
      router.push('/journals')
    } catch (error) {
      console.error(error)
      toast.error('เกิดข้อผิดพลาดในการบันทึกรายวัน')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">บันทึกรายวันใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-header">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="label">วันที่</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="label">ประเภท</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input"
              >
                <option value="GENERAL">ทั่วไป</option>
                <option value="SALES">ขาย</option>
                <option value="PURCHASES">ซื้อ</option>
                <option value="RECEIPTS">รับเงิน</option>
                <option value="PAYMENTS">จ่ายเงิน</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label">รายละเอียด</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-1/3">บัญชี</th>
                  <th>เดบิต</th>
                  <th>เครดิต</th>
                  <th>คำอธิบาย</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <select
                        value={line.accountId}
                        onChange={(e) => updateLine(line.id, 'accountId', e.target.value)}
                        className="input"
                        required
                      >
                        <option value="">เลือกบัญชี</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.code} - {acc.nameTh}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(line.id, 'debit', Number(e.target.value))}
                        className="input text-right"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={line.credit || ''}
                        onChange={(e) => updateLine(line.id, 'credit', Number(e.target.value))}
                        className="input text-right"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        className="input"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <button
              type="button"
              onClick={handleAddLine}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มรายการ
            </button>

            <div className="flex gap-8 items-center bg-gray-50 p-4 rounded-lg">
              <div className="text-right">
                <p className="text-sm text-gray-500">รวมเดบิต</p>
                <p className="text-lg font-medium">{formatMoney(totalDebit)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">รวมเครดิต</p>
                <p className="text-lg font-medium">{formatMoney(totalCredit)}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {isBalanced ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <div className="flex items-center gap-2 text-red-500">
                    <XCircle className="w-6 h-6" />
                    <span className="font-medium">ผลต่าง: {formatMoney(difference)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t p-6 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={() => router.push('/journals')}
            className="btn-ghost"
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            ยกเลิก
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !isBalanced || lines.length < 2}
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
