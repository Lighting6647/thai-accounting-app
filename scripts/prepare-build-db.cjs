const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const devDbPath = path.join(projectRoot, 'prisma', 'dev.db');
const templatePath = path.join(projectRoot, 'prisma', 'template.sqlite');

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
  if (!fs.existsSync(templatePath)) {
    fs.writeFileSync(templatePath, '');
  }
  console.log('PostgreSQL schema synced.');
  process.exit(0);
}

// SQLite mode
if (fs.existsSync(devDbPath)) {
  fs.copyFileSync(devDbPath, templatePath);
  console.log('Copied prisma/dev.db to prisma/template.sqlite for tracing.');
  process.exit(0);
}

console.log('No local dev.db found: building fresh seeded prisma/template.sqlite...');
if (fs.existsSync(templatePath)) {
  fs.unlinkSync(templatePath);
}

const templateUrl = 'file:./template.sqlite?connection_limit=1&socket_timeout=15';
runNpx(['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
  DATABASE_URL: templateUrl,
});
runNpx(['tsx', 'prisma/seed.ts'], { DATABASE_URL: templateUrl });
runNpx(['tsx', 'prisma/seed-users.ts'], { DATABASE_URL: templateUrl });
runNpx(['tsx', 'prisma/seed-express-erp.ts'], { DATABASE_URL: templateUrl });
console.log('Built and seeded prisma/template.sqlite successfully.');
