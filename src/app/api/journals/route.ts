import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { createJournalSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    if (id) {
      const journal = await prisma.journalEntry.findUnique({
        where: { id },
        include: { lines: { include: { account: true } } },
      });
      if (!journal) {
        return NextResponse.json({ error: 'ไม่พบสมุดรายวัน' }, { status: 404 });
      }
      return NextResponse.json(journal);
    }

    const where: any = {};
    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate);
      if (endDate) where.entryDate.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { entryNumber: { contains: search } },
        { memo: { contains: search } },
      ];
    }

    const journals = await prisma.journalEntry.findMany({
      where,
      orderBy: { entryDate: 'desc' },
      include: { lines: { include: { account: true } } },
    });

    const formattedJournals = journals.map((journal) => {
      let totalDebit = 0;
      let totalCredit = 0;
      journal.lines.forEach((line) => {
        totalDebit += line.debitAmount;
        totalCredit += line.creditAmount;
      });
      return {
        ...journal,
        totalDebit,
        totalCredit,
      };
    });

    return NextResponse.json(formattedJournals);
  } catch (error: any) {
    console.error('Journals API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = createJournalSchema.safeParse(rawBody);

    if (!validation.success) {
      const errorMessage = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const body = validation.data;
    const entryNumber = await generateDocNumber('JV');

    const journal = await prisma.$transaction(async (tx) => {
      return tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate: new Date(body.entryDate),
          journalType: body.journalType,
          memo: body.memo,
          lines: {
            create: body.lines.map((line) => ({
              accountId: line.accountId,
              debitAmount: line.debitAmount || 0,
              creditAmount: line.creditAmount || 0,
              description: line.description,
            })),
          },
        },
        include: { lines: true },
      });
    });

    return NextResponse.json(journal);
  } catch (error: any) {
    console.error('Journals API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
