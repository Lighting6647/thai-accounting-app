import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { roundMoney } from '@/lib/tax-engine';
import { AgingBucketSummary, AgingDocItem, DashboardData } from '@/types';

export const dynamic = 'force-dynamic';

function buildAgingSummary(
  docs: { id: string; docNumber: string; docDate: Date; dueDate: Date; contactName: string; netAmount: number }[],
  now: Date
): { summary: AgingBucketSummary; items: AgingDocItem[] } {
  const summary: AgingBucketSummary = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    over60: 0,
    total: 0,
    count: docs.length,
  };

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const items: AgingDocItem[] = [];

  for (const doc of docs) {
    const dueStart = new Date(doc.dueDate.getFullYear(), doc.dueDate.getMonth(), doc.dueDate.getDate()).getTime();
    const daysOverdue = Math.floor((todayStart - dueStart) / 86400000);

    let bucket: AgingDocItem['bucket'] = 'ยังไม่ครบกำหนด';
    if (daysOverdue <= 0) {
      summary.current = roundMoney(summary.current + doc.netAmount);
      bucket = 'ยังไม่ครบกำหนด';
    } else if (daysOverdue <= 30) {
      summary.days1to30 = roundMoney(summary.days1to30 + doc.netAmount);
      bucket = '1-30 วัน';
    } else if (daysOverdue <= 60) {
      summary.days31to60 = roundMoney(summary.days31to60 + doc.netAmount);
      bucket = '31-60 วัน';
    } else {
      summary.over60 = roundMoney(summary.over60 + doc.netAmount);
      bucket = 'เกิน 60 วัน';
    }

    summary.total = roundMoney(summary.total + doc.netAmount);
    items.push({
      id: doc.id,
      docNumber: doc.docNumber,
      docDate: doc.docDate.toISOString(),
      dueDate: doc.dueDate.toISOString(),
      contactName: doc.contactName,
      netAmount: doc.netAmount,
      daysOverdue,
      bucket,
    });
  }

  items.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return { summary, items };
}

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
    const rrExpenseResult = await prisma.goodsReceipt.aggregate({
      _sum: { netAmount: true },
      where: {
        status: { not: 'VOIDED' },
        rrDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    });
    const expenses = roundMoney((expenseResult._sum.netPayment || 0) + (rrExpenseResult._sum.netAmount || 0));

    const profit = roundMoney(revenue - expenses);

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
    const vatPayable = roundMoney((salesTaxResult._sum.vatAmount || 0) - (purchaseTaxResult._sum.vatAmount || 0));

    // AR Aging
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { status: { in: ['UNPAID', 'OVERDUE'] } },
      include: { contact: true },
    });
    const arAgingResult = buildAgingSummary(
      unpaidInvoices.map((inv) => ({
        id: inv.id,
        docNumber: inv.invoiceNumber,
        docDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        contactName: inv.contact?.name || 'ทั่วไป',
        netAmount: inv.netAmount,
      })),
      now
    );

    // AP Aging (from Goods Receipts RR)
    const unpaidGoodsReceipts = await prisma.goodsReceipt.findMany({
      where: { status: 'UNPAID' },
      include: { contact: true },
    });
    const apAgingResult = buildAgingSummary(
      unpaidGoodsReceipts.map((rr) => ({
        id: rr.id,
        docNumber: rr.rrNumber,
        docDate: rr.rrDate,
        dueDate: rr.dueDate,
        contactName: rr.contact?.name || 'ทั่วไป',
        netAmount: rr.netAmount,
      })),
      now
    );

    const overdueCount = unpaidInvoices.filter(
      (inv) => inv.status === 'OVERDUE' || inv.dueDate < now
    ).length;

    // Inventory & Low Stock Alert
    const activeProducts = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { currentStock: 'asc' },
    });

    const inventoryValuation = roundMoney(
      activeProducts.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0)
    );
    const lowStockProducts = activeProducts
      .filter((p) => p.currentStock <= p.reorderPoint)
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        currentStock: p.currentStock,
        reorderPoint: p.reorderPoint,
        costPrice: p.costPrice,
      }));

    // Express Workflow Counters
    const [poPendingCount, pvPaidCount, qtPendingCount, soPendingCount, rePaidCount, warehouseCount] =
      await Promise.all([
        prisma.purchaseOrder.count({ where: { status: { in: ['DRAFT', 'APPROVED'] } } }),
        prisma.paymentVoucher.count({ where: { status: 'PAID' } }),
        prisma.quotation.count({ where: { status: { in: ['DRAFT', 'APPROVED'] } } }),
        prisma.salesOrder.count({ where: { status: { in: ['DRAFT', 'APPROVED'] } } }),
        prisma.receipt.count(),
        prisma.warehouse.count({ where: { isActive: true } }),
      ]);

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
      const mRr = await prisma.goodsReceipt.aggregate({
        _sum: { netAmount: true },
        where: { status: { not: 'VOIDED' }, rrDate: { gte: start, lte: end } },
      });

      monthlyChart.push({
        month: `${monthsName[start.getMonth()]} ${(start.getFullYear() + 543) % 100}`,
        revenue: mRev._sum.netAmount || 0,
        expenses: roundMoney((mExp._sum.netPayment || 0) + (mRr._sum.netAmount || 0)),
      });
    }

    const data: DashboardData = {
      revenue,
      expenses,
      profit,
      vatPayable,
      overdueCount,
      inventoryValuation,
      arAging: arAgingResult.summary,
      apAging: apAgingResult.summary,
      arAgingDocs: arAgingResult.items,
      apAgingDocs: apAgingResult.items,
      lowStockProducts,
      expressWorkflow: {
        poPendingCount,
        rrUnpaidCount: unpaidGoodsReceipts.length,
        pvPaidCount,
        qtPendingCount,
        soPendingCount,
        ivUnpaidCount: unpaidInvoices.length,
        rePaidCount,
        warehouseCount,
      },
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
