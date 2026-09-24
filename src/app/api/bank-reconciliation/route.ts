import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const lines = await prisma.bankStatementLine.findMany({
      orderBy: { transactionDate: 'desc' },
    });

    return NextResponse.json(lines);
  } catch (error: any) {
    console.error('Bank Reconcile API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// นำเข้า Statement รายการใหม่ (CSV / Form input)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'AUTO_MATCH') {
      // จับคู่อัตโนมัติ: ค้นหา Invoice หรือ Expense ที่ยอดเงินตรงกัน 100%
      const unreconciled = await prisma.bankStatementLine.findMany({
        where: { isReconciled: false },
      });

      let matchedCount = 0;

      for (const line of unreconciled) {
        if (line.type === 'CREDIT') {
          // ยอดเงินฝากเข้า -> ค้นหา Invoice ที่ netAmount เท่ากับ line.amount
          const matchInv = await prisma.invoice.findFirst({
            where: {
              netAmount: line.amount,
              status: 'UNPAID',
            },
          });

          if (matchInv) {
            await prisma.bankStatementLine.update({
              where: { id: line.id },
              data: {
                isReconciled: true,
                matchedDocType: 'INVOICE',
                matchedDocId: matchInv.id,
              },
            });
            matchedCount++;
          }
        } else if (line.type === 'DEBIT') {
          // ยอดถอนจ่าย -> ค้นหา Expense ที่ netPayment เท่ากับ line.amount
          const matchExp = await prisma.expense.findFirst({
            where: {
              netPayment: line.amount,
              status: 'RECORDED',
            },
          });

          if (matchExp) {
            await prisma.bankStatementLine.update({
              where: { id: line.id },
              data: {
                isReconciled: true,
                matchedDocType: 'EXPENSE',
                matchedDocId: matchExp.id,
              },
            });
            matchedCount++;
          }
        }
      }

      return NextResponse.json({ message: `จับคู่เอกสารสำเร็จอัตโนมัติ ${matchedCount} รายการ`, matchedCount });
    }

    // Single Statement Line Create
    const { bankAccount, transactionDate, description, amount, type } = body;

    const line = await prisma.bankStatementLine.create({
      data: {
        bankAccount: bankAccount || 'SCB',
        transactionDate: new Date(transactionDate || Date.now()),
        description: description || 'รายการโอน',
        amount: Number(amount),
        type: type || 'CREDIT',
      },
    });

    return NextResponse.json(line);
  } catch (error: any) {
    console.error('Bank Reconcile POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
