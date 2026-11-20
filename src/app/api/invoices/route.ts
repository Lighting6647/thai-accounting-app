import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { roundMoney, VatType } from '@/lib/tax-engine';
import { createInvoiceSchema } from '@/lib/validations';
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
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          contact: true,
          items: { include: { product: true } },
          receipts: true,
          taxInvoice: true,
        },
      });

      if (!invoice) {
        return NextResponse.json({ error: 'ไม่พบใบแจ้งหนี้' }, { status: 404 });
      }

      let journalEntry = null;
      if (invoice.journalEntryId) {
        journalEntry = await prisma.journalEntry.findUnique({
          where: { id: invoice.journalEntryId },
          include: { lines: { include: { account: true } } },
        });
      }

      return NextResponse.json({ ...invoice, journalEntry });
    }

    const where: any = {};
    if (status && status !== 'ALL') {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { contact: { name: { contains: search } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      include: { contact: true, items: true },
    });

    const formattedInvoices = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      contactName: inv.contact?.name || 'ทั่วไป',
      status: inv.status,
      totalAmount: inv.totalAmount,
      netAmount: inv.netAmount,
      soId: inv.soId,
    }));

    return NextResponse.json(formattedInvoices);
  } catch (error: any) {
    console.error('Invoices API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = createInvoiceSchema.safeParse(rawBody);

    if (!validation.success) {
      const errorMessage = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const body = validation.data;
    const { normalizedItems, tax } = computeErpDocumentTotals(
      body.items,
      body.discountAmount ?? 0,
      body.vatType as VatType,
      body.vatRate,
      body.whtRate
    );

    const contact = await prisma.contact.findUnique({
      where: { id: body.contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const hasStockItems = normalizedItems.some((item) => Boolean(item.productId));
      const targetWh = body.warehouseId
        ? await tx.warehouse.findUnique({ where: { id: body.warehouseId } })
        : hasStockItems
          ? await ensureDefaultWarehouse(tx)
          : null;

      // ตรวจสอบสต็อกรวมก่อนตัดขาย (ห้ามสต็อกติดลบเด็ดขาด)
      const requestedByProduct = new Map<string, number>();
      for (const item of normalizedItems) {
        if (!item.productId) continue;
        requestedByProduct.set(
          item.productId,
          roundMoney((requestedByProduct.get(item.productId) || 0) + item.quantity)
        );
      }

      const productSnapshots = new Map<string, { currentStock: number; costPrice: number; name: string; unit: string }>();

      for (const [productId, totalQty] of Array.from(requestedByProduct.entries())) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) {
          throw new Error('ไม่พบข้อมูลสินค้าที่เลือกในระบบ');
        }
        if (product.currentStock < totalQty) {
          throw new Error(
            `สินค้า "${product.name}" คงเหลือไม่พอขาย (คงเหลือ ${product.currentStock} ${product.unit}, ต้องการ ${totalQty})`
          );
        }
        if (targetWh) {
          const whStock = await tx.warehouseStock.findUnique({
            where: { warehouseId_productId: { warehouseId: targetWh.id, productId } },
          });
          if (whStock && whStock.quantity < totalQty) {
            throw new Error(
              `สินค้า "${product.name}" ในคลัง "${targetWh.name}" คงเหลือไม่พอ (${whStock.quantity} ${product.unit})`
            );
          }
          if (!whStock && product.currentStock > 0) {
            await tx.warehouseStock.create({
              data: { warehouseId: targetWh.id, productId, quantity: product.currentStock },
            });
          }
        }
        productSnapshots.set(productId, {
          currentStock: product.currentStock,
          costPrice: product.costPrice,
          name: product.name,
          unit: product.unit,
        });
      }

      const invoiceNumber = await generateDocNumber('IV', tx);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: new Date(body.invoiceDate),
          dueDate: new Date(body.dueDate),
          contactId: body.contactId,
          soId: body.soId || null,
          warehouseId: targetWh?.id || null,
          vatType: body.vatType,
          discountAmount: tax.discountAmount,
          subtotal: tax.subtotal,
          vatRate: tax.vatRate,
          vatAmount: tax.vatAmount,
          whtRate: tax.whtRate,
          whtAmount: tax.whtAmount,
          totalAmount: tax.totalAmount,
          netAmount: tax.netAmount,
          notes: body.notes,
          status: 'UNPAID',
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              amount: item.amount,
            })),
          },
        },
      });

      if (body.soId) {
        await tx.salesOrder.update({
          where: { id: body.soId },
          data: { status: 'INVOICED' },
        });
      }

      // ตัดสต็อก + บันทึก Stock Movement (OUT) + คำนวณต้นทุนขาย (COGS)
      let totalCogs = 0;
      for (const item of normalizedItems) {
        if (!item.productId) continue;
        const snap = productSnapshots.get(item.productId);
        if (!snap) continue;

        const nextStock = roundMoney(snap.currentStock - item.quantity);
        snap.currentStock = nextStock;

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: nextStock },
        });

        if (targetWh) {
          await upsertWarehouseStockDelta(tx, targetWh.id, item.productId, -item.quantity);
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: targetWh?.id || null,
            type: 'OUT',
            quantity: item.quantity,
            unitCost: snap.costPrice,
            balanceAfter: nextStock,
            avgCostAfter: snap.costPrice,
            referenceDocType: 'IV',
            referenceDocId: invoice.id,
            movementDate: new Date(body.invoiceDate),
            notes: `ตัดสต็อกขายสินค้าตามบิล ${invoiceNumber}`,
          },
        });

        totalCogs = roundMoney(totalCogs + item.quantity * snap.costPrice);
      }

      // Auto-GL Journal Entry
      const accMap = await getAccountMap(tx, ['1120', '1140', '4100', '2120', '5100', '1150']);
      const arAccount = accMap['1120'];
      const whtAccount = accMap['1140'];
      const revenueAccount = accMap['4100'];
      const vatAccount = accMap['2120'];
      const cogsAccount = accMap['5100'];
      const inventoryAccount = accMap['1150'];

      if (arAccount && revenueAccount) {
        const jeLines: any[] = [];
        // Dr. ลูกหนี้การค้า
        jeLines.push({
          accountId: arAccount.id,
          debitAmount: tax.netAmount,
          creditAmount: 0,
          description: `ลูกหนี้การค้า - ${invoiceNumber}`,
        });
        // Dr. WHT ค้างรับ (ถ้ามี)
        if (tax.whtAmount > 0 && whtAccount) {
          jeLines.push({
            accountId: whtAccount.id,
            debitAmount: tax.whtAmount,
            creditAmount: 0,
            description: `ภาษีหัก ณ ที่จ่ายค้างรับ - ${invoiceNumber}`,
          });
        }
        // Cr. รายได้จากการขายสินค้า
        jeLines.push({
          accountId: revenueAccount.id,
          debitAmount: 0,
          creditAmount: tax.subtotal,
          description: `รายได้ - ${invoiceNumber}`,
        });
        // Cr. ภาษีขาย (ถ้ามี)
        if (tax.vatAmount > 0 && vatAccount) {
          jeLines.push({
            accountId: vatAccount.id,
            debitAmount: 0,
            creditAmount: tax.vatAmount,
            description: `ภาษีขาย - ${invoiceNumber}`,
          });
        }
        // Dr. ต้นทุนขาย / Cr. สินค้าคงเหลือ (Moving Average COGS)
        if (totalCogs > 0 && cogsAccount && inventoryAccount) {
          jeLines.push({
            accountId: cogsAccount.id,
            debitAmount: totalCogs,
            creditAmount: 0,
            description: `ต้นทุนขายตามวิธีถัวเฉลี่ย - ${invoiceNumber}`,
          });
          jeLines.push({
            accountId: inventoryAccount.id,
            debitAmount: 0,
            creditAmount: totalCogs,
            description: `ตัดสินค้าคงเหลือ - ${invoiceNumber}`,
          });
        }

        const jvNumber = await generateDocNumber('JV', tx);
        const je = await tx.journalEntry.create({
          data: {
            entryNumber: jvNumber,
            entryDate: new Date(body.invoiceDate),
            journalType: 'SALES',
            memo: `ตั้งลูกหนี้ใบแจ้งหนี้เลขที่ ${invoiceNumber}`,
            sourceDocumentType: 'INVOICE',
            sourceDocumentId: invoice.id,
            lines: { create: jeLines },
          },
        });

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { journalEntryId: je.id },
        });
      }

      // Tax Invoice (ถ้ามี VAT)
      if (tax.vatAmount > 0) {
        const invDate = new Date(body.invoiceDate);
        await tx.taxInvoice.create({
          data: {
            taxType: 'SALES_TAX',
            taxInvoiceNumber: invoiceNumber,
            taxInvoiceDate: invDate,
            taxPeriodMonth: invDate.getMonth() + 1,
            taxPeriodYear: invDate.getFullYear(),
            contactName: contact.name,
            contactTaxId: contact.taxId || '-',
            contactBranch: contact.branchCode || '00000',
            subtotalAmount: tax.subtotal,
            vatRate: tax.vatRate,
            vatAmount: tax.vatAmount,
            invoiceId: invoice.id,
          },
        });
      }

      return invoice;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Invoices API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}

