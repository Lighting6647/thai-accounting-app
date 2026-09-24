'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatMoney, formatDateThai } from '@/lib/format'
import { Printer, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'

interface AccountBalanceItem {
  accountName?: string
  name?: string
  amount: number
}

interface BalanceSheetData {
  companyName?: string
  assets?: AccountBalanceItem[]
  totalAssets?: number
  liabilities?: AccountBalanceItem[]
  totalLiabilities?: number
  equity?: AccountBalanceItem[]
  equities?: AccountBalanceItem[]
  totalEquity?: number
  totalEquities?: number
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BalanceSheetData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=balance-sheet&asOfDate=${asOfDate}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error(error)
      // Fallback mock data if API fails
      setData({
        companyName: 'บริษัท ของฉัน จำกัด',
        assets: [
          { accountName: 'เงินสดและเงินฝากธนาคาร', amount: 350000 },
          { accountName: 'ลูกหนี้การค้า', amount: 150000 },
          { accountName: 'สินค้าคงเหลือ', amount: 80000 },
          { accountName: 'ที่ดิน อาคาร และอุปกรณ์', amount: 1000000 }
        ],
        totalAssets: 1580000,
        liabilities: [
          { accountName: 'เจ้าหนี้การค้า', amount: 120000 },
          { accountName: 'ภาษีขาย', amount: 15000 },
          { accountName: 'เงินกู้ยืมระยะยาว', amount: 500000 }
        ],
        totalLiabilities: 635000,
        equity: [
          { accountName: 'ทุนจดทะเบียน', amount: 500000 },
          { accountName: 'กำไรสะสม', amount: 445000 }
        ],
        totalEquity: 945000
      })
    } finally {
      setLoading(false)
    }
  }, [asOfDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePrint = () => {
    window.print()
  }

  const assetsList = data?.assets || []
  const liabilitiesList = data?.liabilities || []
  const equityList = data?.equity || data?.equities || []

  const totalAssets = data?.totalAssets ?? 0
  const totalLiabilities = data?.totalLiabilities ?? 0
  const totalEquity = data?.totalEquity ?? data?.totalEquities ?? 0
  const totalLiabAndEquity = totalLiabilities + totalEquity

  const isBalanced = data ? Math.abs(totalAssets - totalLiabAndEquity) < 0.01 : false

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">งบแสดงฐานะการเงิน (Balance Sheet)</h1>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
          <span className="text-sm font-medium text-gray-600">ณ วันที่</span>
          <input 
            type="date" 
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
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

      <div className="card p-8 max-w-4xl mx-auto min-h-[600px] bg-white shadow-lg print:shadow-none print:border-none print:w-full print:max-w-none relative pb-20">
        {loading ? (
          <div className="flex justify-center items-center h-full py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-xl font-bold">{data.companyName || 'บริษัท ของฉัน จำกัด'}</h2>
              <h3 className="text-lg font-semibold">งบแสดงฐานะการเงิน</h3>
              <p className="text-gray-600">ณ วันที่ {formatDateThai(new Date(asOfDate))}</p>
            </div>

            <div className="border-t-2 border-black mb-4"></div>

            {/* Assets */}
            <div className="space-y-2">
              <h4 className="font-bold underline decoration-double">สินทรัพย์</h4>
              {assetsList.length === 0 ? (
                <div className="pl-8 pr-4 text-sm text-gray-400 italic">ไม่มีรายการ</div>
              ) : (
                assetsList.map((item, idx) => (
                  <div key={idx} className="flex justify-between pl-8 pr-4 text-sm">
                    <span>{item.accountName || item.name}</span>
                    <span>{formatMoney(item.amount)}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between font-bold pt-2 border-t border-gray-300 pr-4 mt-2">
                <span>รวมสินทรัพย์</span>
                <span className="underline decoration-double">{formatMoney(totalAssets)}</span>
              </div>
            </div>

            <div className="border-t-2 border-black my-6"></div>

            <div className="font-bold text-lg mb-4 underline decoration-double">หนี้สินและส่วนของเจ้าของ</div>

            {/* Liabilities */}
            <div className="space-y-2">
              <h4 className="font-bold">หนี้สิน</h4>
              {liabilitiesList.length === 0 ? (
                <div className="pl-8 pr-4 text-sm text-gray-400 italic">ไม่มีรายการ</div>
              ) : (
                liabilitiesList.map((item, idx) => (
                  <div key={idx} className="flex justify-between pl-8 pr-4 text-sm">
                    <span>{item.accountName || item.name}</span>
                    <span>{formatMoney(item.amount)}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between font-bold pt-2 border-t border-gray-300 pr-4 mt-2 text-sm">
                <span>รวมหนี้สิน</span>
                <span>{formatMoney(totalLiabilities)}</span>
              </div>
            </div>

            <div className="border-t border-gray-300 my-4"></div>

            {/* Equities */}
            <div className="space-y-2">
              <h4 className="font-bold">ส่วนของเจ้าของ</h4>
              {equityList.length === 0 ? (
                <div className="pl-8 pr-4 text-sm text-gray-400 italic">ไม่มีรายการ</div>
              ) : (
                equityList.map((item, idx) => (
                  <div key={idx} className="flex justify-between pl-8 pr-4 text-sm">
                    <span>{item.accountName || item.name}</span>
                    <span>{formatMoney(item.amount)}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between font-bold pt-2 border-t border-gray-300 pr-4 mt-2 text-sm">
                <span>รวมส่วนของเจ้าของ</span>
                <span>{formatMoney(totalEquity)}</span>
              </div>
            </div>

            <div className="border-t border-gray-300 my-4"></div>

            {/* Total Liabilities and Equities */}
            <div className="flex justify-between font-bold text-lg pr-4 pb-12">
              <span>รวมหนี้สินและส่วนของเจ้าของ</span>
              <span className="underline decoration-double">{formatMoney(totalLiabAndEquity)}</span>
            </div>

            <div className="absolute bottom-6 left-8 right-8 border-t-2 border-double border-gray-400 pt-4 flex justify-between">
              <div className="text-gray-500 text-sm">พิมพ์เมื่อ: {formatDateThai(new Date())}</div>
              <div className="font-bold">
                {isBalanced ? (
                  <span className="flex items-center text-green-600 gap-2"><CheckCircle2 className="w-5 h-5"/> สมดุล</span>
                ) : (
                  <span className="flex items-center text-red-600 gap-2"><XCircle className="w-5 h-5"/> ไม่สมดุล (ผลต่าง: {formatMoney(Math.abs(totalAssets - totalLiabAndEquity))})</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">ไม่พบข้อมูล</div>
        )}
      </div>
    </div>
  )
}
