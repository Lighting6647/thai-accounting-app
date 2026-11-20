const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const devDbPath = path.join(projectRoot, 'prisma', 'dev.db');
const templateDataPath = path.join(projectRoot, 'src', 'lib', 'sqlite-template-data.ts');

let databaseUrl = (process.env.DATABASE_URL || '').trim();
if (!databaseUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
  if (match) {
    databaseUrl = match[1].trim();
  }
}

const isPostgres =
  databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function runNpx(args, extraEnv = {}) {
  execFileSync(npxBin, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  });
}

if (isPostgres) {
  console.log('PostgreSQL detected: running prisma db push --skip-generate...');
  runNpx(['prisma', 'db', 'push', '--skip-generate']);
  console.log('PostgreSQL schema synced.');
  process.exit(0);
}

// Local SQLite mode: keep sqlite-template-data.ts synced when dev.db is present
if (fs.existsSync(devDbPath)) {
  const b64 = zlib.gzipSync(fs.readFileSync(devDbPath), { level: 9 }).toString('base64');
  const content = `// Auto-generated gzipped SQLite bootstrap for Vercel Serverless\nexport const SQLITE_TEMPLATE_GZ_B64 =\n  '${b64}';\n`;
  const prev = fs.existsSync(templateDataPath) ? fs.readFileSync(templateDataPath, 'utf8') : '';
  if (prev !== content) {
    fs.writeFileSync(templateDataPath, content, 'utf8');
    console.log('Updated src/lib/sqlite-template-data.ts from prisma/dev.db.');
  } else {
    console.log('src/lib/sqlite-template-data.ts is already up to date.');
  }
  process.exit(0);
}

console.log('SQLite serverless build: using committed src/lib/sqlite-template-data.ts.');
