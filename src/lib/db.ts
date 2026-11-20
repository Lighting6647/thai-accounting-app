import fs from 'node:fs';
import zlib from 'node:zlib';
import { PrismaClient } from '@prisma/client';
import { SQLITE_TEMPLATE_GZ_B64 } from './sqlite-template-data';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  const isPostgres =
    databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless && !isPostgres) {
    const tmpDbPath = '/tmp/accounting.sqlite';
    try {
      const needsInit = !fs.existsSync(tmpDbPath) || fs.statSync(tmpDbPath).size < 16384;
      if (needsInit) {
        const dbBuffer = zlib.gunzipSync(Buffer.from(SQLITE_TEMPLATE_GZ_B64, 'base64'));
        fs.writeFileSync(tmpDbPath, dbBuffer);
        try {
          fs.chmodSync(tmpDbPath, 0o666);
        } catch {
          // Ignore chmod errors if platform disallows
        }
      }
    } catch (err) {
      console.error('Failed to initialize /tmp/accounting.sqlite:', err);
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
