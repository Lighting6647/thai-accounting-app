import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateDocNumber } from '@/lib/doc-number';
import { roundMoney } from '@/lib/tax-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const assets = await prisma.fixedAsset.findMany({
      orderBy: { code: 'asc' },
    });

    const formatted = assets.map((a) => {
      // คำนวณค่าเสื่อมราคาต่อปี (Straight-Line)
      // (ราคาทุน - มูลค่าซาก) / อายุการใช้งาน
      const annualDepr = a.usefulLifeYears > 0 ? (a.costValue - a.salvageValue) / a.usefulLifeYears : 0;
      const monthlyDepr = annualDepr / 12;
      const netBookValue = a.costValue - a.accumDepreciation;

      return {
        ...a,
        annualDepr: roundMoney(annualDepr),
        monthlyDepr: roundMoney(monthlyDepr),
        netBookValue: roundMoney(netBookValue),
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Fixed Assets API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check action: 'CREATE' or 'RUN_DEPRECIATION'
    if (body.action === 'RUN_DEPRECIATION') {
      const { year, month } = body;
      const targetDate = new Date(year, month - 1, 28);

      const activeAssets = await prisma.fixedAsset.findMany({
        where: { status: 'ACTIVE' },
      });

      let totalDeprThisMonth = 0;
      const assetUpdates: { id: string; deprAmount: number }[] = [];

      for (const a of activeAssets) {
        if (a.accumDepreciation >= a.costValue - a.salvageValue) continue;

        const annualDepr = a.usefulLifeYears > 0 ? (a.costValue - a.salvageValue) / a.usefulLifeYears : 0;
        const monthlyDepr = roundMoney(annualDepr / 12);

        const remainingDepr = (a.costValue - a.salvageValue) - a.accumDepreciation;
        const actualDepr = Math.min(monthlyDepr, remainingDepr);

        if (actualDepr > 0) {
          totalDeprThisMonth += actualDepr;
          assetUpdates.push({ id: a.id, deprAmount: actualDepr });
        }
      }

      if (totalDeprThisMonth <= 0) {
        return NextResponse.json({ message: 'ไม่มีสินทรัพย์ที่ต้องคำนวณค่าเสื่อมราคาเพิ่มในเดือนนี้' });
      }

      totalDeprThisMonth = roundMoney(totalDeprThisMonth);

      // Create Auto Journal Entry:
      // Dr. 5350 ค่าเสื่อมราคา
      // Cr. 1221 ค่าเสื่อมราคาสะสม
      const deprAccount = await prisma.chartOfAccount.findFirst({ where: { code: '5350' } });
      const accumDeprAccount = await prisma.chartOfAccount.findFirst({ where: { code: '1221' } });

      const result = await prisma.$transaction(async (tx) => {
        // อัปเดตสะสมในสินทรัพย์แต่ละชิ้น
        for (const u of assetUpdates) {
          await tx.fixedAsset.update({
            where: { id: u.id },
            data: {
              accumDepreciation: { increment: u.deprAmount },
              lastDeprDate: targetDate,
            },
          });
        }

        if (deprAccount && accumDeprAccount) {
          const jvNumber = await generateDocNumber('JV');
          await tx.journalEntry.create({
            data: {
              entryNumber: jvNumber,
              entryDate: targetDate,
              journalType: 'GENERAL',
              memo: `บันทึกค่าเสื่อมราคาประจำเดือน ${month}/${year}`,
              sourceDocumentType: 'DEPRECIATION',
              lines: {
                create: [
                  {
                    accountId: deprAccount.id,
                    debitAmount: totalDeprThisMonth,
                    creditAmount: 0,
                    description: `ค่าเสื่อมราคาประจำเดือน ${month}/${year}`,
                  },
                  {
                    accountId: accumDeprAccount.id,
                    debitAmount: 0,
                    creditAmount: totalDeprThisMonth,
                    description: `ค่าเสื่อมราคาสะสมประจำเดือน ${month}/${year}`,
                  },
                ],
              },
            },
          });
        }

        return { count: assetUpdates.length, totalDepreciation: totalDeprThisMonth };
      });

      return NextResponse.json(result);
    }

    // Default CREATE asset
    const { code, name, category, purchaseDate, costValue, salvageValue, usefulLifeYears } = body;

    if (!code || !name || !costValue) {
      return NextResponse.json({ error: 'กรุณาระบุรหัส, ชื่อสินทรัพย์ และราคาทุน' }, { status: 400 });
    }

    const existing = await prisma.fixedAsset.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'รหัสสินทรัพย์นี้มีอยู่แล้ว' }, { status: 400 });
    }

    const asset = await prisma.fixedAsset.create({
      data: {
        code,
        name,
        category: category || 'อุปกรณ์สำนักงาน',
        purchaseDate: new Date(purchaseDate || Date.now()),
        costValue: Number(costValue),
        salvageValue: Number(salvageValue) || 1,
        usefulLifeYears: Number(usefulLifeYears) || 5,
        accumDepreciation: 0,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json(asset);
  } catch (error: any) {
    console.error('Fixed Asset POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
