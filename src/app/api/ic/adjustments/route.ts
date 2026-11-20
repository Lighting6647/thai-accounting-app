import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { calculateMovingAverage, roundMoney } from '@/lib/tax-engine';
import { ensureDefaultWarehouse, getAccountMap, upsertWarehouseStockDelta } from '@/lib/erp-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const adj = await prisma.stockAdjustment.findUnique({
        where: { id },
        include: {
          warehouse: true,
          items: { include: { product: true } },
        },
      });
      if (!adj) {
        return NextResponse.json({ error: 'ไม่พบเอกสารปรับปรุงสต็อก' }, { status: 404 });
      }
      const journalEntry = adj.journalEntryId
        ? await prisma.journalEntry.findUnique({
            where: { id: adj.journalEntryId },
            include: { lines: { include: { account: true } } },
          })
        : null;
      return NextResponse.json({ ...adj, journalEntry });
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      orderBy: { adjustDate: 'desc' },
      include: {
        warehouse: true,
        items: { include: { product: true } },
      },
    });

    return NextResponse.json(adjustments);
  } catch (error: any) {
    console.error('Stock Adjustments GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adjustDate, warehouseId, adjustType, reason, items } = body;

    if (!adjustType || !['IN', 'OUT', 'COUNT'].includes(adjustType)) {
      return NextResponse.json({ error: 'ประเภทการปรับปรุงสต็อกไม่ถูกต้อง' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุรายการสินค้าอย่างน้อย 1 รายการ' }, { status: 400 });
    }

    const adjDate = adjustDate ? new Date(adjustDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const warehouse = warehouseId
        ? await tx.warehouse.findUnique({ where: { id: warehouseId } })
        : await ensureDefaultWarehouse(tx);

      if (!warehouse) {
        throw new Error('ไม่พบคลังสินค้าที่เลือก');
      }

      const adjustNumber = await generateDocNumber('AJ', tx);

      let totalIncreaseValue = 0;
      let totalDecreaseValue = 0;
      const preparedItems: any[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error('ไม่พบข้อมูลสินค้าในระบบ');
        }

        const inputQty = Number(item.quantity) || 0;
        const inputCost = Number(item.unitCost) > 0 ? Number(item.unitCost) : product.costPrice;

        let deltaQty = 0;
        let movementType = 'IN';
        let movementQty = inputQty;
        let newStock = product.currentStock;
        let newAvgCost = product.costPrice;

        if (adjustType === 'IN') {
          if (inputQty <= 0) throw new Error(`จำนวนรับเข้าของ ${product.name} ต้องมากกว่า 0`);
          deltaQty = inputQty;
          movementType = 'IN';
          const avgRes = calculateMovingAverage(product.currentStock, product.costPrice, inputQty, inputCost);
          newStock = avgRes.newStock;
          newAvgCost = avgRes.newAvgCost;
          totalIncreaseValue = roundMoney(totalIncreaseValue + inputQty * inputCost);
        } else if (adjustType === 'OUT') {
          if (inputQty <= 0) throw new Error(`จำนวนจ่ายออกของ ${product.name} ต้องมากกว่า 0`);
          if (product.currentStock < inputQty) {
            throw new Error(`สินค้า "${product.name}" คงเหลือไม่พอ (${product.currentStock} ${product.unit})`);
          }
          deltaQty = -inputQty;
          movementType = 'OUT';
          newStock = roundMoney(product.currentStock - inputQty);
          totalDecreaseValue = roundMoney(totalDecreaseValue + inputQty * product.costPrice);
        } else {
          // COUNT: ปรับยอดตามตรวจนับจริง (เทียบยอดในคลังหรือยอดรวม)
          const whStock = await tx.warehouseStock.findUnique({
            where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } },
          });
          const currentWhQty = whStock ? whStock.quantity : product.currentStock;
          deltaQty = roundMoney(inputQty - currentWhQty);
          movementQty = Math.abs(deltaQty);
          movementType = deltaQty >= 0 ? 'IN' : 'OUT';
          newStock = roundMoney(Math.max(0, product.currentStock + deltaQty));
          if (deltaQty > 0) {
            const avgRes = calculateMovingAverage(product.currentStock, product.costPrice, deltaQty, inputCost);
            newAvgCost = avgRes.newAvgCost;
            totalIncreaseValue = roundMoney(totalIncreaseValue + deltaQty * inputCost);
          } else if (deltaQty < 0) {
            totalDecreaseValue = roundMoney(totalDecreaseValue + Math.abs(deltaQty) * product.costPrice);
          }
        }

        const lineCost = adjustType === 'OUT' ? product.costPrice : inputCost;
        const lineTotalCost = roundMoney(Math.abs(deltaQty) * lineCost);

        await tx.product.update({
          where: { id: product.id },
          data: {
            currentStock: newStock,
            costPrice: newAvgCost,
          },
        });

        await upsertWarehouseStockDelta(tx, warehouse.id, product.id, deltaQty);

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            warehouseId: warehouse.id,
            type: movementType,
            quantity: movementQty,
            unitCost: lineCost,
            balanceAfter: newStock,
            avgCostAfter: newAvgCost,
            referenceDocType: 'AJ',
            referenceDocId: adjustNumber,
            movementDate: adjDate,
            notes: item.notes || reason || `ปรับปรุงสต็อก (${adjustNumber})`,
          },
        });

        preparedItems.push({
          productId: product.id,
          quantity: movementQty,
          unitCost: lineCost,
          totalCost: lineTotalCost,
          notes: item.notes || null,
        });
      }

      const totalValue = roundMoney(totalIncreaseValue + totalDecreaseValue);

      // Auto-GL สำหรับเอกสารปรับปรุงสต็อก (AJ)
      const accMap = await getAccountMap(tx, ['1150', '4300', '5100']);
      let journalEntryId: string | null = null;

      if (accMap['1150'] && (totalIncreaseValue > 0 || totalDecreaseValue > 0)) {
        const jeLines: any[] = [];
        if (totalIncreaseValue > 0 && accMap['4300']) {
          jeLines.push({
            accountId: accMap['1150'].id,
            debitAmount: totalIncreaseValue,
            creditAmount: 0,
            description: `ปรับเพิ่มสินค้าคงเหลือ - ${adjustNumber}`,
          });
          jeLines.push({
            accountId: accMap['4300'].id,
            debitAmount: 0,
            creditAmount: totalIncreaseValue,
            description: `รายได้อื่น/สินค้าเกินตรวจนับ - ${adjustNumber}`,
          });
        }
        if (totalDecreaseValue > 0 && accMap['5100']) {
          jeLines.push({
            accountId: accMap['5100'].id,
            debitAmount: totalDecreaseValue,
            creditAmount: 0,
            description: `ปรับลดต้นทุนสินค้าสูญหาย/เสียหาย - ${adjustNumber}`,
          });
          jeLines.push({
            accountId: accMap['1150'].id,
            debitAmount: 0,
            creditAmount: totalDecreaseValue,
            description: `ตัดลดสินค้าคงเหลือ - ${adjustNumber}`,
          });
        }

        if (jeLines.length >= 2) {
          const jvNumber = await generateDocNumber('JV', tx);
          const je = await tx.journalEntry.create({
            data: {
              entryNumber: jvNumber,
              entryDate: adjDate,
              journalType: 'GENERAL',
              memo: `ปรับปรุงสต็อกสินค้า ${adjustNumber}${reason ? ` (${reason})` : ''}`,
              sourceDocumentType: 'STOCK_ADJUSTMENT',
              sourceDocumentId: adjustNumber,
              lines: { create: jeLines },
            },
          });
          journalEntryId = je.id;
        }
      }

      const adjustment = await tx.stockAdjustment.create({
        data: {
          adjustNumber,
          adjustDate: adjDate,
          warehouseId: warehouse.id,
          adjustType,
          reason: reason || null,
          status: 'APPROVED',
          totalValue,
          journalEntryId,
          items: { create: preparedItems },
        },
        include: {
          warehouse: true,
          items: { include: { product: true } },
        },
      });

      return adjustment;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Stock Adjustment POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}
