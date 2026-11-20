import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { roundMoney } from '@/lib/tax-engine';
import { getAccountMap } from '@/lib/erp-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');

    if (id) {
      const pv = await prisma.paymentVoucher.findUnique({
        where: { id },
        include: { rr: true, contact: true },
      });
      if (!pv) {
        return NextResponse.json({ error: 'ไม่พบใบสำคัญจ่าย' }, { status: 404 });
      }
      const journalEntry = pv.journalEntryId
        ? await prisma.journalEntry.findUnique({
            where: { id: pv.journalEntryId },
            include: { lines: { include: { account: true } } },
          })
        : null;
      return NextResponse.json({ ...pv, journalEntry });
    }

    const where: any = {};
    if (search) {
      where.OR = [
        { pvNumber: { contains: search } },
        { contactName: { contains: search } },
      ];
    }

    const vouchers = await prisma.paymentVoucher.findMany({
      where,
      orderBy: { pvDate: 'desc' },
      include: { rr: true, contact: true },
    });

    const formatted = vouchers.map((pv) => ({
      id: pv.id,
      pvNumber: pv.pvNumber,
      pvDate: pv.pvDate.toISOString(),
      rrNumber: pv.rr?.rrNumber || null,
      contactName: pv.contactName || pv.contact?.name || '-',
      paymentMethod: pv.paymentMethod,
      chequeNumber: pv.chequeNumber,
      amount: pv.amount,
      whtAmount: pv.whtAmount,
      netPaid: pv.netPaid,
      status: pv.status,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('PaymentVouchers GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      pvDate,
      rrId,
      contactId,
      contactName,
      paymentMethod = 'TRANSFER',
      chequeNumber,
      amount,
      whtAmount = 0,
      notes,
    } = body;

    const grossAmount = roundMoney(Number(amount) || 0);
    const whtAmt = roundMoney(Number(whtAmount) || 0);

    if (grossAmount <= 0) {
      return NextResponse.json({ error: 'จำนวนเงินที่จ่ายต้องมากกว่า 0' }, { status: 400 });
    }
    if (whtAmt > grossAmount) {
      return NextResponse.json({ error: 'ภาษีหัก ณ ที่จ่ายต้องไม่เกินยอดหนี้' }, { status: 400 });
    }

    const netPaid = roundMoney(grossAmount - whtAmt);
    const payDate = pvDate ? new Date(pvDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      let targetContactId = contactId || null;
      let targetContactName = contactName || 'ทั่วไป';

      if (rrId) {
        const rr = await tx.goodsReceipt.findUnique({
          where: { id: rrId },
          include: { contact: true },
        });
        if (!rr) throw new Error('ไม่พบใบรับสินค้า/ตั้งเจ้าหนี้ที่อ้างอิง');
        if (rr.status === 'PAID') throw new Error('ใบรับสินค้านี้ชำระหนี้ครบแล้ว');
        if (rr.status === 'VOIDED') throw new Error('ไม่สามารถจ่ายชำระหนี้เอกสารที่ยกเลิกแล้ว');

        targetContactId = rr.contactId;
        targetContactName = rr.contact?.name || targetContactName;

        await tx.goodsReceipt.update({
          where: { id: rrId },
          data: { status: 'PAID' },
        });
      } else if (targetContactId) {
        const contact = await tx.contact.findUnique({ where: { id: targetContactId } });
        if (contact) targetContactName = contact.name;
      }

      const pvNumber = await generateDocNumber('PV', tx);

      const pv = await tx.paymentVoucher.create({
        data: {
          pvNumber,
          pvDate: payDate,
          rrId: rrId || null,
          contactId: targetContactId,
          contactName: targetContactName,
          paymentMethod,
          chequeNumber: chequeNumber || null,
          amount: grossAmount,
          whtAmount: whtAmt,
          netPaid,
          status: 'PAID',
          notes: notes || null,
        },
      });

      // Auto-GL: Dr. 2110 เจ้าหนี้การค้า, Cr. 1111/1112 เงินสด/ธนาคาร, Cr. 2130 WHT ค้างจ่าย
      const cashCode = paymentMethod === 'CASH' ? '1111' : '1112';
      const accMap = await getAccountMap(tx, ['2110', '2130', cashCode]);
      const apAcc = accMap['2110'];
      const cashAcc = accMap[cashCode];
      const whtAcc = accMap['2130'];

      if (apAcc && cashAcc) {
        const jeLines: any[] = [
          {
            accountId: apAcc.id,
            debitAmount: grossAmount,
            creditAmount: 0,
            description: `ล้างเจ้าหนี้การค้า (${targetContactName}) - ${pvNumber}`,
          },
          {
            accountId: cashAcc.id,
            debitAmount: 0,
            creditAmount: netPaid,
            description: `จ่ายชำระหนี้ - ${pvNumber}`,
          },
        ];

        if (whtAmt > 0 && whtAcc) {
          jeLines.push({
            accountId: whtAcc.id,
            debitAmount: 0,
            creditAmount: whtAmt,
            description: `ภาษีหัก ณ ที่จ่ายค้างจ่าย - ${pvNumber}`,
          });
        } else if (whtAmt > 0 && !whtAcc) {
          // หากไม่มีบัญชี 2130 ให้รวมกลับเพื่อรักษาดุล
          jeLines[1].creditAmount = grossAmount;
        }

        const jvNumber = await generateDocNumber('JV', tx);
        const je = await tx.journalEntry.create({
          data: {
            entryNumber: jvNumber,
            entryDate: payDate,
            journalType: 'CASH_PAYMENT',
            memo: `จ่ายชำระหนี้ใบสำคัญจ่าย ${pvNumber} (${targetContactName})`,
            sourceDocumentType: 'PAYMENT_VOUCHER',
            sourceDocumentId: pv.id,
            lines: { create: jeLines },
          },
        });

        await tx.paymentVoucher.update({
          where: { id: pv.id },
          data: { journalEntryId: je.id },
        });
      }

      return pv;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('PaymentVouchers POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, action } = await request.json();
    if (!id || action !== 'VOID') {
      return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
    }

    const pv = await prisma.paymentVoucher.findUnique({ where: { id } });
    if (!pv) return NextResponse.json({ error: 'ไม่พบใบสำคัญจ่าย' }, { status: 404 });
    if (pv.status === 'VOIDED') {
      return NextResponse.json({ error: 'ใบสำคัญจ่ายนี้ถูกยกเลิกแล้ว' }, { status: 400 });
    }

    const journalEntry = pv.journalEntryId
      ? await prisma.journalEntry.findUnique({
          where: { id: pv.journalEntryId },
          include: { lines: true },
        })
      : null;

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.paymentVoucher.update({
        where: { id },
        data: { status: 'VOIDED' },
      });

      if (pv.rrId) {
        await tx.goodsReceipt.update({
          where: { id: pv.rrId },
          data: { status: 'UNPAID' },
        });
      }

      if (journalEntry) {
        const revNumber = await generateDocNumber('JV', tx);
        await tx.journalEntry.create({
          data: {
            entryNumber: revNumber,
            entryDate: new Date(),
            journalType: 'CASH_PAYMENT',
            memo: `ยกเลิกใบสำคัญจ่าย ${pv.pvNumber}`,
            sourceDocumentType: 'PAYMENT_VOUCHER_VOID',
            sourceDocumentId: pv.id,
            lines: {
              create: journalEntry.lines.map((l) => ({
                accountId: l.accountId,
                debitAmount: l.creditAmount,
                creditAmount: l.debitAmount,
                description: `กลับรายการยกเลิก ${pv.pvNumber}`,
              })),
            },
          },
        });
      }

      return res;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PaymentVouchers PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
