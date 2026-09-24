import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { calculateTax } from '@/lib/tax-engine';
import { createExpenseSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    if (id) {
      const expense = await prisma.expense.findUnique({
        where: { id },
        include: {
          contact: true,
          items: true,
        },
      });

      if (!expense) {
        return NextResponse.json({ error: 'ไม่พบค่าใช้จ่าย' }, { status: 404 });
      }

      let journalEntry = null;
      if (expense.journalEntryId) {
        journalEntry = await prisma.journalEntry.findUnique({
          where: { id: expense.journalEntryId },
          include: { lines: { include: { account: true } } },
        });
      }

      return NextResponse.json({ ...expense, journalEntry });
    }

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { expenseNumber: { contains: search } },
        { contact: { name: { contains: search } } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: { contact: true, items: true },
    });

    const formatted = expenses.map((exp) => ({
      id: exp.id,
      expenseNumber: exp.expenseNumber,
      expenseDate: exp.expenseDate.toISOString(),
      contactName: exp.contact?.name || 'ทั่วไป',
      category: exp.category,
      status: exp.status,
      totalAmount: exp.totalAmount,
      netPayment: exp.netPayment,
      attachmentUrl: exp.attachmentUrl,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Expenses API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = createExpenseSchema.safeParse(rawBody);

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

    const expenseNumber = await generateDocNumber('EXP');

    const contact = body.contactId
      ? await prisma.contact.findUnique({ where: { id: body.contactId } })
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          expenseDate: new Date(body.expenseDate),
          contactId: body.contactId || null,
          category: body.category || 'ทั่วไป',
          vatType: body.vatType,
          subtotal: taxResult.subtotal,
          vatRate: taxResult.vatRate,
          vatAmount: taxResult.vatAmount,
          whtRate: taxResult.whtRate,
          whtAmount: taxResult.whtAmount,
          totalAmount: taxResult.totalAmount,
          netPayment: taxResult.netAmount,
          paymentMethod: body.paymentMethod,
          attachmentUrl: body.attachmentUrl || null,
          notes: body.notes,
          status: 'RECORDED',
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
      const expenseAccount = await tx.chartOfAccount.findFirst({ where: { code: '5300' } });
      const vatAccount = await tx.chartOfAccount.findFirst({ where: { code: '1130' } });
      const bankOrCashCode = body.paymentMethod === 'CASH' ? '1111' : '1112';
      const apOrCashAccount = await tx.chartOfAccount.findFirst({ where: { code: bankOrCashCode } });
      const whtPayableAccount = await tx.chartOfAccount.findFirst({ where: { code: '2130' } });

      if (expenseAccount && apOrCashAccount) {
        const jeLines = [];
        // Dr. ค่าใช้จ่าย
        jeLines.push({
          accountId: expenseAccount.id,
          debitAmount: taxResult.subtotal,
          creditAmount: 0,
          description: `ค่าใช้จ่าย - ${expenseNumber}`,
        });

        // Dr. ภาษีซื้อ (ถ้ามี)
        if (taxResult.vatAmount > 0 && vatAccount) {
          jeLines.push({
            accountId: vatAccount.id,
            debitAmount: taxResult.vatAmount,
            creditAmount: 0,
            description: `ภาษีซื้อ - ${expenseNumber}`,
          });
        }

        // Cr. เงินสด/ธนาคาร
        jeLines.push({
          accountId: apOrCashAccount.id,
          debitAmount: 0,
          creditAmount: taxResult.netAmount,
          description: `ชำระเงินค่าใช้จ่าย - ${expenseNumber}`,
        });

        // Cr. ภาษีหัก ณ ที่จ่ายค้างจ่าย (ถ้ามี)
        if (taxResult.whtAmount > 0 && whtPayableAccount) {
          jeLines.push({
            accountId: whtPayableAccount.id,
            debitAmount: 0,
            creditAmount: taxResult.whtAmount,
            description: `ภาษีหัก ณ ที่จ่ายค้างจ่าย - ${expenseNumber}`,
          });
        }

        const jvNumber = await generateDocNumber('JV');
        const je = await tx.journalEntry.create({
          data: {
            entryNumber: jvNumber,
            entryDate: new Date(body.expenseDate),
            journalType: 'CASH_PAYMENT',
            memo: `บันทึกค่าใช้จ่ายเลขที่ ${expenseNumber}`,
            sourceDocumentType: 'EXPENSE',
            sourceDocumentId: expense.id,
            lines: { create: jeLines },
          },
        });

        await tx.expense.update({
          where: { id: expense.id },
          data: { journalEntryId: je.id },
        });
      }

      // Tax Invoice (PURCHASE_TAX)
      if (taxResult.vatAmount > 0) {
        const expDate = new Date(body.expenseDate);
        await tx.taxInvoice.create({
          data: {
            taxType: 'PURCHASE_TAX',
            taxInvoiceNumber: expenseNumber,
            taxInvoiceDate: expDate,
            taxPeriodMonth: expDate.getMonth() + 1,
            taxPeriodYear: expDate.getFullYear(),
            contactName: contact?.name || 'ทั่วไป',
            contactTaxId: contact?.taxId || '-',
            contactBranch: contact?.branchCode || '00000',
            subtotalAmount: taxResult.subtotal,
            vatRate: taxResult.vatRate,
            vatAmount: taxResult.vatAmount,
          },
        });
      }

      return expense;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Expenses API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// VOID / ยกเลิกค่าใช้จ่าย พร้อมสร้าง Reversal Journal Entry
export async function PATCH(request: Request) {
  try {
    const { id, action } = await request.json();
    if (!id || action !== 'VOID') {
      return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json({ error: 'ไม่พบรายการค่าใช้จ่าย' }, { status: 404 });
    }

    if (expense.status === 'VOIDED') {
      return NextResponse.json({ error: 'รายการค่าใช้จ่ายนี้ถูกยกเลิกไปแล้ว' }, { status: 400 });
    }

    const journalEntry = expense.journalEntryId
      ? await prisma.journalEntry.findUnique({
          where: { id: expense.journalEntryId },
          include: { lines: true },
        })
      : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. อัปเดตสถานะเป็น VOIDED
      const updatedExpense = await tx.expense.update({
        where: { id },
        data: { status: 'VOIDED' },
      });

      // 2. สลับขา Reversal Entry
      if (journalEntry) {
        const revDocNumber = await generateDocNumber('JV');

        const reversedLines = journalEntry.lines.map((line) => ({
          accountId: line.accountId,
          debitAmount: line.creditAmount,
          creditAmount: line.debitAmount,
          description: `กลับรายการยกเลิก ${expense.expenseNumber}`,
        }));

        await tx.journalEntry.create({
          data: {
            entryNumber: revDocNumber,
            entryDate: new Date(),
            journalType: 'CASH_PAYMENT',
            memo: `ยกเลิกค่าใช้จ่ายเลขที่ ${expense.expenseNumber}`,
            sourceDocumentType: 'EXPENSE_VOID',
            sourceDocumentId: expense.id,
            lines: { create: reversedLines },
          },
        });
      }

      return updatedExpense;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Expense VOID Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
