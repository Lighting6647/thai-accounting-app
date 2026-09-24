import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createAccountSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { nameTh: { contains: search } },
        { nameEn: { contains: search } },
      ];
    }

    const accounts = await prisma.chartOfAccount.findMany({
      where,
      orderBy: { code: 'asc' },
      include: { parent: true },
    });

    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('Accounts API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = createAccountSchema.safeParse(rawBody);

    if (!validation.success) {
      const errorMessage = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const body = validation.data;

    const existingAccount = await prisma.chartOfAccount.findUnique({
      where: { code: body.code },
    });
    if (existingAccount) {
      return NextResponse.json({ error: 'รหัสบัญชีนี้มีอยู่แล้วในระบบ' }, { status: 400 });
    }

    const account = await prisma.chartOfAccount.create({
      data: {
        code: body.code,
        nameTh: body.nameTh,
        nameEn: body.nameEn,
        category: body.category,
        normalBalance: body.normalBalance,
        parentId: body.parentId || null,
        isActive: body.isActive,
      },
    });

    return NextResponse.json(account);
  } catch (error: any) {
    console.error('Accounts API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
