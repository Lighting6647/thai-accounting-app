import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  const isPostgres =
    databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless && !isPostgres) {
    const tmpDbPath = '/tmp/accounting.sqlite';
    try {
      if (!fs.existsSync(tmpDbPath)) {
        const candidates = [
          path.join(process.cwd(), 'prisma', 'template.sqlite'),
          path.join(process.cwd(), 'prisma', 'dev.db'),
        ];
        const sourceDb = candidates.find((p) => fs.existsSync(p));
        if (sourceDb) {
          fs.copyFileSync(sourceDb, tmpDbPath);
          try {
            fs.chmodSync(tmpDbPath, 0o666);
          } catch {
            // Ignore chmod errors if platform disallows
          }
        }
      }
    } catch (err) {
      console.error('Failed to prepare /tmp/accounting.sqlite:', err);
    }

    return new PrismaClient({
      datasources: {
        db: {
          url: 'file:/tmp/accounting.sqlite?connection_limit=1&socket_timeout=15',
        },
      },
    });
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

globalForPrisma.prisma = prisma;

export default prisma;
