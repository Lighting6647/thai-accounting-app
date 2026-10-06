import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('auth_user');

    if (!userCookie || !userCookie.value) {
      // Default fallback as ADMIN if not logged in yet for smooth transition
      return NextResponse.json({
        user: {
          id: 'admin-default',
          username: 'admin',
          name: 'ผู้ดูแลระบบ (Admin)',
          role: 'ADMIN',
        },
      });
    }

    const user = JSON.parse(userCookie.value);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({
      user: {
        id: 'admin-default',
        username: 'admin',
        name: 'ผู้ดูแลระบบ (Admin)',
        role: 'ADMIN',
      },
    });
  }
}
