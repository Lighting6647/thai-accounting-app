'use client';

import ExpressDocumentForm from '@/components/erp/ExpressDocumentForm';

export default function NewSalesOrderPage() {
  return (
    <ExpressDocumentForm
      docKind="SO"
      title="สร้างใบสั่งขาย (SO)"
      subtitle="ดึงข้อมูลจากใบเสนอราคา (QT) หรือสั่งขายใหม่ พร้อมเลือกคลังสินค้าที่จะจัดส่ง"
      backHref="/ar/sales-orders"
      submitEndpoint="/api/ar/sales-orders"
      contactFilter="customer"
      contactLabel="ลูกค้า"
      dateLabel="วันที่ใบสั่งขาย"
      secondaryDateLabel="กำหนดส่งสินค้า"
      defaultDaysOffset={7}
      showWarehouse
      showWht={false}
      sourceConfig={{
        label: 'ดึงข้อมูลจากใบเสนอราคา (QT):',
        listEndpoint: '/api/ar/quotations?status=APPROVED',
        detailEndpoint: '/api/ar/quotations',
        numberField: 'qtNumber',
        targetField: 'qtId',
      }}
    />
  );
}
