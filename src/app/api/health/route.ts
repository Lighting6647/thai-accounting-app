import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Keep SQLite database connection active & warm
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
