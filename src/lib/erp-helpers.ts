import { calculateLineAmount, calculateTax, roundMoney, VatType } from '@/lib/tax-engine';

export interface ErpLineInput {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export function computeErpDocumentTotals(
  items: ErpLineInput[],
  discountAmount: number,
  vatType: VatType,
  vatRate = 7,
  whtRate = 0
) {
  const normalizedItems = items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const discount = Number(item.discount) || 0;
    const amount = calculateLineAmount(qty, price, discount);
    return {
      productId: item.productId || null,
      description: item.description,
      quantity: qty,
      unitPrice: price,
      discount,
      amount,
    };
  });

  const grossSubtotal = roundMoney(normalizedItems.reduce((sum, i) => sum + i.amount, 0));
  const tax = calculateTax({
    subtotal: grossSubtotal,
    discountAmount: Number(discountAmount) || 0,
    vatType,
    vatRate,
    whtRate,
  });

  return { normalizedItems, grossSubtotal, tax };
}

export async function ensureDefaultWarehouse(tx: any) {
  let warehouse = await tx.warehouse.findFirst({
    where: { isDefault: true, isActive: true },
  });
  if (!warehouse) {
    warehouse = await tx.warehouse.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }
  if (!warehouse) {
    warehouse = await tx.warehouse.create({
      data: {
        code: 'WH-01',
        name: 'คลังสินค้าหลัก (สำนักงานใหญ่)',
        location: 'สำนักงานใหญ่',
        isDefault: true,
        isActive: true,
      },
    });
  }
  return warehouse;
}

export async function upsertWarehouseStockDelta(
  tx: any,
  warehouseId: string,
  productId: string,
  deltaQty: number
) {
  const existing = await tx.warehouseStock.findUnique({
    where: {
      warehouseId_productId: { warehouseId, productId },
    },
  });

  if (existing) {
    const nextQty = roundMoney(existing.quantity + deltaQty);
    return tx.warehouseStock.update({
      where: { id: existing.id },
      data: { quantity: Math.max(0, nextQty) },
    });
  }

  return tx.warehouseStock.create({
    data: {
      warehouseId,
      productId,
      quantity: Math.max(0, roundMoney(deltaQty)),
    },
  });
}

export async function getAccountMap(tx: any, codes: string[]) {
  const accounts = await tx.chartOfAccount.findMany({
    where: { code: { in: codes } },
  });
  const map: Record<string, any> = {};
  for (const acc of accounts) {
    map[acc.code] = acc;
  }
  return map;
}
