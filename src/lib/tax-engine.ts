// ===== Thai Tax & Inventory Costing Engine =====
// คำนวณ VAT 7%, ภาษีหัก ณ ที่จ่าย (WHT), ส่วนลด และต้นทุนเฉลี่ยเคลื่อนที่ (Moving Average)

export type VatType = 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT';

export interface TaxCalculationInput {
  subtotal: number;       // ยอดรวมรายการก่อนหักส่วนลดท้ายบิล (ถ้า EXCLUSIVE/NO_VAT คือยอดก่อน VAT, ถ้า INCLUSIVE คือยอดรวม VAT)
  discountAmount?: number; // ส่วนลดท้ายบิล (บาท)
  vatType: VatType;
  vatRate?: number;        // ค่าเริ่มต้น 7%
  whtRate?: number;        // อัตราหัก ณ ที่จ่าย (0, 1, 2, 3, 5%)
}

export interface TaxCalculationResult {
  grossAmount: number;    // ยอดรวมรายการก่อนหักส่วนลดท้ายบิล
  discountAmount: number; // ส่วนลดท้ายบิล
  subtotal: number;       // ราคาก่อน VAT (ฐานภาษี)
  vatRate: number;
  vatAmount: number;
  whtRate: number;
  whtAmount: number;
  totalAmount: number;    // subtotal + vatAmount
  netAmount: number;      // totalAmount - whtAmount (ยอดรับ/จ่ายสุทธิ)
}

/**
 * คำนวณภาษี VAT 7%, ส่วนลดท้ายบิล และหัก ณ ที่จ่าย
 *
 * กฎสำคัญ:
 * - VAT EXCLUSIVE: ราคาที่ใส่คือราคาก่อน VAT → VAT = ฐานหลังหักส่วนลด × 7%
 * - VAT INCLUSIVE: ราคาที่ใส่รวม VAT แล้ว → subtotal = ยอดหลังหักส่วนลด / 1.07, VAT = ยอดหลังหักส่วนลด - subtotal
 * - NO_VAT: ไม่คิด VAT
 * - WHT คิดจากฐานภาษี (subtotal) ไม่ใช่จาก totalAmount
 */
export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  const vatRate = input.vatRate ?? 7;
  const whtRate = input.whtRate ?? 0;
  const grossAmount = roundMoney(Math.max(0, input.subtotal));
  const discountAmount = roundMoney(Math.min(grossAmount, Math.max(0, input.discountAmount ?? 0)));
  const afterDiscount = roundMoney(Math.max(0, grossAmount - discountAmount));

  let subtotal: number;
  let vatAmount: number;

  switch (input.vatType) {
    case 'INCLUSIVE': {
      // ราคารวม VAT → ต้องแยก VAT ออก
      const divisor = 1 + vatRate / 100;
      subtotal = roundMoney(afterDiscount / divisor);
      vatAmount = roundMoney(afterDiscount - subtotal);
      break;
    }
    case 'EXCLUSIVE': {
      // ราคาไม่รวม VAT → เพิ่ม VAT
      subtotal = afterDiscount;
      vatAmount = roundMoney(subtotal * (vatRate / 100));
      break;
    }
    case 'NO_VAT':
    default: {
      subtotal = afterDiscount;
      vatAmount = 0;
      break;
    }
  }

  const totalAmount = roundMoney(subtotal + vatAmount);

  // WHT คิดจากฐานภาษี (subtotal) ไม่ใช่จาก total
  const whtAmount = roundMoney(subtotal * (whtRate / 100));
  const netAmount = roundMoney(totalAmount - whtAmount);

  return {
    grossAmount,
    discountAmount,
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
 * คำนวณราคารวมสุทธิของแถวรายการหลังหักส่วนลดรายตัว
 */
export function calculateLineAmount(quantity: number, unitPrice: number, discount = 0): number {
  const gross = quantity * unitPrice;
  const net = Math.max(0, gross - Math.max(0, discount));
  return roundMoney(net);
}

/**
 * คำนวณต้นทุนเฉลี่ยเคลื่อนที่ (Moving Average Cost) ตามมาตรฐานโปรแกรมบัญชี Express
 * สูตร: ((สต็อกเดิม × ต้นทุนเดิม) + (จำนวนรับเข้า × ต้นทุนรับเข้า)) / (สต็อกเดิม + จำนวนรับเข้า)
 */
export function calculateMovingAverage(
  currentStock: number,
  currentCost: number,
  incomingQty: number,
  incomingUnitCost: number
): { newStock: number; newAvgCost: number } {
  const safeCurrentStock = Math.max(0, currentStock);
  const safeCurrentCost = Math.max(0, currentCost);
  const safeIncomingQty = Math.max(0, incomingQty);
  const safeIncomingCost = Math.max(0, incomingUnitCost);

  const newStock = roundMoney(safeCurrentStock + safeIncomingQty);
  if (newStock <= 0) {
    return { newStock: 0, newAvgCost: roundMoney(safeIncomingCost || safeCurrentCost) };
  }

  const totalValue = safeCurrentStock * safeCurrentCost + safeIncomingQty * safeIncomingCost;
  const newAvgCost = roundMoney(totalValue / newStock);

  return { newStock, newAvgCost };
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
