import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'ออกจากระบบเรียบร้อยแล้ว' });
  response.cookies.delete('auth_user');
  return response;
}
