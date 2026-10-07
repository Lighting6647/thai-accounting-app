import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let company = await prisma.company.findFirst();
    if (!company) {
      // Return default initial data or create first default entry
      company = await prisma.company.create({
        data: {
          name: 'บริษัท ตัวอย่าง จำกัด',
          taxId: '0105566778899',
          branchCode: '00000',
          address: '123 ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
          phone: '02-123-4567',
          email: 'contact@example.co.th'
        }
      });
    }
    return NextResponse.json(company);
  } catch (error: any) {
    console.error('Company GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, taxId, branchCode, address, phone, email, logo } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อบริษัท' }, { status: 400 });
    }

    let company = await prisma.company.findFirst();

    if (company) {
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          name: name.trim(),
          taxId: taxId ? taxId.trim() : null,
          branchCode: branchCode ? branchCode.trim() : '00000',
          address: address ? address.trim() : null,
          phone: phone ? phone.trim() : null,
          email: email ? email.trim() : null,
          logo: logo || null
        }
      });
    } else {
      company = await prisma.company.create({
        data: {
          name: name.trim(),
          taxId: taxId ? taxId.trim() : null,
          branchCode: branchCode ? branchCode.trim() : '00000',
          address: address ? address.trim() : null,
          phone: phone ? phone.trim() : null,
          email: email ? email.trim() : null,
          logo: logo || null
        }
      });
    }

    return NextResponse.json(company);
  } catch (error: any) {
    console.error('Company POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
