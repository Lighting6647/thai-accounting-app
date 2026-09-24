import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { DashboardData } from '@/types';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const revenueResult = await prisma.invoice.aggregate({
      _sum: { netAmount: true },
      where: {
        status: { not: 'VOIDED' },
        invoiceDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    });
    const revenue = revenueResult._sum.netAmount || 0;

    const expenseResult = await prisma.expense.aggregate({
      _sum: { netPayment: true },
      where: {
        status: { not: 'VOIDED' },
        expenseDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    });
    const expenses = expenseResult._sum.netPayment || 0;

    const profit = revenue - expenses;

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const salesTaxResult = await prisma.taxInvoice.aggregate({
      _sum: { vatAmount: true },
      where: {
        taxType: 'SALES_TAX',
        taxPeriodMonth: currentMonth,
        taxPeriodYear: currentYear,
      },
    });
    const purchaseTaxResult = await prisma.taxInvoice.aggregate({
      _sum: { vatAmount: true },
      where: {
        taxType: 'PURCHASE_TAX',
        taxPeriodMonth: currentMonth,
        taxPeriodYear: currentYear,
      },
    });
    const vatPayable = (salesTaxResult._sum.vatAmount || 0) - (purchaseTaxResult._sum.vatAmount || 0);

    const overdueCount = await prisma.invoice.count({
      where: { status: 'OVERDUE' },
    });

    const recentInvoicesRaw = await prisma.invoice.findMany({
      take: 5,
      orderBy: { invoiceDate: 'desc' },
      include: { contact: true },
    });

    const recentExpensesRaw = await prisma.expense.findMany({
      take: 5,
      orderBy: { expenseDate: 'desc' },
      include: { contact: true },
    });

    const monthlyChart = [];
    const monthsName = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const mRev = await prisma.invoice.aggregate({
        _sum: { netAmount: true },
        where: { status: { not: 'VOIDED' }, invoiceDate: { gte: start, lte: end } },
      });
      const mExp = await prisma.expense.aggregate({
        _sum: { netPayment: true },
        where: { status: { not: 'VOIDED' }, expenseDate: { gte: start, lte: end } },
      });

      monthlyChart.push({
        month: `${monthsName[start.getMonth()]} ${(start.getFullYear() + 543) % 100}`,
        revenue: mRev._sum.netAmount || 0,
        expenses: mExp._sum.netPayment || 0,
      });
    }

    const data: DashboardData = {
      revenue,
      expenses,
      profit,
      vatPayable,
      overdueCount,
      recentInvoices: recentInvoicesRaw.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        contactName: inv.contact?.name || 'ทั่วไป',
        status: inv.status as any,
        totalAmount: inv.totalAmount,
        netAmount: inv.netAmount,
      })),
      recentExpenses: recentExpensesRaw.map((exp) => ({
        id: exp.id,
        expenseNumber: exp.expenseNumber,
        expenseDate: exp.expenseDate.toISOString(),
        contactName: exp.contact?.name || 'ทั่วไป',
        category: exp.category,
        status: exp.status as any,
        totalAmount: exp.totalAmount,
        netPayment: exp.netPayment,
      })),
      monthlyChart,
    };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
