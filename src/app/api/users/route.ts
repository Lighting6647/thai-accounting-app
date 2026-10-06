import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, name, password, role } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้มีในระบบแล้ว' }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        name: name.trim(),
        password: password.trim(),
        role: role || 'ACCOUNTANT',
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'ไม่สามารถเพิ่มผู้ใช้งานได้' }, { status: 500 });
  }
}
