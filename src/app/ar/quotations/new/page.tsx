'use client';

import ExpressDocumentForm from '@/components/erp/ExpressDocumentForm';

export default function NewQuotationPage() {
  return (
    <ExpressDocumentForm
      docKind="QT"
      title="สร้างใบเสนอราคา (QT)"
      subtitle="เลือกสินค้าจากคลัง กำหนดส่วนลดรายตัว/ท้ายบิล และคำนวณ VAT 7% เพื่อเสนอราคาให้ลูกค้า"
      backHref="/ar/quotations"
      submitEndpoint="/api/ar/quotations"
      contactFilter="customer"
      contactLabel="ลูกค้า"
      dateLabel="วันที่ใบเสนอราคา"
      secondaryDateLabel="ยืนยันราคาถึงวันที่"
      defaultDaysOffset={15}
      showWarehouse={false}
      showWht={false}
    />
  );
}
