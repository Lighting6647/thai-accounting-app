import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createContactSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const where: any = {};
    if (type === 'customer') {
      where.isCustomer = true;
    } else if (type === 'vendor') {
      where.isVendor = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { taxId: { contains: search } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(contacts);
  } catch (error: any) {
    console.error('Contacts API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = createContactSchema.safeParse(rawBody);

    if (!validation.success) {
      const errorMessage = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const body = validation.data;
    const contact = await prisma.contact.create({
      data: {
        name: body.name,
        taxId: body.taxId,
        branchType: body.branchType,
        branchCode: body.branchCode,
        address: body.address,
        phone: body.phone,
        email: body.email,
        isCustomer: body.isCustomer,
        isVendor: body.isVendor,
      },
    });

    return NextResponse.json(contact);
  } catch (error: any) {
    console.error('Contacts API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
