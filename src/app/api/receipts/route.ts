import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: any = {};
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search } },
        { contactName: { contains: search } },
      ];
    }

    const receipts = await prisma.receipt.findMany({
      where,
      orderBy: { receiptDate: 'desc' },
      include: { invoice: true },
    });

    const formatted = receipts.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      receiptDate: r.receiptDate.toISOString(),
      contactName: r.contactName || 'ทั่วไป',
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      attachmentUrl: r.attachmentUrl,
      invoiceNumber: r.invoice?.invoiceNumber || null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Receipts API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { receiptDate, invoiceId, contactName, amount, paymentMethod, whtAmount, attachmentUrl, notes } = body;

    const receiptNumber = await generateDocNumber('RC');
    const whtAmt = Number(whtAmount) || 0;

    let targetContactName = contactName || 'ทั่วไป';

    if (invoiceId) {
      const inv = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { contact: true },
      });
      if (inv?.contact?.name) {
        targetContactName = inv.contact.name;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          receiptDate: new Date(receiptDate),
          invoiceId: invoiceId || null,
          contactName: targetContactName,
          amount: Number(amount) || 0,
          paymentMethod: paymentMethod || 'TRANSFER',
          whtAmount: whtAmt,
          attachmentUrl: attachmentUrl || null,
          notes,
        },
      });

      if (invoiceId) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: 'PAID' },
        });
      }

      // Journal Entry
      // Dr. เงินสด / เงินฝากธนาคาร
      const bankOrCashCode = paymentMethod === 'CASH' ? '1111' : '1112';
      const cashAccount = await tx.chartOfAccount.findFirst({ where: { code: bankOrCashCode } });
      const arAccount = await tx.chartOfAccount.findFirst({ where: { code: '1120' } });
      const whtAccount = await tx.chartOfAccount.findFirst({ where: { code: '1140' } });

      if (cashAccount && arAccount) {
        const jeLines = [];
        const netCashReceived = (Number(amount) || 0) - whtAmt;

        jeLines.push({
          accountId: cashAccount.id,
          debitAmount: netCashReceived,
          creditAmount: 0,
          description: `รับชำระเงิน - ${receiptNumber}`,
        });

        if (whtAmt > 0 && whtAccount) {
          jeLines.push({
            accountId: whtAccount.id,
            debitAmount: whtAmt,
            creditAmount: 0,
            description: `ภาษีหัก ณ ที่จ่าย - ${receiptNumber}`,
          });
        }

        jeLines.push({
          accountId: arAccount.id,
          debitAmount: 0,
          creditAmount: Number(amount) || 0,
          description: `ล้างลูกหนี้ - ${receiptNumber}`,
        });

        const jvNumber = await generateDocNumber('JV');
        const je = await tx.journalEntry.create({
          data: {
            entryNumber: jvNumber,
            entryDate: new Date(receiptDate),
            journalType: 'CASH_RECEIPT',
            memo: `บันทึกรับเงินใบเสร็จเลขที่ ${receiptNumber}`,
            sourceDocumentType: 'RECEIPT',
            sourceDocumentId: receipt.id,
            lines: { create: jeLines },
          },
        });

        await tx.receipt.update({
          where: { id: receipt.id },
          data: { journalEntryId: je.id },
        });
      }

      return receipt;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Receipts API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
