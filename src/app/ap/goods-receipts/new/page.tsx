'use client';

import ExpressDocumentForm from '@/components/erp/ExpressDocumentForm';

export default function NewGoodsReceiptPage() {
  return (
    <ExpressDocumentForm
      docKind="RR"
      title="รับสินค้าเข้าคลัง / ซื้อเชื่อ (RR)"
      subtitle="ดึงข้อมูลจากใบสั่งซื้อ (PO) หรือคีย์รายการใหม่เพื่อคำนวณ Moving Average ตั้งเจ้าหนี้ Auto-GL และบันทึกภาษีซื้อ"
      backHref="/ap/goods-receipts"
      submitEndpoint="/api/ap/goods-receipts"
      contactFilter="vendor"
      contactLabel="ผู้ขาย / เจ้าหนี้"
      dateLabel="วันที่รับสินค้า / ออกบิล"
      secondaryDateLabel="วันครบกำหนดชำระหนี้"
      defaultDaysOffset={30}
      showWarehouse
      showVendorInvoiceNo
      showWht
      sourceConfig={{
        label: 'ดึงข้อมูลจากใบสั่งซื้อ (PO):',
        listEndpoint: '/api/ap/purchase-orders?status=APPROVED',
        detailEndpoint: '/api/ap/purchase-orders',
        numberField: 'poNumber',
        targetField: 'poId',
      }}
    />
  );
}
