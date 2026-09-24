import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { createWhtSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const formType = searchParams.get('formType');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: any = {};
    if (formType) where.formType = formType;
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      where.paymentDate = { gte: start, lte: end };
    }

    const whtItems = await prisma.withholdingTax.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: { payerContact: true, payeeContact: true },
    });

    const formatted = whtItems.map((item) => ({
      id: item.id,
      whtNumber: item.whtNumber,
      formType: item.formType,
      paymentDate: item.paymentDate.toISOString(),
      payerName: item.payerContact?.name || '-',
      payeeName: item.payeeContact?.name || '-',
      incomeCategory: item.incomeCategory,
      baseAmount: item.baseAmount,
      whtRate: item.whtRate,
      whtAmount: item.whtAmount,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('WHT API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = createWhtSchema.safeParse(rawBody);

    if (!validation.success) {
      const errorMessage = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const body = validation.data;
    const whtNumber = await generateDocNumber('WHT');
    const whtAmount = Math.round((body.baseAmount * (body.whtRate / 100) + Number.EPSILON) * 100) / 100;

    const record = await prisma.withholdingTax.create({
      data: {
        whtNumber,
        formType: body.formType,
        paymentDate: new Date(body.paymentDate),
        payerContactId: body.payerContactId,
        payeeContactId: body.payeeContactId,
        incomeCategory: body.incomeCategory,
        incomeType: body.incomeType,
        baseAmount: body.baseAmount,
        whtRate: body.whtRate,
        whtAmount,
        whtCondition: body.whtCondition,
      },
    });

    return NextResponse.json(record);
  } catch (error: any) {
    console.error('WHT API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
