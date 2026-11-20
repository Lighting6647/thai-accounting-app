'use client';

import ExpressDocumentForm from '@/components/erp/ExpressDocumentForm';

export default function NewInvoicePage() {
  return (
    <ExpressDocumentForm
      docKind="IV"
      title="สร้างใบแจ้งหนี้ / ใบกำกับภาษีขาย (IV)"
      subtitle="ดึงรายการจากใบสั่งขาย (SO) หรือเลือกรหัสสินค้า ตัดสต็อกอัตโนมัติ (ห้ามติดลบ) พร้อมคำนวณต้นทุนขาย & Auto-GL"
      backHref="/income/invoices"
      submitEndpoint="/api/invoices"
      contactFilter="customer"
      contactLabel="ลูกค้า"
      dateLabel="วันที่ออกใบแจ้งหนี้"
      secondaryDateLabel="วันครบกำหนดชำระ"
      defaultDaysOffset={30}
      showWarehouse
      showWht
      checkStockWarning
      sourceConfig={{
        label: 'ดึงข้อมูลจากใบสั่งขาย (SO):',
        listEndpoint: '/api/ar/sales-orders?status=APPROVED',
        detailEndpoint: '/api/ar/sales-orders',
        numberField: 'soNumber',
        targetField: 'soId',
      }}
    />
  );
}
