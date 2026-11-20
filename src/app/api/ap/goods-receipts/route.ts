import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { calculateMovingAverage, roundMoney, VatType } from '@/lib/tax-engine';
import {
  computeErpDocumentTotals,
  ensureDefaultWarehouse,
  getAccountMap,
  upsertWarehouseStockDelta,
} from '@/lib/erp-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (id) {
      const rr = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: {
          contact: true,
          warehouse: true,
          po: true,
          items: { include: { product: true } },
          paymentVouchers: true,
        },
      });
      if (!rr) {
        return NextResponse.json({ error: 'ไม่พบใบรับสินค้า/ซื้อเชื่อ' }, { status: 404 });
      }
      const journalEntry = rr.journalEntryId
        ? await prisma.journalEntry.findUnique({
            where: { id: rr.journalEntryId },
            include: { lines: { include: { account: true } } },
          })
        : null;
      return NextResponse.json({ ...rr, journalEntry });
    }

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { rrNumber: { contains: search } },
        { vendorInvoiceNo: { contains: search } },
        { contact: { name: { contains: search } } },
      ];
    }

    const receipts = await prisma.goodsReceipt.findMany({
      where,
      orderBy: { rrDate: 'desc' },
      include: { contact: true, warehouse: true, po: true, items: true },
    });

    const formatted = receipts.map((rr) => ({
      id: rr.id,
      rrNumber: rr.rrNumber,
      rrDate: rr.rrDate.toISOString(),
      dueDate: rr.dueDate.toISOString(),
      vendorInvoiceNo: rr.vendorInvoiceNo,
      poNumber: rr.po?.poNumber || null,
      contactId: rr.contactId,
      contactName: rr.contact?.name || '-',
      warehouseName: rr.warehouse?.name || '-',
      status: rr.status,
      subtotal: rr.subtotal,
      vatAmount: rr.vatAmount,
      totalAmount: rr.totalAmount,
      netAmount: rr.netAmount,
      whtAmount: rr.whtAmount,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('GoodsReceipts GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      rrDate,
      dueDate,
      vendorInvoiceNo,
      poId,
      contactId,
      warehouseId,
      vatType = 'EXCLUSIVE',
      discountAmount = 0,
      vatRate = 7,
      whtRate = 0,
      notes,
      items,
    } = body;

    if (!contactId) {
      return NextResponse.json({ error: 'กรุณาเลือกผู้ขาย / เจ้าหนี้' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุรายการสินค้าอย่างน้อย 1 รายการ' }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ขาย' }, { status: 400 });
    }

    const { normalizedItems, grossSubtotal, tax } = computeErpDocumentTotals(
      items,
      Number(discountAmount) || 0,
      vatType as VatType,
      Number(vatRate) || 7,
      Number(whtRate) || 0
    );

    const receiptDate = rrDate ? new Date(rrDate) : new Date();
    const receiptDueDate = dueDate ? new Date(dueDate) : receiptDate;

    const result = await prisma.$transaction(async (tx) => {
      const targetWh = warehouseId
        ? await tx.warehouse.findUnique({ where: { id: warehouseId } })
        : await ensureDefaultWarehouse(tx);
      if (!targetWh) throw new Error('ไม่พบคลังสินค้า');

      const rrNumber = await generateDocNumber('RR', tx);

      const rr = await tx.goodsReceipt.create({
        data: {
          rrNumber,
          rrDate: receiptDate,
          dueDate: receiptDueDate,
          vendorInvoiceNo: vendorInvoiceNo?.trim() || null,
          poId: poId || null,
          contactId,
          warehouseId: targetWh.id,
          status: 'UNPAID',
          vatType,
          discountAmount: tax.discountAmount,
          subtotal: tax.subtotal,
          vatRate: tax.vatRate,
          vatAmount: tax.vatAmount,
          whtRate: tax.whtRate,
          whtAmount: tax.whtAmount,
          totalAmount: tax.totalAmount,
          netAmount: tax.netAmount,
          notes: notes || null,
          items: { create: normalizedItems },
        },
      });

      if (poId) {
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: { status: 'RECEIVED' },
        });
      }

      // Moving Average Costing + Stock Movement (IN)
      const effectiveRatio = grossSubtotal > 0 ? tax.subtotal / grossSubtotal : 1;

      for (const item of normalizedItems) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const incomingUnitCost =
          item.quantity > 0
            ? roundMoney((item.amount * effectiveRatio) / item.quantity)
            : product.costPrice;

        const { newStock, newAvgCost } = calculateMovingAverage(
          product.currentStock,
          product.costPrice,
          item.quantity,
          incomingUnitCost
        );

        await tx.product.update({
          where: { id: product.id },
          data: {
            currentStock: newStock,
            costPrice: newAvgCost,
          },
        });

        await upsertWarehouseStockDelta(tx, targetWh.id, product.id, item.quantity);

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            warehouseId: targetWh.id,
            type: 'IN',
            quantity: item.quantity,
            unitCost: incomingUnitCost,
            balanceAfter: newStock,
            avgCostAfter: newAvgCost,
            referenceDocType: 'RR',
            referenceDocId: rr.id,
            movementDate: receiptDate,
            notes: `รับสินค้าเข้าคลังตามใบรับของ ${rrNumber}`,
          },
        });
      }

      // Auto-GL: Dr. 1150 สินค้าคงเหลือ, Dr. 1130 ภาษีซื้อ, Cr. 2110 เจ้าหนี้การค้า
      const accMap = await getAccountMap(tx, ['1150', '1130', '2110', '5300']);
      const inventoryOrExpAcc = accMap['1150'] || accMap['5300'];
      const apAcc = accMap['2110'];
      const inputVatAcc = accMap['1130'];

      if (inventoryOrExpAcc && apAcc) {
        const jeLines: any[] = [
          {
            accountId: inventoryOrExpAcc.id,
            debitAmount: tax.subtotal,
            creditAmount: 0,
            description: `รับสินค้า/ซื้อเชื่อ - ${rrNumber}`,
          },
        ];

        if (tax.vatAmount > 0 && inputVatAcc) {
          jeLines.push({
            accountId: inputVatAcc.id,
            debitAmount: tax.vatAmount,
            creditAmount: 0,
            description: `ภาษีซื้อ - ${rrNumber}`,
          });
        }

        jeLines.push({
          accountId: apAcc.id,
          debitAmount: 0,
          creditAmount: tax.totalAmount,
          description: `ตั้งเจ้าหนี้การค้า (${contact.name}) - ${rrNumber}`,
        });

        const jvNumber = await generateDocNumber('JV', tx);
        const je = await tx.journalEntry.create({
          data: {
            entryNumber: jvNumber,
            entryDate: receiptDate,
            journalType: 'PURCHASE',
            memo: `ตั้งเจ้าหนี้ซื้อเชื่อ/รับสินค้า ${rrNumber} (${contact.name})`,
            sourceDocumentType: 'GOODS_RECEIPT',
            sourceDocumentId: rr.id,
            lines: { create: jeLines },
          },
        });

        await tx.goodsReceipt.update({
          where: { id: rr.id },
          data: { journalEntryId: je.id },
        });
      }

      // Tax Invoice (PURCHASE_TAX)
      if (tax.vatAmount > 0) {
        await tx.taxInvoice.create({
          data: {
            taxType: 'PURCHASE_TAX',
            taxInvoiceNumber: vendorInvoiceNo?.trim() || rrNumber,
            taxInvoiceDate: receiptDate,
            taxPeriodMonth: receiptDate.getMonth() + 1,
            taxPeriodYear: receiptDate.getFullYear(),
            contactName: contact.name,
            contactTaxId: contact.taxId || '-',
            contactBranch: contact.branchCode || '00000',
            subtotalAmount: tax.subtotal,
            vatRate: tax.vatRate,
            vatAmount: tax.vatAmount,
            rrId: rr.id,
          },
        });
      }

      return rr;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('GoodsReceipts POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, action } = await request.json();
    if (!id || action !== 'VOID') {
      return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
    }

    const rr = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: { items: true, paymentVouchers: true },
    });

    if (!rr) {
      return NextResponse.json({ error: 'ไม่พบใบรับสินค้า/ซื้อเชื่อ' }, { status: 404 });
    }
    if (rr.status === 'VOIDED') {
      return NextResponse.json({ error: 'เอกสารนี้ถูกยกเลิกไปแล้ว' }, { status: 400 });
    }
    if (rr.status === 'PAID' || rr.paymentVouchers.some((pv) => pv.status === 'PAID')) {
      return NextResponse.json({ error: 'เอกสารนี้จ่ายชำระหนี้แล้ว กรุณายกเลิกใบสำคัญจ่ายก่อน' }, { status: 400 });
    }

    const journalEntry = rr.journalEntryId
      ? await prisma.journalEntry.findUnique({
          where: { id: rr.journalEntryId },
          include: { lines: true },
        })
      : null;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRr = await tx.goodsReceipt.update({
        where: { id },
        data: { status: 'VOIDED' },
      });

      // คืนสต็อกที่รับเข้า
      for (const item of rr.items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const nextStock = roundMoney(Math.max(0, product.currentStock - item.quantity));
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: nextStock },
        });
        if (rr.warehouseId) {
          await upsertWarehouseStockDelta(tx, rr.warehouseId, product.id, -item.quantity);
        }
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            warehouseId: rr.warehouseId,
            type: 'OUT',
            quantity: item.quantity,
            unitCost: product.costPrice,
            balanceAfter: nextStock,
            avgCostAfter: product.costPrice,
            referenceDocType: 'RR_VOID',
            referenceDocId: rr.id,
            notes: `กลับรายการยกเลิก ${rr.rrNumber}`,
          },
        });
      }

      if (journalEntry) {
        const revNumber = await generateDocNumber('JV', tx);
        await tx.journalEntry.create({
          data: {
            entryNumber: revNumber,
            entryDate: new Date(),
            journalType: 'PURCHASE',
            memo: `ยกเลิกใบรับสินค้า/ซื้อเชื่อ ${rr.rrNumber}`,
            sourceDocumentType: 'GOODS_RECEIPT_VOID',
            sourceDocumentId: rr.id,
            lines: {
              create: journalEntry.lines.map((line) => ({
                accountId: line.accountId,
                debitAmount: line.creditAmount,
                creditAmount: line.debitAmount,
                description: `กลับรายการยกเลิก ${rr.rrNumber}`,
              })),
            },
          },
        });
      }

      await tx.taxInvoice.deleteMany({ where: { rrId: id } });

      if (rr.poId) {
        await tx.purchaseOrder.update({
          where: { id: rr.poId },
          data: { status: 'APPROVED' },
        });
      }

      return updatedRr;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('GoodsReceipts PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
