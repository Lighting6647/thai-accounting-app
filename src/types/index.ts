// ===== TypeScript Interfaces =====
// Types ที่ใช้ร่วมกันทั้ง Frontend และ Backend

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type BalanceType = 'DEBIT' | 'CREDIT';
export type JournalType = 'GENERAL' | 'SALES' | 'PURCHASE' | 'CASH_RECEIPT' | 'CASH_PAYMENT';
export type EntryStatus = 'DRAFT' | 'POSTED' | 'VOIDED';
export type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'OVERDUE' | 'PAID' | 'VOIDED';
export type ExpenseStatus = 'DRAFT' | 'RECORDED' | 'PAID' | 'VOIDED';
export type VatType = 'INCLUSIVE' | 'EXCLUSIVE' | 'NO_VAT';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CHEQUE';
export type BranchType = 'HEAD' | 'BRANCH';
export type TaxInvoiceType = 'SALES_TAX' | 'PURCHASE_TAX';
export type PndFormType = 'PND3' | 'PND53';
export type WhtCondition = '1' | '2' | '3';

// ===== Dashboard =====
export interface DashboardData {
  revenue: number;
  expenses: number;
  profit: number;
  vatPayable: number;     // ภาษีขาย - ภาษีซื้อ
  overdueCount: number;
  recentInvoices: InvoiceListItem[];
  recentExpenses: ExpenseListItem[];
  monthlyChart: MonthlyChartData[];
}

export interface MonthlyChartData {
  month: string;
  revenue: number;
  expenses: number;
}

// ===== Chart of Account =====
export interface AccountListItem {
  id: string;
  code: string;
  nameTh: string;
  nameEn?: string | null;
  category: AccountCategory;
  normalBalance: BalanceType;
  parentId?: string | null;
  isActive: boolean;
}

// ===== Contact =====
export interface ContactListItem {
  id: string;
  name: string;
  taxId?: string | null;
  branchType: BranchType;
  branchCode: string;
  phone?: string | null;
  email?: string | null;
  isCustomer: boolean;
  isVendor: boolean;
}

// ===== Journal Entry =====
export interface JournalEntryListItem {
  id: string;
  entryNumber: string;
  entryDate: string;
  journalType: JournalType;
  status: EntryStatus;
  memo?: string | null;
  totalDebit: number;
  totalCredit: number;
}

export interface JournalLineInput {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
}

export interface CreateJournalEntryInput {
  entryDate: string;
  journalType: JournalType;
  memo?: string;
  lines: JournalLineInput[];
}

// ===== Invoice =====
export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  contactName: string;
  status: InvoiceStatus;
  totalAmount: number;
  netAmount: number;
}

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface CreateInvoiceInput {
  invoiceDate: string;
  dueDate: string;
  contactId: string;
  vatType: VatType;
  vatRate: number;
  whtRate: number;
  notes?: string;
  items: InvoiceItemInput[];
}

// ===== Receipt =====
export interface ReceiptListItem {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  contactName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  attachmentUrl?: string | null;
  invoiceNumber?: string | null;
}

// ===== Expense =====
export interface ExpenseListItem {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  contactName?: string | null;
  category?: string | null;
  status: ExpenseStatus;
  totalAmount: number;
  netPayment: number;
  attachmentUrl?: string | null;
}

export interface ExpenseItemInput {
  accountId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface CreateExpenseInput {
  expenseDate: string;
  contactId?: string;
  category?: string;
  vatType: VatType;
  vatRate: number;
  whtRate: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: ExpenseItemInput[];
}

// ===== Withholding Tax (50 ทวิ) =====
export interface WhtListItem {
  id: string;
  whtNumber: string;
  formType: PndFormType;
  paymentDate: string;
  payerName: string;
  payeeName: string;
  incomeCategory: string;
  baseAmount: number;
  whtRate: number;
  whtAmount: number;
}

export interface CreateWhtInput {
  formType: PndFormType;
  paymentDate: string;
  payerContactId: string;
  payeeContactId: string;
  incomeCategory: string;
  incomeType: string;
  baseAmount: number;
  whtRate: number;
  whtCondition: WhtCondition;
}

// ===== Reports =====
export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  beginDebit: number;
  beginCredit: number;
  moveDebit: number;
  moveCredit: number;
  endDebit: number;
  endCredit: number;
}

export interface IncomeStatementData {
  revenues: { accountName: string; amount: number }[];
  expenses: { accountName: string; amount: number }[];
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  periodStart: string;
  periodEnd: string;
}

export interface BalanceSheetData {
  assets: { accountName: string; amount: number }[];
  liabilities: { accountName: string; amount: number }[];
  equity: { accountName: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  asOfDate: string;
}

// ===== Tax Reports =====
export interface VatReportData {
  month: number;
  year: number;
  salesTax: TaxInvoiceRow[];
  purchaseTax: TaxInvoiceRow[];
  totalSalesBase: number;
  totalSalesVat: number;
  totalPurchaseBase: number;
  totalPurchaseVat: number;
  vatPayable: number;  // ภาษีขาย - ภาษีซื้อ
}

export interface TaxInvoiceRow {
  seq: number;
  taxInvoiceNumber: string;
  taxInvoiceDate: string;
  contactName: string;
  contactTaxId: string;
  contactBranch: string;
  subtotalAmount: number;
  vatAmount: number;
}

export interface WhtSummaryData {
  month: number;
  year: number;
  formType: PndFormType;
  items: WhtListItem[];
  totalBase: number;
  totalWht: number;
}
