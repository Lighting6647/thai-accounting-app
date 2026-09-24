import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'trial-balance') {
      const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();

      const accounts = await prisma.chartOfAccount.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });

      const trialBalanceRows = await Promise.all(
        accounts.map(async (acc) => {
          // Beginning balance (before startDate)
          const beginLines = await prisma.journalLine.aggregate({
            _sum: { debitAmount: true, creditAmount: true },
            where: {
              accountId: acc.id,
              journalEntry: {
                entryDate: { lt: startDate },
                status: 'POSTED',
              },
            },
          });
          const beginDebit = beginLines._sum.debitAmount || 0;
          const beginCredit = beginLines._sum.creditAmount || 0;

          // Movements during period (startDate to endDate)
          const moveLines = await prisma.journalLine.aggregate({
            _sum: { debitAmount: true, creditAmount: true },
            where: {
              accountId: acc.id,
              journalEntry: {
                entryDate: { gte: startDate, lte: endDate },
                status: 'POSTED',
              },
            },
          });
          const moveDebit = moveLines._sum.debitAmount || 0;
          const moveCredit = moveLines._sum.creditAmount || 0;

          // Ending balance
          const netDebit = (beginDebit + moveDebit) - (beginCredit + moveCredit);
          let endDebit = 0;
          let endCredit = 0;
          if (netDebit >= 0) {
            endDebit = netDebit;
          } else {
            endCredit = Math.abs(netDebit);
          }

          return {
            accountCode: acc.code,
            accountName: acc.nameTh,
            category: acc.category as any,
            beginDebit,
            beginCredit,
            moveDebit,
            moveCredit,
            endDebit,
            endCredit,
          };
        })
      );

      // Filter out rows that have all zeros
      const filtered = trialBalanceRows.filter(
        (r) => r.beginDebit > 0 || r.beginCredit > 0 || r.moveDebit > 0 || r.moveCredit > 0 || r.endDebit > 0 || r.endCredit > 0
      );

      return NextResponse.json(filtered);
    }

    if (type === 'income-statement') {
      const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();

      const revenueAccounts = await prisma.chartOfAccount.findMany({
        where: { category: 'REVENUE', isActive: true },
      });
      const expenseAccounts = await prisma.chartOfAccount.findMany({
        where: { category: 'EXPENSE', isActive: true },
      });

      const revenues = await Promise.all(
        revenueAccounts.map(async (acc) => {
          const lines = await prisma.journalLine.aggregate({
            _sum: { debitAmount: true, creditAmount: true },
            where: {
              accountId: acc.id,
              journalEntry: { entryDate: { gte: startDate, lte: endDate }, status: 'POSTED' },
            },
          });
          const amount = (lines._sum.creditAmount || 0) - (lines._sum.debitAmount || 0);
          return { accountName: acc.nameTh, amount };
        })
      );

      const expenses = await Promise.all(
        expenseAccounts.map(async (acc) => {
          const lines = await prisma.journalLine.aggregate({
            _sum: { debitAmount: true, creditAmount: true },
            where: {
              accountId: acc.id,
              journalEntry: { entryDate: { gte: startDate, lte: endDate }, status: 'POSTED' },
            },
          });
          const amount = (lines._sum.debitAmount || 0) - (lines._sum.creditAmount || 0);
          return { accountName: acc.nameTh, amount };
        })
      );

      const activeRevenues = revenues.filter((r) => r.amount !== 0);
      const activeExpenses = expenses.filter((e) => e.amount !== 0);

      const totalRevenue = activeRevenues.reduce((sum, r) => sum + r.amount, 0);
      const totalExpense = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalRevenue - totalExpense;

      return NextResponse.json({
        revenues: activeRevenues,
        expenses: activeExpenses,
        totalRevenue,
        totalExpense,
        netProfit,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
      });
    }

    if (type === 'balance-sheet') {
      const asOfDate = searchParams.get('asOfDate') ? new Date(searchParams.get('asOfDate')!) : new Date();

      const getAccountBalances = async (category: string) => {
        const accounts = await prisma.chartOfAccount.findMany({
          where: { category, isActive: true },
        });
        const balances = await Promise.all(
          accounts.map(async (acc) => {
            const lines = await prisma.journalLine.aggregate({
              _sum: { debitAmount: true, creditAmount: true },
              where: {
                accountId: acc.id,
                journalEntry: { entryDate: { lte: asOfDate }, status: 'POSTED' },
              },
            });
            const debit = lines._sum.debitAmount || 0;
            const credit = lines._sum.creditAmount || 0;
            const amount = acc.normalBalance === 'DEBIT' ? debit - credit : credit - debit;
            return { accountName: acc.nameTh, amount };
          })
        );
        return balances.filter((b) => b.amount !== 0);
      };

      const company = await prisma.company.findFirst();
      const assets = await getAccountBalances('ASSET');
      const liabilities = await getAccountBalances('LIABILITY');
      const equity = await getAccountBalances('EQUITY');

      const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
      const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
      const totalEquity = equity.reduce((sum, e) => sum + e.amount, 0);

      return NextResponse.json({
        companyName: company?.name || 'บริษัท ของฉัน จำกัด',
        assets,
        liabilities,
        equity,
        equities: equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalEquities: totalEquity,
        asOfDate: asOfDate.toISOString(),
      });
    }

    if (type === 'vat-report') {
      const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);
      const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

      const taxInvoices = await prisma.taxInvoice.findMany({
        where: {
          taxPeriodMonth: month,
          taxPeriodYear: year,
        },
        orderBy: { taxInvoiceDate: 'asc' },
      });

      const salesTax = taxInvoices
        .filter((t) => t.taxType === 'SALES_TAX')
        .map((t, idx) => ({
          seq: idx + 1,
          taxInvoiceNumber: t.taxInvoiceNumber,
          taxInvoiceDate: t.taxInvoiceDate.toISOString(),
          contactName: t.contactName,
          contactTaxId: t.contactTaxId,
          contactBranch: t.contactBranch,
          subtotalAmount: t.subtotalAmount,
          vatAmount: t.vatAmount,
        }));

      const purchaseTax = taxInvoices
        .filter((t) => t.taxType === 'PURCHASE_TAX')
        .map((t, idx) => ({
          seq: idx + 1,
          taxInvoiceNumber: t.taxInvoiceNumber,
          taxInvoiceDate: t.taxInvoiceDate.toISOString(),
          contactName: t.contactName,
          contactTaxId: t.contactTaxId,
          contactBranch: t.contactBranch,
          subtotalAmount: t.subtotalAmount,
          vatAmount: t.vatAmount,
        }));

      const totalSalesBase = salesTax.reduce((sum, s) => sum + s.subtotalAmount, 0);
      const totalSalesVat = salesTax.reduce((sum, s) => sum + s.vatAmount, 0);
      const totalPurchaseBase = purchaseTax.reduce((sum, p) => sum + p.subtotalAmount, 0);
      const totalPurchaseVat = purchaseTax.reduce((sum, p) => sum + p.vatAmount, 0);
      const vatPayable = totalSalesVat - totalPurchaseVat;

      return NextResponse.json({
        month,
        year,
        salesTax,
        purchaseTax,
        totalSalesBase,
        totalSalesVat,
        totalPurchaseBase,
        totalPurchaseVat,
        vatPayable,
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error: any) {
    console.error('Reports API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
