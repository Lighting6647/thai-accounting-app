import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ผังบัญชีมาตรฐานไทย 5 หมวด
const CHART_OF_ACCOUNTS = [
  // ===== หมวด 1: สินทรัพย์ (Assets) =====
  { code: '1000', nameTh: 'สินทรัพย์', nameEn: 'Assets', category: 'ASSET', normalBalance: 'DEBIT' },
  { code: '1100', nameTh: 'สินทรัพย์หมุนเวียน', nameEn: 'Current Assets', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1000' },
  { code: '1110', nameTh: 'เงินสดและเงินฝากธนาคาร', nameEn: 'Cash and Bank', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1100' },
  { code: '1111', nameTh: 'เงินสด', nameEn: 'Cash', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1110' },
  { code: '1112', nameTh: 'เงินฝากธนาคาร - ออมทรัพย์', nameEn: 'Savings Account', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1110' },
  { code: '1113', nameTh: 'เงินฝากธนาคาร - กระแสรายวัน', nameEn: 'Current Account', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1110' },
  { code: '1120', nameTh: 'ลูกหนี้การค้า', nameEn: 'Accounts Receivable', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1100' },
  { code: '1130', nameTh: 'ภาษีซื้อ', nameEn: 'Input VAT', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1100' },
  { code: '1131', nameTh: 'ภาษีซื้อยังไม่ถึงกำหนด', nameEn: 'Undue Input VAT', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1100' },
  { code: '1140', nameTh: 'ภาษีหัก ณ ที่จ่ายค้างรับ', nameEn: 'WHT Receivable', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1100' },
  { code: '1150', nameTh: 'สินค้าคงเหลือ', nameEn: 'Inventory', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1100' },
  { code: '1160', nameTh: 'วัสดุสำนักงาน', nameEn: 'Office Supplies', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1100' },
  { code: '1170', nameTh: 'เงินทดรองจ่าย', nameEn: 'Advance Payment', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1100' },
  { code: '1180', nameTh: 'ค่าใช้จ่ายจ่ายล่วงหน้า', nameEn: 'Prepaid Expenses', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1100' },
  { code: '1200', nameTh: 'สินทรัพย์ไม่หมุนเวียน', nameEn: 'Non-current Assets', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1000' },
  { code: '1210', nameTh: 'อาคาร', nameEn: 'Building', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1200' },
  { code: '1211', nameTh: 'ค่าเสื่อมราคาสะสม - อาคาร', nameEn: 'Accum. Dep. Building', category: 'ASSET', normalBalance: 'CREDIT', parentCode: '1200' },
  { code: '1220', nameTh: 'อุปกรณ์สำนักงาน', nameEn: 'Office Equipment', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1200' },
  { code: '1221', nameTh: 'ค่าเสื่อมราคาสะสม - อุปกรณ์', nameEn: 'Accum. Dep. Equipment', category: 'ASSET', normalBalance: 'CREDIT', parentCode: '1200' },
  { code: '1230', nameTh: 'ยานพาหนะ', nameEn: 'Vehicles', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1200' },
  { code: '1231', nameTh: 'ค่าเสื่อมราคาสะสม - ยานพาหนะ', nameEn: 'Accum. Dep. Vehicles', category: 'ASSET', normalBalance: 'CREDIT', parentCode: '1200' },
  { code: '1240', nameTh: 'คอมพิวเตอร์และซอฟต์แวร์', nameEn: 'Computer & Software', category: 'ASSET', normalBalance: 'DEBIT', parentCode: '1200' },
  { code: '1241', nameTh: 'ค่าเสื่อมราคาสะสม - คอมพิวเตอร์', nameEn: 'Accum. Dep. Computer', category: 'ASSET', normalBalance: 'CREDIT', parentCode: '1200' },

  // ===== หมวด 2: หนี้สิน (Liabilities) =====
  { code: '2000', nameTh: 'หนี้สิน', nameEn: 'Liabilities', category: 'LIABILITY', normalBalance: 'CREDIT' },
  { code: '2100', nameTh: 'หนี้สินหมุนเวียน', nameEn: 'Current Liabilities', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2000' },
  { code: '2110', nameTh: 'เจ้าหนี้การค้า', nameEn: 'Accounts Payable', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2100' },
  { code: '2120', nameTh: 'ภาษีขาย', nameEn: 'Output VAT', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2100' },
  { code: '2121', nameTh: 'ภาษีขายยังไม่ถึงกำหนด', nameEn: 'Undue Output VAT', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2100' },
  { code: '2130', nameTh: 'ภาษีหัก ณ ที่จ่ายค้างจ่าย', nameEn: 'WHT Payable', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2100' },
  { code: '2140', nameTh: 'ภาษีเงินได้นิติบุคคลค้างจ่าย', nameEn: 'Corporate Tax Payable', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2100' },
  { code: '2150', nameTh: 'เงินเดือนค้างจ่าย', nameEn: 'Salary Payable', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2100' },
  { code: '2160', nameTh: 'ค่าใช้จ่ายค้างจ่าย', nameEn: 'Accrued Expenses', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2100' },
  { code: '2170', nameTh: 'รายได้รับล่วงหน้า', nameEn: 'Unearned Revenue', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2100' },
  { code: '2200', nameTh: 'หนี้สินไม่หมุนเวียน', nameEn: 'Non-current Liabilities', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2000' },
  { code: '2210', nameTh: 'เงินกู้ยืมระยะยาว', nameEn: 'Long-term Loan', category: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2200' },

  // ===== หมวด 3: ส่วนของเจ้าของ (Equity) =====
  { code: '3000', nameTh: 'ส่วนของเจ้าของ', nameEn: 'Equity', category: 'EQUITY', normalBalance: 'CREDIT' },
  { code: '3100', nameTh: 'ทุนจดทะเบียน', nameEn: 'Registered Capital', category: 'EQUITY', normalBalance: 'CREDIT', parentCode: '3000' },
  { code: '3200', nameTh: 'กำไรสะสม', nameEn: 'Retained Earnings', category: 'EQUITY', normalBalance: 'CREDIT', parentCode: '3000' },
  { code: '3300', nameTh: 'กำไร(ขาดทุน)สุทธิ', nameEn: 'Net Income (Loss)', category: 'EQUITY', normalBalance: 'CREDIT', parentCode: '3000' },

  // ===== หมวด 4: รายได้ (Revenue) =====
  { code: '4000', nameTh: 'รายได้', nameEn: 'Revenue', category: 'REVENUE', normalBalance: 'CREDIT' },
  { code: '4100', nameTh: 'รายได้จากการขายสินค้า', nameEn: 'Sales Revenue', category: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4000' },
  { code: '4200', nameTh: 'รายได้จากการให้บริการ', nameEn: 'Service Revenue', category: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4000' },
  { code: '4300', nameTh: 'รายได้อื่น', nameEn: 'Other Revenue', category: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4000' },
  { code: '4310', nameTh: 'ดอกเบี้ยรับ', nameEn: 'Interest Income', category: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4300' },
  { code: '4320', nameTh: 'กำไรจากการจำหน่ายสินทรัพย์', nameEn: 'Gain on Asset Disposal', category: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4300' },
  { code: '4400', nameTh: 'ส่วนลดรับ', nameEn: 'Discount Received', category: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4000' },

  // ===== หมวด 5: ค่าใช้จ่าย (Expenses) =====
  { code: '5000', nameTh: 'ค่าใช้จ่าย', nameEn: 'Expenses', category: 'EXPENSE', normalBalance: 'DEBIT' },
  { code: '5100', nameTh: 'ต้นทุนขาย', nameEn: 'Cost of Goods Sold', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5000' },
  { code: '5200', nameTh: 'ค่าใช้จ่ายในการขาย', nameEn: 'Selling Expenses', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5000' },
  { code: '5210', nameTh: 'ค่าโฆษณา', nameEn: 'Advertising Expense', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5200' },
  { code: '5220', nameTh: 'ค่าขนส่ง', nameEn: 'Delivery Expense', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5200' },
  { code: '5230', nameTh: 'ค่านายหน้า', nameEn: 'Commission Expense', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5200' },
  { code: '5300', nameTh: 'ค่าใช้จ่ายในการบริหาร', nameEn: 'Administrative Expenses', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5000' },
  { code: '5310', nameTh: 'เงินเดือนและค่าแรง', nameEn: 'Salary & Wages', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5300' },
  { code: '5320', nameTh: 'ค่าเช่าสำนักงาน', nameEn: 'Office Rent', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5300' },
  { code: '5330', nameTh: 'ค่าสาธารณูปโภค', nameEn: 'Utilities', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5300' },
  { code: '5331', nameTh: 'ค่าไฟฟ้า', nameEn: 'Electricity', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5330' },
  { code: '5332', nameTh: 'ค่าน้ำประปา', nameEn: 'Water', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5330' },
  { code: '5333', nameTh: 'ค่าอินเทอร์เน็ต/โทรศัพท์', nameEn: 'Internet/Phone', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5330' },
  { code: '5340', nameTh: 'ค่าวัสดุสำนักงาน', nameEn: 'Office Supplies Expense', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5300' },
  { code: '5350', nameTh: 'ค่าเสื่อมราคา', nameEn: 'Depreciation Expense', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5300' },
  { code: '5360', nameTh: 'ค่าซ่อมแซม', nameEn: 'Repair & Maintenance', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5300' },
  { code: '5370', nameTh: 'ค่าประกันภัย', nameEn: 'Insurance Expense', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5300' },
  { code: '5380', nameTh: 'ค่าเดินทาง', nameEn: 'Travel Expense', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5300' },
  { code: '5390', nameTh: 'ค่าบริการวิชาชีพ', nameEn: 'Professional Fee', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5300' },
  { code: '5400', nameTh: 'ค่าใช้จ่ายอื่น', nameEn: 'Other Expenses', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5000' },
  { code: '5410', nameTh: 'ดอกเบี้ยจ่าย', nameEn: 'Interest Expense', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5400' },
  { code: '5420', nameTh: 'ค่าปรับ', nameEn: 'Fines & Penalties', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5400' },
  { code: '5430', nameTh: 'ส่วนลดจ่าย', nameEn: 'Discount Given', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5400' },
  { code: '5500', nameTh: 'ภาษีเงินได้นิติบุคคล', nameEn: 'Corporate Income Tax', category: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5000' },
];

async function main() {
  console.log('🌱 เริ่มสร้างข้อมูลเริ่มต้น...');

  // 1. สร้างข้อมูลบริษัท
  const company = await prisma.company.upsert({
    where: { id: 'default-company' },
    update: {},
    create: {
      id: 'default-company',
      name: 'บริษัท ตัวอย่าง จำกัด',
      taxId: '0105500000001',
      branchCode: '00000',
      address: '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
      phone: '02-123-4567',
      email: 'info@example.co.th',
    },
  });
  console.log(`✅ บริษัท: ${company.name}`);

  // 2. สร้างผังบัญชี
  // สร้างบัญชีหลักก่อน (ไม่มี parent)
  const accountIdMap: Record<string, string> = {};

  // Pass 1: สร้างทุกบัญชี (ยังไม่ลิงก์ parent)
  for (const acc of CHART_OF_ACCOUNTS) {
    const created = await prisma.chartOfAccount.upsert({
      where: { code: acc.code },
      update: {
        nameTh: acc.nameTh,
        nameEn: acc.nameEn || null,
        category: acc.category,
        normalBalance: acc.normalBalance,
      },
      create: {
        code: acc.code,
        nameTh: acc.nameTh,
        nameEn: acc.nameEn || null,
        category: acc.category,
        normalBalance: acc.normalBalance,
      },
    });
    accountIdMap[acc.code] = created.id;
  }

  // Pass 2: อัพเดท parentId
  for (const acc of CHART_OF_ACCOUNTS) {
    if (acc.parentCode && accountIdMap[acc.parentCode]) {
      await prisma.chartOfAccount.update({
        where: { code: acc.code },
        data: { parentId: accountIdMap[acc.parentCode] },
      });
    }
  }

  console.log(`✅ ผังบัญชี: ${CHART_OF_ACCOUNTS.length} รายการ`);

  // 3. สร้างผู้ติดต่อตัวอย่าง
  const contacts = [
    {
      name: 'บริษัท ลูกค้าตัวอย่าง จำกัด',
      taxId: '0105500000101',
      isCustomer: true,
      isVendor: false,
      address: '456 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900',
      phone: '02-987-6543',
      email: 'customer@example.com',
    },
    {
      name: 'บริษัท คู่ค้าตัวอย่าง จำกัด',
      taxId: '0105500000201',
      isCustomer: false,
      isVendor: true,
      address: '789 ถ.เพชรบุรี แขวงถนนเพชรบุรี เขตราชเทวี กรุงเทพฯ 10400',
      phone: '02-555-1234',
      email: 'vendor@example.com',
    },
    {
      name: 'นายสมชาย ใจดี',
      taxId: '1100500000111',
      isCustomer: false,
      isVendor: true,
      branchType: 'HEAD',
      address: '10 ซ.สุขุมวิท 22 แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110',
      phone: '081-234-5678',
    },
  ];

  for (const c of contacts) {
    await prisma.contact.create({ data: c });
  }
  console.log(`✅ ผู้ติดต่อ: ${contacts.length} รายการ`);

  console.log('\n🎉 สร้างข้อมูลเริ่มต้นเรียบร้อยแล้ว!');
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาด:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
