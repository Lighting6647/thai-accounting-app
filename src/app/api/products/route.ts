import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateMovingAverage, roundMoney } from '@/lib/tax-engine';
import { ensureDefaultWarehouse, upsertWarehouseStockDelta } from '@/lib/erp-helpers';

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
        warehouseStocks: {
          include: { warehouse: true },
        },
        movements: {
          take: 25,
          orderBy: { movementDate: 'desc' },
          include: { warehouse: true },
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
    const { code, name, unit, sellingPrice, costPrice, initialStock, reorderPoint, warehouseId } = body;

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
      const targetWh = warehouseId
        ? await tx.warehouse.findUnique({ where: { id: warehouseId } })
        : await ensureDefaultWarehouse(tx);

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

      if (targetWh && initQty > 0) {
        await upsertWarehouseStockDelta(tx, targetWh.id, p.id, initQty);
        await tx.stockMovement.create({
          data: {
            productId: p.id,
            warehouseId: targetWh.id,
            type: 'IN',
            quantity: initQty,
            unitCost: cost,
            balanceAfter: initQty,
            avgCostAfter: cost,
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

// ปรับปรุงสต็อกสินค้า (Adjust Stock) พร้อมอัปเดตคลังและ Moving Average
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { productId, warehouseId, type, quantity, unitCost, notes } = body;

    if (!productId || !type || quantity === undefined) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'ไม่พบสินค้า' }, { status: 404 });
    }

    const qty = Number(quantity);
    const inputCost = Number(unitCost) > 0 ? Number(unitCost) : product.costPrice;

    const updated = await prisma.$transaction(async (tx) => {
      const targetWh = warehouseId
        ? await tx.warehouse.findUnique({ where: { id: warehouseId } })
        : await ensureDefaultWarehouse(tx);

      let newStock = product.currentStock;
      let newAvgCost = product.costPrice;
      let delta = 0;

      if (type === 'IN') {
        const avgRes = calculateMovingAverage(product.currentStock, product.costPrice, qty, inputCost);
        newStock = avgRes.newStock;
        newAvgCost = avgRes.newAvgCost;
        delta = qty;
      } else if (type === 'OUT') {
        if (product.currentStock < qty) {
          throw new Error(`สินค้าคงเหลือไม่พอ (คงเหลือ ${product.currentStock} ${product.unit})`);
        }
        newStock = roundMoney(product.currentStock - qty);
        delta = -qty;
      } else if (type === 'ADJUST') {
        delta = roundMoney(qty - product.currentStock);
        newStock = roundMoney(qty);
      }

      if (targetWh) {
        await upsertWarehouseStockDelta(tx, targetWh.id, productId, delta);
      }

      await tx.stockMovement.create({
        data: {
          productId,
          warehouseId: targetWh?.id || null,
          type,
          quantity: qty,
          unitCost: inputCost,
          balanceAfter: newStock,
          avgCostAfter: newAvgCost,
          referenceDocType: 'MANUAL_ADJUST',
          notes: notes || 'ปรับปรุงสต็อก',
        },
      });

      return tx.product.update({
        where: { id: productId },
        data: {
          currentStock: roundMoney(newStock),
          costPrice: roundMoney(newAvgCost),
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Stock Adjust Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}
