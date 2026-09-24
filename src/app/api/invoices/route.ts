import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { calculateTax } from '@/lib/tax-engine';
import { createInvoiceSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (id) {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          contact: true,
          items: true,
          receipts: true,
          taxInvoice: true,
        },
      });

      if (!invoice) {
        return NextResponse.json({ error: 'ไม่พบใบแจ้งหนี้' }, { status: 404 });
      }

      let journalEntry = null;
      if (invoice.journalEntryId) {
        journalEntry = await prisma.journalEntry.findUnique({
          where: { id: invoice.journalEntryId },
          include: { lines: { include: { account: true } } },
        });
      }

      return NextResponse.json({ ...invoice, journalEntry });
    }

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { contact: { name: { contains: search } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      include: { contact: true, items: true },
    });

    const formattedInvoices = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      contactName: inv.contact?.name || 'ทั่วไป',
      status: inv.status,
      totalAmount: inv.totalAmount,
      netAmount: inv.netAmount,
    }));

    return NextResponse.json(formattedInvoices);
  } catch (error: any) {
    console.error('Invoices API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = createInvoiceSchema.safeParse(rawBody);

    if (!validation.success) {
      const errorMessage = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const body = validation.data;

    let subtotalRaw = 0;
    body.items.forEach((item) => {
      subtotalRaw += item.quantity * item.unitPrice;
    });

    const taxResult = calculateTax({
      subtotal: subtotalRaw,
      vatType: body.vatType,
      vatRate: body.vatRate,
      whtRate: body.whtRate,
    });

    const invoiceNumber = await generateDocNumber('IV');

    const contact = await prisma.contact.findUnique({
      where: { id: body.contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: new Date(body.invoiceDate),
          dueDate: new Date(body.dueDate),
          contactId: body.contactId,
          vatType: body.vatType,
          subtotal: taxResult.subtotal,
          vatRate: taxResult.vatRate,
          vatAmount: taxResult.vatAmount,
          whtRate: taxResult.whtRate,
          whtAmount: taxResult.whtAmount,
          totalAmount: taxResult.totalAmount,
          netAmount: taxResult.netAmount,
          notes: body.notes,
          status: 'UNPAID',
          items: {
            create: body.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
            })),
          },
        },
      });

      // Journal Entry
      const arAccount = await tx.chartOfAccount.findFirst({ where: { code: '1120' } });
      const whtAccount = await tx.chartOfAccount.findFirst({ where: { code: '1140' } });
      const revenueAccount = await tx.chartOfAccount.findFirst({ where: { code: '4100' } });
      const vatAccount = await tx.chartOfAccount.findFirst({ where: { code: '2120' } });

      if (arAccount && revenueAccount) {
        const jeLines = [];
        // Dr. ลูกหนี้การค้า
        jeLines.push({
          accountId: arAccount.id,
          debitAmount: taxResult.netAmount,
          creditAmount: 0,
          description: `ลูกหนี้การค้า - ${invoiceNumber}`,
        });
        // Dr. WHT ค้างรับ (ถ้ามี)
        if (taxResult.whtAmount > 0 && whtAccount) {
          jeLines.push({
            accountId: whtAccount.id,
            debitAmount: taxResult.whtAmount,
            creditAmount: 0,
            description: `ภาษีหัก ณ ที่จ่ายค้างรับ - ${invoiceNumber}`,
          });
        }
        // Cr. รายได้จากการขายสินค้า
        jeLines.push({
          accountId: revenueAccount.id,
          debitAmount: 0,
          creditAmount: taxResult.subtotal,
          description: `รายได้ - ${invoiceNumber}`,
        });
        // Cr. ภาษีขาย (ถ้ามี)
        if (taxResult.vatAmount > 0 && vatAccount) {
          jeLines.push({
            accountId: vatAccount.id,
            debitAmount: 0,
            creditAmount: taxResult.vatAmount,
            description: `ภาษีขาย - ${invoiceNumber}`,
          });
        }

        const jvNumber = await generateDocNumber('JV');
        const je = await tx.journalEntry.create({
          data: {
            entryNumber: jvNumber,
            entryDate: new Date(body.invoiceDate),
            journalType: 'SALES',
            memo: `ตั้งลูกหนี้ใบแจ้งหนี้เลขที่ ${invoiceNumber}`,
            sourceDocumentType: 'INVOICE',
            sourceDocumentId: invoice.id,
            lines: { create: jeLines },
          },
        });

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { journalEntryId: je.id },
        });
      }

      // Tax Invoice (ถ้ามี VAT)
      if (taxResult.vatAmount > 0) {
        const invDate = new Date(body.invoiceDate);
        await tx.taxInvoice.create({
          data: {
            taxType: 'SALES_TAX',
            taxInvoiceNumber: invoiceNumber,
            taxInvoiceDate: invDate,
            taxPeriodMonth: invDate.getMonth() + 1,
            taxPeriodYear: invDate.getFullYear(),
            contactName: contact.name,
            contactTaxId: contact.taxId || '-',
            contactBranch: contact.branchCode || '00000',
            subtotalAmount: taxResult.subtotal,
            vatRate: taxResult.vatRate,
            vatAmount: taxResult.vatAmount,
            invoiceId: invoice.id,
          },
        });
      }

      return invoice;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Invoices API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// VOID / ยกเลิกใบแจ้งหนี้ พร้อมสร้าง Reversal Journal Entry
export async function PATCH(request: Request) {
  try {
    const { id, action } = await request.json();
    if (!id || action !== 'VOID') {
      return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'ไม่พบใบแจ้งหนี้' }, { status: 404 });
    }

    if (invoice.status === 'VOIDED') {
      return NextResponse.json({ error: 'ใบแจ้งหนี้นี้ถูกยกเลิกไปแล้ว' }, { status: 400 });
    }

    const journalEntry = invoice.journalEntryId
      ? await prisma.journalEntry.findUnique({
          where: { id: invoice.journalEntryId },
          include: { lines: true },
        })
      : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. อัปเดตสถานะเป็น VOIDED
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: { status: 'VOIDED' },
      });

      // 2. ถ้ามี Journal Entry เดิม ให้สร้าง Reversal Entry
      if (journalEntry) {
        const revDocNumber = await generateDocNumber('JV');

        // สลับขา Dr. เป็น Cr. และ Cr. เป็น Dr.
        const reversedLines = journalEntry.lines.map((line) => ({
          accountId: line.accountId,
          debitAmount: line.creditAmount,
          creditAmount: line.debitAmount,
          description: `กลับรายการยกเลิก ${invoice.invoiceNumber}`,
        }));

        await tx.journalEntry.create({
          data: {
            entryNumber: revDocNumber,
            entryDate: new Date(),
            journalType: 'SALES',
            memo: `ยกเลิกใบแจ้งหนี้เลขที่ ${invoice.invoiceNumber}`,
            sourceDocumentType: 'INVOICE_VOID',
            sourceDocumentId: invoice.id,
            lines: { create: reversedLines },
          },
        });
      }

      // 3. ลบ Tax Invoice ออกเพื่อไม่ให้ติดในรายงานภาษี
      await tx.taxInvoice.deleteMany({
        where: { invoiceId: id },
      });

      return updatedInvoice;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Invoice VOID Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
