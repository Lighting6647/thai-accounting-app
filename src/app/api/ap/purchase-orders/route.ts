import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { computeErpDocumentTotals, ensureDefaultWarehouse } from '@/lib/erp-helpers';
import { VatType } from '@/lib/tax-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (id) {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          contact: true,
          warehouse: true,
          items: { include: { product: true } },
          goodsReceipts: true,
        },
      });
      if (!po) {
        return NextResponse.json({ error: 'ไม่พบใบสั่งซื้อ' }, { status: 404 });
      }
      return NextResponse.json(po);
    }

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { contact: { name: { contains: search } } },
      ];
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { poDate: 'desc' },
      include: { contact: true, warehouse: true, items: true },
    });

    const formatted = orders.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      poDate: po.poDate.toISOString(),
      expectedDate: po.expectedDate ? po.expectedDate.toISOString() : null,
      contactId: po.contactId,
      contactName: po.contact?.name || '-',
      warehouseId: po.warehouseId,
      warehouseName: po.warehouse?.name || '-',
      status: po.status,
      vatType: po.vatType,
      discountAmount: po.discountAmount,
      subtotal: po.subtotal,
      vatAmount: po.vatAmount,
      totalAmount: po.totalAmount,
      itemCount: po.items.length,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('PurchaseOrders GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      poDate,
      expectedDate,
      contactId,
      warehouseId,
      vatType = 'EXCLUSIVE',
      discountAmount = 0,
      vatRate = 7,
      notes,
      status = 'APPROVED',
      items,
    } = body;

    if (!contactId) {
      return NextResponse.json({ error: 'กรุณาเลือกผู้ขาย / คู่ค้า' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุรายการสินค้าอย่างน้อย 1 รายการ' }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ขาย' }, { status: 400 });
    }

    const { normalizedItems, tax } = computeErpDocumentTotals(
      items,
      Number(discountAmount) || 0,
      vatType as VatType,
      Number(vatRate) || 7,
      0
    );

    const created = await prisma.$transaction(async (tx) => {
      const targetWh = warehouseId
        ? await tx.warehouse.findUnique({ where: { id: warehouseId } })
        : await ensureDefaultWarehouse(tx);
      const poNumber = await generateDocNumber('PO', tx);

      return tx.purchaseOrder.create({
        data: {
          poNumber,
          poDate: poDate ? new Date(poDate) : new Date(),
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          contactId,
          warehouseId: targetWh?.id || null,
          status: ['DRAFT', 'APPROVED'].includes(status) ? status : 'APPROVED',
          vatType,
          discountAmount: tax.discountAmount,
          subtotal: tax.subtotal,
          vatRate: tax.vatRate,
          vatAmount: tax.vatAmount,
          totalAmount: tax.totalAmount,
          notes: notes || null,
          items: { create: normalizedItems },
        },
        include: { contact: true, warehouse: true, items: true },
      });
    });

    return NextResponse.json(created);
  } catch (error: any) {
    console.error('PurchaseOrders POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, action } = await request.json();
    if (!id || !action) {
      return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      return NextResponse.json({ error: 'ไม่พบใบสั่งซื้อ' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      if (po.status === 'VOIDED') {
        return NextResponse.json({ error: 'ไม่สามารถอนุมัติเอกสารที่ถูกยกเลิกแล้ว' }, { status: 400 });
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: 'APPROVED' },
      });
      return NextResponse.json(updated);
    }

    if (action === 'VOID') {
      if (po.status === 'RECEIVED') {
        return NextResponse.json({ error: 'ใบสั่งซื้อนี้รับสินค้าแล้ว กรุณายกเลิกใบรับสินค้าก่อน' }, { status: 400 });
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: 'VOIDED' },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'ไม่รองรับคำสั่งนี้' }, { status: 400 });
  } catch (error: any) {
    console.error('PurchaseOrders PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
