import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { roundMoney } from '@/lib/tax-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        movements: {
          take: 5,
          orderBy: { movementDate: 'desc' },
        },
      },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Products API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, unit, sellingPrice, costPrice, initialStock, reorderPoint } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสและชื่อสินค้า' }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'รหัสสินค้านี้มีอยู่แล้วในระบบ' }, { status: 400 });
    }

    const initQty = Number(initialStock) || 0;
    const cost = Number(costPrice) || 0;

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          code,
          name,
          unit: unit || 'ชิ้น',
          sellingPrice: Number(sellingPrice) || 0,
          costPrice: cost,
          currentStock: initQty,
          reorderPoint: Number(reorderPoint) || 5,
        },
      });

      if (initQty > 0) {
        await tx.stockMovement.create({
          data: {
            productId: p.id,
            type: 'IN',
            quantity: initQty,
            unitCost: cost,
            referenceDocType: 'INITIAL',
            notes: 'ยอดยกมาเริ่มต้น',
          },
        });
      }

      return p;
    });

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Products API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ปรับปรุงสต็อกสินค้า (Adjust Stock)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { productId, type, quantity, unitCost, notes } = body;

    if (!productId || !type || !quantity) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'ไม่พบสินค้า' }, { status: 404 });
    }

    const qty = Number(quantity);
    let newStock = product.currentStock;

    if (type === 'IN') {
      newStock += qty;
    } else if (type === 'OUT') {
      newStock -= qty;
    } else if (type === 'ADJUST') {
      newStock = qty;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity: qty,
          unitCost: Number(unitCost) || product.costPrice,
          referenceDocType: 'MANUAL_ADJUST',
          notes: notes || 'ปรับปรุงสต็อก',
        },
      });

      return tx.product.update({
        where: { id: productId },
        data: { currentStock: roundMoney(newStock) },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Stock Adjust Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
