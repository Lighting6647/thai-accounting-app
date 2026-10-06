import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      username: 'admin',
      name: 'ผู้ดูแลระบบ (Admin)',
      password: 'admin123',
      role: 'ADMIN',
    },
    {
      username: 'manager',
      name: 'ผู้จัดการการเงิน (Manager)',
      password: 'manager123',
      role: 'MANAGER',
    },
    {
      username: 'accountant',
      name: 'นักบัญชีประจำ (Accountant)',
      password: 'accountant123',
      role: 'ACCOUNTANT',
    },
    {
      username: 'viewer',
      name: 'ผู้เข้าชมรายงาน (Viewer)',
      password: 'viewer123',
      role: 'VIEWER',
    },
  ];

  console.log('Seeding initial users securely without data loss...');

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        role: u.role,
        isActive: true,
      },
      create: {
        username: u.username,
        name: u.name,
        password: u.password,
        role: u.role,
        isActive: true,
      },
    });
  }

  console.log('Users seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
