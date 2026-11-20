const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');

let databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
  if (match) {
    databaseUrl = match[1].trim();
  }
}

if (!fs.existsSync(schemaPath)) {
  console.error('prisma/schema.prisma not found');
  process.exit(1);
}

let targetProvider = null;
if (databaseUrl.startsWith('file:')) {
  targetProvider = 'sqlite';
} else if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
  targetProvider = 'postgresql';
}

if (!targetProvider) {
  console.log('DATABASE_URL protocol not recognized or missing; keeping existing provider.');
  process.exit(0);
}

const schema = fs.readFileSync(schemaPath, 'utf8');
const updated = schema.replace(
  /(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*")([^"]+)(")/,
  `$1${targetProvider}$3`
);

if (updated !== schema) {
  fs.writeFileSync(schemaPath, updated, 'utf8');
  console.log(`Synced prisma/schema.prisma provider to "${targetProvider}".`);
} else {
  console.log(`prisma/schema.prisma provider already "${targetProvider}".`);
}
