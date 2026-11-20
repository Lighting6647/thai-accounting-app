import prisma from './db';

// ===== Document Number Generator =====
// สร้างเลขที่เอกสารอัตโนมัติตามรูปแบบ PREFIX-YYYYMM-NNN

export type DocType =
  | 'JV'
  | 'IV'
  | 'RC'
  | 'EXP'
  | 'WHT'
  | 'PO'
  | 'RR'
  | 'PV'
  | 'QT'
  | 'SO'
  | 'AJ';

const DOC_PREFIXES: Record<DocType, { prefix: string; model: string; field: string }> = {
  JV:  { prefix: 'JV',  model: 'journalEntry',    field: 'entryNumber' },
  IV:  { prefix: 'IV',  model: 'invoice',         field: 'invoiceNumber' },
  RC:  { prefix: 'RC',  model: 'receipt',         field: 'receiptNumber' },
  EXP: { prefix: 'EXP', model: 'expense',         field: 'expenseNumber' },
  WHT: { prefix: 'WHT', model: 'withholdingTax',  field: 'whtNumber' },
  PO:  { prefix: 'PO',  model: 'purchaseOrder',   field: 'poNumber' },
  RR:  { prefix: 'RR',  model: 'goodsReceipt',    field: 'rrNumber' },
  PV:  { prefix: 'PV',  model: 'paymentVoucher',  field: 'pvNumber' },
  QT:  { prefix: 'QT',  model: 'quotation',       field: 'qtNumber' },
  SO:  { prefix: 'SO',  model: 'salesOrder',      field: 'soNumber' },
  AJ:  { prefix: 'AJ',  model: 'stockAdjustment', field: 'adjustNumber' },
};

/**
 * สร้างเลขที่เอกสารถัดไป
 * รูปแบบ: PREFIX-YYYYMM-001, PREFIX-YYYYMM-002, ...
 *
 * @example generateDocNumber('IV') → 'IV-202609-001'
 */
export async function generateDocNumber(docType: DocType, txClient?: any): Promise<string> {
  const client = txClient || prisma;
  const config = DOC_PREFIXES[docType];
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `${config.prefix}-${yearMonth}-`;

  // หาเลขล่าสุดของเดือนนี้
  const lastDoc = await (client as any)[config.model].findFirst({
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
