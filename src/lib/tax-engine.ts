// ===== Thai Tax Engine =====
// คำนวณ VAT 7% และภาษีหัก ณ ที่จ่าย (WHT) ตามกฎสรรพากรไทย

export type VatType = 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT';

export interface TaxCalculationInput {
  subtotal: number;       // ราคาก่อน VAT (ถ้า EXCLUSIVE) หรือ ราคารวม VAT (ถ้า INCLUSIVE)
  vatType: VatType;
  vatRate?: number;        // ค่าเริ่มต้น 7%
  whtRate?: number;        // อัตราหัก ณ ที่จ่าย (0, 1, 2, 3, 5%)
}

export interface TaxCalculationResult {
  subtotal: number;       // ราคาก่อน VAT (ฐานภาษี)
  vatRate: number;
  vatAmount: number;
  whtRate: number;
  whtAmount: number;
  totalAmount: number;    // subtotal + vatAmount
  netAmount: number;      // totalAmount - whtAmount (ยอดรับสุทธิ)
}

/**
 * คำนวณภาษี VAT 7% และหัก ณ ที่จ่าย
 * 
 * กฎสำคัญ:
 * - VAT EXCLUSIVE: ราคาที่ใส่คือราคาก่อน VAT → VAT = subtotal × 7%
 * - VAT INCLUSIVE: ราคาที่ใส่รวม VAT แล้ว → subtotal = price / 1.07, VAT = price - subtotal
 * - NO_VAT: ไม่คิด VAT
 * - WHT คิดจากฐานภาษี (subtotal) ไม่ใช่จาก totalAmount
 */
export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  const vatRate = input.vatRate ?? 7;
  const whtRate = input.whtRate ?? 0;

  let subtotal: number;
  let vatAmount: number;

  switch (input.vatType) {
    case 'INCLUSIVE': {
      // ราคารวม VAT → ต้องแยก VAT ออก
      const divisor = 1 + (vatRate / 100);
      subtotal = roundMoney(input.subtotal / divisor);
      vatAmount = roundMoney(input.subtotal - subtotal);
      break;
    }
    case 'EXCLUSIVE': {
      // ราคาไม่รวม VAT → เพิ่ม VAT
      subtotal = roundMoney(input.subtotal);
      vatAmount = roundMoney(subtotal * (vatRate / 100));
      break;
    }
    case 'NO_VAT':
    default: {
      subtotal = roundMoney(input.subtotal);
      vatAmount = 0;
      break;
    }
  }

  const totalAmount = roundMoney(subtotal + vatAmount);

  // WHT คิดจากฐานภาษี (subtotal) ไม่ใช่จาก total
  const whtAmount = roundMoney(subtotal * (whtRate / 100));
  const netAmount = roundMoney(totalAmount - whtAmount);

  return {
    subtotal,
    vatRate: input.vatType === 'NO_VAT' ? 0 : vatRate,
    vatAmount,
    whtRate,
    whtAmount,
    totalAmount,
    netAmount,
  };
}

/**
 * คำนวณราคารวมของรายการ (quantity × unitPrice)
 */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}

/**
 * ปัดเศษเงินให้เหลือ 2 ตำแหน่ง (สตางค์)
 */
export function roundMoney(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * อัตราหัก ณ ที่จ่ายที่พบบ่อยในไทย
 */
export const WHT_RATES = [
  { rate: 0, label: 'ไม่หัก' },
  { rate: 1, label: '1% - ค่าขนส่ง, เบี้ยประกัน' },
  { rate: 2, label: '2% - ค่าโฆษณา' },
  { rate: 3, label: '3% - ค่าบริการ, ค่าจ้างทำของ' },
  { rate: 5, label: '5% - ค่าเช่าทรัพย์สิน' },
] as const;

/**
 * ประเภทเงินได้ตามกฎหมายสรรพากร (สำหรับ 50 ทวิ)
 */
export const INCOME_TYPES = [
  { code: '40(1)', label: '40(1) เงินเดือน ค่าจ้าง' },
  { code: '40(2)', label: '40(2) ค่าจ้างทั่วไป, ค่านายหน้า' },
  { code: '40(3)', label: '40(3) ค่าลิขสิทธิ์, สิทธิบัตร' },
  { code: '40(4)(ก)', label: '40(4)(ก) ดอกเบี้ย' },
  { code: '40(4)(ข)', label: '40(4)(ข) เงินปันผล' },
  { code: '40(5)', label: '40(5) ค่าเช่าทรัพย์สิน' },
  { code: '40(6)', label: '40(6) ค่าวิชาชีพอิสระ' },
  { code: '40(7)', label: '40(7) ค่ารับเหมา' },
  { code: '40(8)', label: '40(8) ค่าบริการ, ค่าจ้างทำของ, อื่นๆ' },
] as const;

/**
 * หมวดค่าใช้จ่ายที่พบบ่อย
 */
export const EXPENSE_CATEGORIES = [
  'ค่าเช่าสำนักงาน',
  'ค่าสาธารณูปโภค',
  'ค่าขนส่ง',
  'ค่าวัสดุสำนักงาน',
  'ค่าบริการวิชาชีพ',
  'ค่าโฆษณา',
  'ค่าซ่อมแซม',
  'ค่าประกันภัย',
  'ค่าอินเทอร์เน็ต/โทรศัพท์',
  'ค่าเดินทาง',
  'ค่าอาหาร/เครื่องดื่ม',
  'อื่นๆ',
] as const;
