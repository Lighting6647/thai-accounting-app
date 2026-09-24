// ===== Format Utilities =====
// จัดรูปแบบเงิน, วันที่ ภาษาไทย

/**
 * จัดรูปแบบตัวเลขเงิน
 * @example formatMoney(1234567.89) → '1,234,567.89'
 * @example formatMoney(1234567.89, true) → '฿1,234,567.89'
 */
export function formatMoney(amount: number | null | undefined, withSymbol = false): string {
  if (amount == null) return withSymbol ? '฿0.00' : '0.00';
  const formatted = Math.abs(amount).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : '';
  return withSymbol ? `${sign}฿${formatted}` : `${sign}${formatted}`;
}

/**
 * จัดรูปแบบวันที่เป็นภาษาไทย
 * @example formatDateThai(new Date('2026-09-16')) → '16/09/2569'
 */
export function formatDateThai(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear() + 543; // ปีพุทธศักราช
  return `${day}/${month}/${year}`;
}

/**
 * จัดรูปแบบวันที่สำหรับ input type="date"
 * @example formatDateInput(new Date('2026-09-16')) → '2026-09-16'
 */
export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * จัดรูปแบบวันที่แบบสั้น
 * @example formatDateShort(new Date('2026-09-16')) → '16 ก.ย. 69'
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                   'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = (d.getFullYear() + 543) % 100; // 2 หลักสุดท้ายของปี พ.ศ.
  return `${day} ${month} ${year}`;
}

/**
 * แปลงสถานะเอกสารเป็นภาษาไทย
 */
export function getStatusLabel(status: string): { label: string; className: string } {
  const statusMap: Record<string, { label: string; className: string }> = {
    DRAFT:    { label: 'ร่าง',        className: 'badge-draft' },
    UNPAID:   { label: 'รอชำระ',      className: 'badge-unpaid' },
    OVERDUE:  { label: 'เกินกำหนด',   className: 'badge-overdue' },
    PAID:     { label: 'ชำระแล้ว',    className: 'badge-paid' },
    VOIDED:   { label: 'ยกเลิก',      className: 'badge-voided' },
    POSTED:   { label: 'บันทึกแล้ว',  className: 'badge-posted' },
    RECORDED: { label: 'บันทึกแล้ว',  className: 'badge-posted' },
  };
  return statusMap[status] || { label: status, className: 'badge-draft' };
}

/**
 * แปลง category ผังบัญชีเป็นภาษาไทย
 */
export function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    ASSET: 'สินทรัพย์',
    LIABILITY: 'หนี้สิน',
    EQUITY: 'ส่วนของเจ้าของ',
    REVENUE: 'รายได้',
    EXPENSE: 'ค่าใช้จ่าย',
  };
  return map[category] || category;
}

/**
 * แปลงประเภท VAT เป็นภาษาไทย
 */
export function getVatTypeLabel(vatType: string): string {
  const map: Record<string, string> = {
    INCLUSIVE: 'รวม VAT',
    EXCLUSIVE: 'แยก VAT',
    NO_VAT: 'ไม่มี VAT',
  };
  return map[vatType] || vatType;
}

/**
 * แปลงวิธีชำระเงินเป็นภาษาไทย
 */
export function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    CASH: 'เงินสด',
    TRANSFER: 'โอนเงิน',
    CHEQUE: 'เช็ค',
  };
  return map[method] || method;
}

/**
 * แปลงตัวเลขเป็นจำนวนเงินตัวอักษรภาษาไทย (บาทถ้วน)
 * @example arabicToThaiBaht(1500) → 'หนึ่งพันห้าร้อยบาทถ้วน'
 */
export function arabicToThaiBaht(number: number | null | undefined): string {
  if (number == null || isNaN(number) || number === 0) return 'ศูนย์บาทถ้วน';

  const num = Math.abs(number).toFixed(2);
  const [bahtStr, satangStr] = num.split('.');

  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  function convertGroup(group: string): string {
    let result = '';
    const len = group.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(group[i], 10);
      const pos = len - i - 1;

      if (digit !== 0) {
        if (pos === 1 && digit === 1) {
          result += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่สิบ';
        } else if (pos === 0 && digit === 1 && len > 1 && group[len - 2] !== '0') {
          result += 'เอ็ด';
        } else {
          result += digits[digit] + units[pos];
        }
      }
    }
    return result;
  }

  let bahtText = '';
  let groupBaht = bahtStr;

  if (groupBaht.length > 6) {
    const millionPart = groupBaht.slice(0, groupBaht.length - 6);
    const remainderPart = groupBaht.slice(groupBaht.length - 6);
    bahtText = convertGroup(millionPart) + 'ล้าน' + convertGroup(remainderPart);
  } else {
    bahtText = convertGroup(groupBaht);
  }

  let satangText = '';
  const satangVal = parseInt(satangStr, 10);
  if (satangVal > 0) {
    satangText = convertGroup(satangStr) + 'สตางค์';
  } else {
    satangText = 'ถ้วน';
  }

  return `${bahtText}บาท${satangText}`;
}
