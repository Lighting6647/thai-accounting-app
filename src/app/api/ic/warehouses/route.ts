import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      include: {
        stocks: {
          include: {
            product: {
              select: { id: true, code: true, name: true, unit: true, costPrice: true },
            },
          },
        },
      },
    });

    const formatted = warehouses.map((wh) => {
      const totalQty = wh.stocks.reduce((s, st) => s + st.quantity, 0);
      const totalValue = wh.stocks.reduce((s, st) => s + st.quantity * (st.product?.costPrice || 0), 0);
      return {
        ...wh,
        skuCount: wh.stocks.filter((st) => st.quantity > 0).length,
        totalQty,
        totalValue,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Warehouses GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, location, isDefault } = body;

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสคลังและชื่อคลังสินค้า' }, { status: 400 });
    }

    const existing = await prisma.warehouse.findUnique({ where: { code: code.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'รหัสคลังสินค้านี้มีอยู่แล้วในระบบ' }, { status: 400 });
    }

    const warehouse = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.warehouse.updateMany({ data: { isDefault: false } });
      }
      return tx.warehouse.create({
        data: {
          code: code.trim(),
          name: name.trim(),
          location: location?.trim() || null,
          isDefault: Boolean(isDefault),
        },
      });
    });

    return NextResponse.json(warehouse);
  } catch (error: any) {
    console.error('Warehouses POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
