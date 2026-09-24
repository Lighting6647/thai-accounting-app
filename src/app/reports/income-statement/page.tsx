'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatMoney, formatDateThai } from '@/lib/format'
import { Printer, RefreshCw } from 'lucide-react'

interface IncomeStatementData {
  companyName: string
  revenues: { name: string; amount: number }[]
  totalRevenue: number
  expenses: { name: string; amount: number }[]
  totalExpense: number
  netProfit: number
}

export default function IncomeStatementPage() {
  const currentDate = new Date()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(currentDate.toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<IncomeStatementData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=income-statement&startDate=${startDate}&endDate=${endDate}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error(error)
      // Mock data if API fails
      setData({
        companyName: 'บริษัท ตัวอย่าง จำกัด',
        revenues: [
          { name: 'รายได้จากการขายสินค้า', amount: 500000 },
          { name: 'รายได้จากการให้บริการ', amount: 150000 },
          { name: 'รายได้อื่น', amount: 5000 }
        ],
        totalRevenue: 655000,
        expenses: [
          { name: 'ต้นทุนขาย', amount: 300000 },
          { name: 'ค่าใช้จ่ายในการขาย', amount: 50000 },
          { name: 'ค่าใช้จ่ายในการบริหาร', amount: 80000 },
          { name: 'ดอกเบี้ยจ่าย', amount: 2000 }
        ],
        totalExpense: 432000,
        netProfit: 223000
      })
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">งบกำไรขาดทุน (Income Statement)</h1>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input text-sm w-36"
          />
          <span className="text-gray-500">-</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input text-sm w-36"
          />
          <button onClick={fetchData} className="btn-ghost p-2" title="รีเฟรช">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
            <Printer className="w-4 h-4" /> พิมพ์
          </button>
        </div>
      </div>

      <div className="card p-8 max-w-4xl mx-auto min-h-[600px] bg-white shadow-lg print:shadow-none print:border-none print:w-full print:max-w-none">
        {loading ? (
          <div className="flex justify-center items-center h-full py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-xl font-bold">{data.companyName}</h2>
              <h3 className="text-lg font-semibold">งบกำไรขาดทุน</h3>
              <p className="text-gray-600">
                สำหรับงวดตั้งแต่วันที่ {formatDateThai(new Date(startDate))} ถึงวันที่ {formatDateThai(new Date(endDate))}
              </p>
            </div>

            <div className="border-t-2 border-black mb-4"></div>

            {/* Revenues */}
            <div className="space-y-2">
              <h4 className="font-bold underline decoration-double">รายได้</h4>
              {data.revenues.map((item, idx) => (
                <div key={idx} className="flex justify-between pl-8 pr-4">
                  <span>{item.name}</span>
                  <span>{formatMoney(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t border-gray-300 pr-4">
                <span>รวมรายได้</span>
                <span>{formatMoney(data.totalRevenue)}</span>
              </div>
            </div>

            <div className="border-t border-gray-300 my-4"></div>

            {/* Expenses */}
            <div className="space-y-2">
              <h4 className="font-bold underline decoration-double">ค่าใช้จ่าย</h4>
              {data.expenses.map((item, idx) => (
                <div key={idx} className="flex justify-between pl-8 pr-4">
                  <span>{item.name}</span>
                  <span>{formatMoney(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t border-gray-300 pr-4">
                <span>รวมค่าใช้จ่าย</span>
                <span>{formatMoney(data.totalExpense)}</span>
              </div>
            </div>

            <div className="border-t-2 border-double border-black my-6"></div>

            {/* Net Profit */}
            <div className="flex justify-between font-bold text-lg pr-4">
              <span>กำไร(ขาดทุน)สุทธิ</span>
              <span className={`underline decoration-double ${data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatMoney(data.netProfit)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">ไม่พบข้อมูล</div>
        )}
      </div>
    </div>
  )
}
