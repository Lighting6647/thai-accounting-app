'use client';

import ExpressDocumentForm from '@/components/erp/ExpressDocumentForm';

export default function NewPurchaseOrderPage() {
  return (
    <ExpressDocumentForm
      docKind="PO"
      title="สร้างใบสั่งซื้อสินค้า (PO)"
      subtitle="บันทึกรายการสั่งซื้อสินค้าจากผู้ขาย พร้อมเลือกคลังรับสินค้าและคำนวณ VAT 7%"
      backHref="/ap/purchase-orders"
      submitEndpoint="/api/ap/purchase-orders"
      contactFilter="vendor"
      contactLabel="ผู้ขาย / คู่ค้า"
      dateLabel="วันที่ใบสั่งซื้อ"
      secondaryDateLabel="วันที่คาดว่าจะได้รับสินค้า"
      defaultDaysOffset={7}
      showWarehouse
      showWht={false}
    />
  );
}