// VOID / ยกเลิกใบแจ้งหนี้ พร้อมสร้าง Reversal Journal Entry และคืนสต็อก
export async function PATCH(request: Request) {
  try {
    const { id, action } = await request.json();
    if (!id || action !== 'VOID') {
      return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'ไม่พบใบแจ้งหนี้' }, { status: 404 });
    }

    if (invoice.status === 'VOIDED') {
      return NextResponse.json({ error: 'ใบแจ้งหนี้นี้ถูกยกเลิกไปแล้ว' }, { status: 400 });
    }

    const journalEntry = invoice.journalEntryId
      ? await prisma.journalEntry.findUnique({
          where: { id: invoice.journalEntryId },
          include: { lines: true },
        })
      : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. อัปเดตสถานะเป็น VOIDED
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: { status: 'VOIDED' },
      });

      // 2. คืนสต็อกสินค้าที่ตัดไปตอนขาย
      for (const item of invoice.items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const restoredStock = roundMoney(product.currentStock + item.quantity);
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: restoredStock },
        });
        if (invoice.warehouseId) {
          await upsertWarehouseStockDelta(tx, invoice.warehouseId, product.id, item.quantity);
        }
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            warehouseId: invoice.warehouseId,
            type: 'IN',
            quantity: item.quantity,
            unitCost: product.costPrice,
            balanceAfter: restoredStock,
            avgCostAfter: product.costPrice,
            referenceDocType: 'IV_VOID',
            referenceDocId: invoice.id,
            notes: `คืนสต็อกจากการยกเลิกใบแจ้งหนี้ ${invoice.invoiceNumber}`,
          },
        });
      }

      // 3. คืนสถานะใบสั่งขาย (ถ้ามี)
      if (invoice.soId) {
        await tx.salesOrder.update({
          where: { id: invoice.soId },
          data: { status: 'APPROVED' },
        });
      }

      // 4. ถ้ามี Journal Entry เดิม ให้สร้าง Reversal Entry
      if (journalEntry) {
        const revDocNumber = await generateDocNumber('JV', tx);

        const reversedLines = journalEntry.lines.map((line) => ({
          accountId: line.accountId,
          debitAmount: line.creditAmount,
          creditAmount: line.debitAmount,
          description: `กลับรายการยกเลิก ${invoice.invoiceNumber}`,
        }));

        await tx.journalEntry.create({
          data: {
            entryNumber: revDocNumber,
            entryDate: new Date(),
            journalType: 'SALES',
            memo: `ยกเลิกใบแจ้งหนี้เลขที่ ${invoice.invoiceNumber}`,
            sourceDocumentType: 'INVOICE_VOID',
            sourceDocumentId: invoice.id,
            lines: { create: reversedLines },
          },
        });
      }

      // 5. ลบ Tax Invoice ออกเพื่อไม่ให้ติดในรายงานภาษี
      await tx.taxInvoice.deleteMany({
        where: { invoiceId: id },
      });

      return updatedInvoice;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Invoice VOID Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
