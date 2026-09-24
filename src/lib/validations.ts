import { z } from 'zod';

// ===== Zod Validation Schemas =====

export const createContactSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อผู้ติดต่อ'),
  taxId: z.string().optional().nullable(),
  branchType: z.enum(['HEAD', 'BRANCH']).default('HEAD'),
  branchCode: z.string().default('00000'),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().nullable().or(z.literal('')),
  isCustomer: z.boolean().default(true),
  isVendor: z.boolean().default(false),
});

export const createAccountSchema = z.object({
  code: z.string().min(1, 'กรุณาระบุรหัสบัญชี'),
  nameTh: z.string().min(1, 'กรุณาระบุชื่อบัญชีภาษาไทย'),
  nameEn: z.string().optional().nullable(),
  category: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  normalBalance: z.enum(['DEBIT', 'CREDIT']),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const journalLineSchema = z.object({
  accountId: z.string().min(1, 'กรุณาเลือกบัญชี'),
  debitAmount: z.number().min(0, 'จำนวนเงินต้องไม่ติดลบ').default(0),
  creditAmount: z.number().min(0, 'จำนวนเงินต้องไม่ติดลบ').default(0),
  description: z.string().optional().nullable(),
});

export const createJournalSchema = z.object({
  entryDate: z.string().min(1, 'กรุณาระบุวันที่'),
  journalType: z.enum(['GENERAL', 'SALES', 'PURCHASE', 'CASH_RECEIPT', 'CASH_PAYMENT']).default('GENERAL'),
  memo: z.string().optional().nullable(),
  lines: z.array(journalLineSchema).min(2, 'ต้องมีอย่างน้อย 2 รายการบัญชี (เดบิต/เครดิต)'),
}).refine((data) => {
  const totalDebit = data.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  return Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
}, {
  message: 'ผลรวมเดบิตและเครดิตต้องเท่ากันและมากกว่า 0',
  path: ['lines'],
});

export const itemLineSchema = z.object({
  description: z.string().min(1, 'กรุณาระบุรายละเอียดรายการ'),
  quantity: z.number().min(0.01, 'จำนวนต้องมากกว่า 0'),
  unitPrice: z.number().min(0, 'ราคาต่อหน่วยต้องไม่ติดลบ'),
});

export const createInvoiceSchema = z.object({
  invoiceDate: z.string().min(1, 'กรุณาระบุวันที่ออก'),
  dueDate: z.string().min(1, 'กรุณาระบุวันครบกำหนด'),
  contactId: z.string().min(1, 'กรุณาเลือกลูกค้า'),
  vatType: z.enum(['EXCLUSIVE', 'INCLUSIVE', 'NO_VAT']).default('EXCLUSIVE'),
  vatRate: z.number().default(7),
  whtRate: z.number().default(0),
  notes: z.string().optional().nullable(),
  items: z.array(itemLineSchema).min(1, 'ต้องมีอย่างน้อย 1 รายการ'),
});

export const createExpenseSchema = z.object({
  expenseDate: z.string().min(1, 'กรุณาระบุวันที่'),
  contactId: z.string().optional().nullable(),
  category: z.string().min(1, 'กรุณาระบุหมวดค่าใช้จ่าย'),
  vatType: z.enum(['EXCLUSIVE', 'INCLUSIVE', 'NO_VAT']).default('EXCLUSIVE'),
  vatRate: z.number().default(7),
  whtRate: z.number().default(0),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHEQUE']).default('TRANSFER'),
  attachmentUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(itemLineSchema).min(1, 'ต้องมีอย่างน้อย 1 รายการ'),
});

export const createWhtSchema = z.object({
  formType: z.enum(['PND3', 'PND53']),
  paymentDate: z.string().min(1, 'กรุณาระบุวันที่จ่าย'),
  payerContactId: z.string().min(1, 'กรุณาระบุผู้จ่ายเงิน'),
  payeeContactId: z.string().min(1, 'กรุณาระบุผู้รับเงิน'),
  incomeCategory: z.string().min(1, 'กรุณาระบุหมวดรายได้'),
  incomeType: z.string().min(1, 'กรุณาระบุประเภทเงินได้'),
  baseAmount: z.number().min(0.01, 'จำนวนเงินต้องมากกว่า 0'),
  whtRate: z.number().min(0, 'อัตราภาษีต้องไม่ติดลบ'),
  whtCondition: z.enum(['1', '2', '3']).default('1'),
});
