'use client'

import React, { useState, useEffect, useCallback, Fragment } from 'react'
import { formatMoney } from '@/lib/format'
import { Printer, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'

interface TrialBalanceRow {
  accountCode: string
  accountName: string
  category: string
  beginDebit: number
  beginCredit: number
  moveDebit: number
  moveCredit: number
  endDebit: number
  endCredit: number
}

export default function TrialBalancePage() {
  const currentDate = new Date()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(currentDate.toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<TrialBalanceRow[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=trial-balance&startDate=${startDate}&endDate=${endDate}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const result = await res.json()
      if (Array.isArray(result)) {
        setRows(result)
      } else if (result.accounts) {
        setRows(result.accounts.map((a: any) => ({
          accountCode: a.code || a.accountCode,
          accountName: a.name || a.accountName,
          category: a.category,
          beginDebit: a.broughtForwardDebit || a.beginDebit || 0,
          beginCredit: a.broughtForwardCredit || a.beginCredit || 0,
          moveDebit: a.movementDebit || a.moveDebit || 0,
          moveCredit: a.movementCredit || a.moveCredit || 0,
          endDebit: a.balanceDebit || a.endDebit || 0,
          endCredit: a.balanceCredit || a.endCredit || 0,
        })))
      }
    } catch (error) {
      console.error(error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totals = rows.reduce(
    (acc, r) => ({
      beginDebit: acc.beginDebit + (r.beginDebit || 0),
      beginCredit: acc.beginCredit + (r.beginCredit || 0),
      moveDebit: acc.moveDebit + (r.moveDebit || 0),
      moveCredit: acc.moveCredit + (r.moveCredit || 0),
      endDebit: acc.endDebit + (r.endDebit || 0),
      endCredit: acc.endCredit + (r.endCredit || 0),
    }),
    { beginDebit: 0, beginCredit: 0, moveDebit: 0, moveCredit: 0, endDebit: 0, endCredit: 0 }
  )

  const isBalanced = Math.abs(totals.endDebit - totals.endCredit) < 0.01

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">งบทดลอง (Trial Balance)</h1>

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
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
            <Printer className="w-4 h-4" /> พิมพ์
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th rowSpan={2} className="w-24 text-center align-middle border-b border-gray-200">รหัสบัญชี</th>
                <th rowSpan={2} className="align-middle border-b border-gray-200">ชื่อบัญชี</th>
                <th colSpan={2} className="text-center border-b border-gray-200 bg-gray-50">ยอดยกมา</th>
                <th colSpan={2} className="text-center border-b border-gray-200 bg-gray-50 border-l border-r border-gray-200">เคลื่อนไหว</th>
                <th colSpan={2} className="text-center border-b border-gray-200 bg-gray-50">ยอดคงเหลือ</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="w-28 text-right font-medium">เดบิต</th>
                <th className="w-28 text-right font-medium">เครดิต</th>
                <th className="w-28 text-right font-medium border-l border-gray-200">เดบิต</th>
                <th className="w-28 text-right font-medium border-r border-gray-200">เครดิต</th>
                <th className="w-28 text-right font-medium">เดบิต</th>
                <th className="w-28 text-right font-medium">เครดิต</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((acc, index) => {
                  const showCategory = index === 0 || acc.category !== rows[index - 1].category

                  return (
                    <Fragment key={acc.accountCode}>
                      {showCategory && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="font-semibold text-gray-700 py-2 px-4">{acc.category}</td>
                        </tr>
                      )}
                      <tr className="hover:bg-gray-50">
                        <td className="text-center font-mono text-gray-500">{acc.accountCode}</td>
                        <td>{acc.accountName}</td>
                        <td className="text-right">{acc.beginDebit > 0 ? formatMoney(acc.beginDebit) : '-'}</td>
                        <td className="text-right">{acc.beginCredit > 0 ? formatMoney(acc.beginCredit) : '-'}</td>
                        <td className="text-right border-l border-gray-200">{acc.moveDebit > 0 ? formatMoney(acc.moveDebit) : '-'}</td>
                        <td className="text-right border-r border-gray-200">{acc.moveCredit > 0 ? formatMoney(acc.moveCredit) : '-'}</td>
                        <td className="text-right font-medium">{acc.endDebit > 0 ? formatMoney(acc.endDebit) : '-'}</td>
                        <td className="text-right font-medium">{acc.endCredit > 0 ? formatMoney(acc.endCredit) : '-'}</td>
                      </tr>
                    </Fragment>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">ไม่มีข้อมูลในงวดนี้</td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && !loading && (
              <tfoot className="bg-gray-50 font-bold border-t-4 border-double border-gray-400">
                <tr>
                  <td colSpan={2} className="text-right py-4 px-4 flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                      {isBalanced ? (
                        <span className="flex items-center text-green-600 gap-1"><CheckCircle2 className="w-5 h-5"/> ยอดสมดุล</span>
                      ) : (
                        <span className="flex items-center text-red-600 gap-1"><XCircle className="w-5 h-5"/> ยอดไม่สมดุล</span>
                      )}
                    </div>
                    <span>รวมทั้งสิ้น</span>
                  </td>
                  <td className="text-right py-4 px-4">{formatMoney(totals.beginDebit)}</td>
                  <td className="text-right py-4 px-4">{formatMoney(totals.beginCredit)}</td>
                  <td className="text-right py-4 px-4 border-l border-gray-200">{formatMoney(totals.moveDebit)}</td>
                  <td className="text-right py-4 px-4 border-r border-gray-200">{formatMoney(totals.moveCredit)}</td>
                  <td className={`text-right py-4 px-4 ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(totals.endDebit)}</td>
                  <td className={`text-right py-4 px-4 ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(totals.endCredit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
