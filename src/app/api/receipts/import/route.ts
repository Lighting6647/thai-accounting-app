import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const receiptsData = Array.isArray(body) ? body : [body];

    if (receiptsData.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลใบเสร็จสำหรับนำเข้า' }, { status: 400 });
    }

    const createdReceipts = [];

    for (const item of receiptsData) {
      const receiptDate = item.receiptDate ? new Date(item.receiptDate) : new Date();
      const contactName = item.contactName || 'ทั่วไป';
      const amount = Number(item.amount) || 0;
      const paymentMethod = item.paymentMethod || 'TRANSFER';
      const whtAmount = Number(item.whtAmount) || 0;
      const attachmentUrl = item.attachmentUrl || null;
      const notes = item.notes || item.note || 'นำเข้าจากระบบอัตโนมัติ';

      const receiptNumber = await generateDocNumber('RC');

      const result = await prisma.$transaction(async (tx) => {
        const receipt = await tx.receipt.create({
          data: {
            receiptNumber,
            receiptDate,
            contactName,
            amount,
            paymentMethod,
            whtAmount,
            attachmentUrl,
            notes,
          },
        });

        // Generate Double-Entry Journal Entry
        const bankOrCashCode = paymentMethod === 'CASH' ? '1111' : '1112';
        const cashAccount = await tx.chartOfAccount.findFirst({ where: { code: bankOrCashCode } });
        const arAccount = await tx.chartOfAccount.findFirst({ where: { code: '1120' } });
        const whtAccount = await tx.chartOfAccount.findFirst({ where: { code: '1140' } });

        if (cashAccount && arAccount) {
          const jeLines = [];
          const netCashReceived = amount - whtAmount;

          jeLines.push({
            accountId: cashAccount.id,
            debitAmount: netCashReceived,
            creditAmount: 0,
            description: `รับชำระเงิน (นำเข้า) - ${receiptNumber}`,
          });

          if (whtAmount > 0 && whtAccount) {
            jeLines.push({
              accountId: whtAccount.id,
              debitAmount: whtAmount,
              creditAmount: 0,
              description: `ภาษีหัก ณ ที่จ่าย - ${receiptNumber}`,
            });
          }

          jeLines.push({
            accountId: arAccount.id,
            debitAmount: 0,
            creditAmount: amount,
            description: `ล้างลูกหนี้ (นำเข้า) - ${receiptNumber}`,
          });

          const jvNumber = await generateDocNumber('JV');
          const je = await tx.journalEntry.create({
            data: {
              entryNumber: jvNumber,
              entryDate: receiptDate,
              journalType: 'CASH_RECEIPT',
              memo: `บันทึกรับเงินใบเสร็จเลขที่ ${receiptNumber} (นำเข้า)`,
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

      createdReceipts.push(result);
    }

    return NextResponse.json({
      success: true,
      message: `นำเข้าใบเสร็จเรียบร้อยแล้วจำนวน ${createdReceipts.length} รายการ`,
      count: createdReceipts.length,
      data: createdReceipts,
    });
  } catch (error: any) {
    console.error('Import Receipts API Error:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการนำเข้าใบเสร็จ' }, { status: 500 });
  }
}
