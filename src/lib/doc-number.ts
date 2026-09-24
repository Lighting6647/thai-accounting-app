import prisma from './db';

// ===== Document Number Generator =====
// สร้างเลขที่เอกสารอัตโนมัติตามรูปแบบ PREFIX-YYYYMM-NNN

type DocType = 'JV' | 'IV' | 'RC' | 'EXP' | 'WHT';

const DOC_PREFIXES: Record<DocType, { prefix: string; model: string; field: string }> = {
  JV:  { prefix: 'JV',  model: 'journalEntry',   field: 'entryNumber' },
  IV:  { prefix: 'IV',  model: 'invoice',         field: 'invoiceNumber' },
  RC:  { prefix: 'RC',  model: 'receipt',          field: 'receiptNumber' },
  EXP: { prefix: 'EXP', model: 'expense',          field: 'expenseNumber' },
  WHT: { prefix: 'WHT', model: 'withholdingTax',   field: 'whtNumber' },
};

/**
 * สร้างเลขที่เอกสารถัดไป
 * รูปแบบ: PREFIX-YYYYMM-001, PREFIX-YYYYMM-002, ...
 * 
 * @example generateDocNumber('IV') → 'IV-202609-001'
 */
export async function generateDocNumber(docType: DocType): Promise<string> {
  const config = DOC_PREFIXES[docType];
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `${config.prefix}-${yearMonth}-`;

  // หาเลขล่าสุดของเดือนนี้
  const lastDoc = await (prisma as any)[config.model].findFirst({
    where: {
      [config.field]: { startsWith: prefix },
    },
    orderBy: { [config.field]: 'desc' },
    select: { [config.field]: true },
  });

  let nextNum = 1;
  if (lastDoc) {
    const lastNumber = lastDoc[config.field] as string;
    const parts = lastNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextNum = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}
