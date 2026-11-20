import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { computeErpDocumentTotals } from '@/lib/erp-helpers';
import { VatType } from '@/lib/tax-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (id) {
      const qt = await prisma.quotation.findUnique({
        where: { id },
        include: {
          contact: true,
          items: { include: { product: true } },
          salesOrders: true,
        },
      });
      if (!qt) {
        return NextResponse.json({ error: 'ไม่พบใบเสนอราคา' }, { status: 404 });
      }
      return NextResponse.json(qt);
    }

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { qtNumber: { contains: search } },
        { contact: { name: { contains: search } } },
      ];
    }

    const quotations = await prisma.quotation.findMany({
      where,
      orderBy: { qtDate: 'desc' },
      include: { contact: true, items: true },
    });

    const formatted = quotations.map((qt) => ({
      id: qt.id,
      qtNumber: qt.qtNumber,
      qtDate: qt.qtDate.toISOString(),
      validUntil: qt.validUntil.toISOString(),
      contactId: qt.contactId,
      contactName: qt.contact?.name || '-',
      status: qt.status,
      vatType: qt.vatType,
      discountAmount: qt.discountAmount,
      subtotal: qt.subtotal,
      vatAmount: qt.vatAmount,
      totalAmount: qt.totalAmount,
      itemCount: qt.items.length,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Quotations GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      qtDate,
      validUntil,
      contactId,
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

    const quoteDate = qtDate ? new Date(qtDate) : new Date();
    const defaultValid = new Date(quoteDate);
    defaultValid.setDate(defaultValid.getDate() + 15);

    const created = await prisma.$transaction(async (tx) => {
      const qtNumber = await generateDocNumber('QT', tx);
      return tx.quotation.create({
        data: {
          qtNumber,
          qtDate: quoteDate,
          validUntil: validUntil ? new Date(validUntil) : defaultValid,
          contactId,
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
        include: { contact: true, items: true },
      });
    });

    return NextResponse.json(created);
  } catch (error: any) {
    console.error('Quotations POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, action } = await request.json();
    if (!id || !action) {
      return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
    }

    const qt = await prisma.quotation.findUnique({ where: { id } });
    if (!qt) return NextResponse.json({ error: 'ไม่พบใบเสนอราคา' }, { status: 404 });

    if (action === 'APPROVE') {
      if (qt.status === 'VOIDED') {
        return NextResponse.json({ error: 'ไม่สามารถอนุมัติเอกสารที่ถูกยกเลิกแล้ว' }, { status: 400 });
      }
      const updated = await prisma.quotation.update({
        where: { id },
        data: { status: 'APPROVED' },
      });
      return NextResponse.json(updated);
    }

    if (action === 'VOID') {
      if (qt.status === 'ORDERED') {
        return NextResponse.json({ error: 'ใบเสนอราคานี้ถูกนำไปสร้างใบสั่งขายแล้ว' }, { status: 400 });
      }
      const updated = await prisma.quotation.update({
        where: { id },
        data: { status: 'VOIDED' },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'ไม่รองรับคำสั่งนี้' }, { status: 400 });
  } catch (error: any) {
    console.error('Quotations PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
