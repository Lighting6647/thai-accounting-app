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
      const so = await prisma.salesOrder.findUnique({
        where: { id },
        include: {
          contact: true,
          warehouse: true,
          qt: true,
          items: { include: { product: true } },
        },
      });
      if (!so) {
        return NextResponse.json({ error: 'ไม่พบใบสั่งขาย' }, { status: 404 });
      }
      return NextResponse.json(so);
    }

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { soNumber: { contains: search } },
        { contact: { name: { contains: search } } },
      ];
    }

    const orders = await prisma.salesOrder.findMany({
      where,
      orderBy: { soDate: 'desc' },
      include: { contact: true, warehouse: true, qt: true, items: true },
    });

    const formatted = orders.map((so) => ({
      id: so.id,
      soNumber: so.soNumber,
      soDate: so.soDate.toISOString(),
      deliveryDate: so.deliveryDate ? so.deliveryDate.toISOString() : null,
      qtNumber: so.qt?.qtNumber || null,
      contactId: so.contactId,
      contactName: so.contact?.name || '-',
      warehouseName: so.warehouse?.name || '-',
      status: so.status,
      vatType: so.vatType,
      discountAmount: so.discountAmount,
      subtotal: so.subtotal,
      vatAmount: so.vatAmount,
      totalAmount: so.totalAmount,
      itemCount: so.items.length,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('SalesOrders GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      soDate,
      deliveryDate,
      qtId,
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
      return NextResponse.json({ error: 'กรุณาเลือกลูกค้า' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุรายการสินค้าอย่างน้อย 1 รายการ' }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า' }, { status: 400 });
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
      const soNumber = await generateDocNumber('SO', tx);

      const so = await tx.salesOrder.create({
        data: {
          soNumber,
          soDate: soDate ? new Date(soDate) : new Date(),
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          qtId: qtId || null,
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

      if (qtId) {
        await tx.quotation.update({
          where: { id: qtId },
          data: { status: 'ORDERED' },
        });
      }

      return so;
    });

    return NextResponse.json(created);
  } catch (error: any) {
    console.error('SalesOrders POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, action } = await request.json();
    if (!id || !action) {
      return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
    }

    const so = await prisma.salesOrder.findUnique({ where: { id } });
    if (!so) return NextResponse.json({ error: 'ไม่พบใบสั่งขาย' }, { status: 404 });

    if (action === 'APPROVE') {
      if (so.status === 'VOIDED') {
        return NextResponse.json({ error: 'ไม่สามารถอนุมัติเอกสารที่ถูกยกเลิกแล้ว' }, { status: 400 });
      }
      const updated = await prisma.salesOrder.update({
        where: { id },
        data: { status: 'APPROVED' },
      });
      return NextResponse.json(updated);
    }

    if (action === 'VOID') {
      if (so.status === 'INVOICED') {
        return NextResponse.json({ error: 'ใบสั่งขายนี้เปิดใบแจ้งหนี้แล้ว กรุณายกเลิกใบแจ้งหนี้ก่อน' }, { status: 400 });
      }
      const updated = await prisma.salesOrder.update({
        where: { id },
        data: { status: 'VOIDED' },
      });
      if (so.qtId) {
        await prisma.quotation.update({
          where: { id: so.qtId },
          data: { status: 'APPROVED' },
        });
      }
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'ไม่รองรับคำสั่งนี้' }, { status: 400 });
  } catch (error: any) {
    console.error('SalesOrders PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
