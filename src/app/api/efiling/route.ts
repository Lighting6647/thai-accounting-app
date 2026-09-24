import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { formatDateShort } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const formType = searchParams.get('formType'); // 'PP30' | 'PND3' | 'PND53'
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

    const company = await prisma.company.findFirst();
    const companyTaxId = company?.taxId || '0105500000001';
    const companyBranch = company?.branchCode || '00000';

    let textContent = '';

    if (formType === 'PP30') {
      // สรุป ภ.พ.30
      const taxInvoices = await prisma.taxInvoice.findMany({
        where: { taxPeriodMonth: month, taxPeriodYear: year },
        orderBy: { taxInvoiceDate: 'asc' },
      });

      const salesTax = taxInvoices.filter((t) => t.taxType === 'SALES_TAX');
      const purchaseTax = taxInvoices.filter((t) => t.taxType === 'PURCHASE_TAX');

      const salesBase = salesTax.reduce((s, i) => s + i.subtotalAmount, 0);
      const salesVat = salesTax.reduce((s, i) => s + i.vatAmount, 0);
      const purchaseBase = purchaseTax.reduce((s, i) => s + i.subtotalAmount, 0);
      const purchaseVat = purchaseTax.reduce((s, i) => s + i.vatAmount, 0);
      const vatPayable = salesVat - purchaseVat;

      // Pipe-delimited RD e-Filing format for ภ.พ.30
      const lines = [
        `H|${companyTaxId}|${companyBranch}|${year + 543}|${String(month).padStart(2, '0')}|0`, // Header
        `D|${salesBase.toFixed(2)}|${salesVat.toFixed(2)}|${purchaseBase.toFixed(2)}|${purchaseVat.toFixed(2)}|${vatPayable.toFixed(2)}`,
      ];

      textContent = lines.join('\r\n');
    } else if (formType === 'PND3' || formType === 'PND53') {
      // ภ.ง.ด.3 หรือ ภ.ง.ด.53
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const whtItems = await prisma.withholdingTax.findMany({
        where: {
          formType: formType,
          paymentDate: { gte: startDate, lte: endDate },
        },
        include: { payeeContact: true },
        orderBy: { paymentDate: 'asc' },
      });

      const lines = whtItems.map((item, index) => {
        const seq = index + 1;
        const payeeTaxId = item.payeeContact?.taxId || '0000000000000';
        const payeeName = item.payeeContact?.name || '-';
        const payeeAddress = item.payeeContact?.address || '-';
        const pDate = new Date(item.paymentDate);
        const dateStr = `${String(pDate.getDate()).padStart(2, '0')}/${String(pDate.getMonth() + 1).padStart(2, '0')}/${pDate.getFullYear() + 543}`;

        return `${seq}|${payeeTaxId}|${companyBranch}|${payeeName}|${payeeAddress}|${dateStr}|${item.incomeCategory}|${item.whtRate.toFixed(2)}|${item.baseAmount.toFixed(2)}|${item.whtAmount.toFixed(2)}|${item.whtCondition}`;
      });

      textContent = lines.join('\r\n');
    } else {
      return NextResponse.json({ error: 'กรุณาระบุ formType: PP30, PND3 หรือ PND53' }, { status: 400 });
    }

    const filename = `${formType}_${year}${String(month).padStart(2, '0')}.txt`;

    return new Response(textContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('RD e-Filing API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
