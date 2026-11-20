import { PrismaClient } from '@prisma/client';
import { calculateMovingAverage, calculateTax, roundMoney } from '../src/lib/tax-engine';

const prisma = new PrismaClient();

async function ensureBaseAccounts() {
  const requiredAccounts = [
    { code: '1111', nameTh: 'เงินสด', category: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1112', nameTh: 'เงินฝากธนาคาร - ออมทรัพย์', category: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1120', nameTh: 'ลูกหนี้การค้า', category: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1130', nameTh: 'ภาษีซื้อ', category: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1140', nameTh: 'ภาษีหัก ณ ที่จ่ายค้างรับ', category: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1150', nameTh: 'สินค้าคงเหลือ', category: 'ASSET', normalBalance: 'DEBIT' },
    { code: '2110', nameTh: 'เจ้าหนี้การค้า', category: 'LIABILITY', normalBalance: 'CREDIT' },
    { code: '2120', nameTh: 'ภาษีขาย', category: 'LIABILITY', normalBalance: 'CREDIT' },
    { code: '2130', nameTh: 'ภาษีหัก ณ ที่จ่ายค้างจ่าย', category: 'LIABILITY', normalBalance: 'CREDIT' },
    { code: '4100', nameTh: 'รายได้จากการขายสินค้า', category: 'REVENUE', normalBalance: 'CREDIT' },
    { code: '4300', nameTh: 'รายได้อื่น', category: 'REVENUE', normalBalance: 'CREDIT' },
    { code: '5100', nameTh: 'ต้นทุนขาย', category: 'EXPENSE', normalBalance: 'DEBIT' },
    { code: '5300', nameTh: 'ค่าใช้จ่ายในการบริหาร', category: 'EXPENSE', normalBalance: 'DEBIT' },
  ];

  const map: Record<string, string> = {};
  for (const acc of requiredAccounts) {
    const found = await prisma.chartOfAccount.upsert({
      where: { code: acc.code },
      update: {},
      create: acc,
    });
    map[acc.code] = found.id;
  }
  return map;
}

async function main() {
  console.log('🌱 เริ่มสร้างข้อมูล Express ERP (Non-Destructive)...');

  const accMap = await ensureBaseAccounts();

  // 1. คลังสินค้า (Multi-Warehouse)
  const whMain = await prisma.warehouse.upsert({
    where: { code: 'WH-01' },
    update: { isDefault: true, isActive: true },
    create: {
      code: 'WH-01',
      name: 'คลังสินค้าหลัก (สำนักงานใหญ่)',
      location: 'ถ.สุขุมวิท กรุงเทพฯ',
      isDefault: true,
      isActive: true,
    },
  });

  const whBranch = await prisma.warehouse.upsert({
    where: { code: 'WH-02' },
    update: { isActive: true },
    create: {
      code: 'WH-02',
      name: 'คลังสินค้าสาขาลาดพร้าว',
      location: 'ถ.ลาดพร้าว กรุงเทพฯ',
      isDefault: false,
      isActive: true,
    },
  });

  // 2. ผู้ติดต่อ (ลูกค้า & คู่ค้า)
  let customer = await prisma.contact.findFirst({ where: { isCustomer: true } });
  if (!customer) {
    customer = await prisma.contact.create({
      data: {
        name: 'บริษัท สยามเทค โซลูชั่น จำกัด',
        taxId: '0105561001234',
        branchType: 'HEAD',
        branchCode: '00000',
        address: '88 อาคารเอ็มไพร์ ทาวเวอร์ ถ.สาทรใต้ กรุงเทพฯ 10120',
        phone: '02-670-1122',
        email: 'procurement@siamtech.co.th',
        isCustomer: true,
        isVendor: false,
      },
    });
  }

  let vendor = await prisma.contact.findFirst({ where: { isVendor: true } });
  if (!vendor) {
    vendor = await prisma.contact.create({
      data: {
        name: 'บริษัท ไทยซัพพลาย ดิสทริบิวชั่น จำกัด',
        taxId: '0105559005678',
        branchType: 'HEAD',
        branchCode: '00000',
        address: '199 ถ.พระราม 9 เขตห้วยขวาง กรุงเทพฯ 10310',
        phone: '02-245-8899',
        email: 'sales@thaisupply.co.th',
        isCustomer: false,
        isVendor: true,
      },
    });
  }

  // 3. สินค้า (Products) + Moving Average + Multi-Warehouse Stock
  const sampleProducts = [
    {
      code: 'SKU-NB01',
      name: 'โน้ตบุ๊กทำงาน ThinkBook 14 Pro',
      unit: 'เครื่อง',
      sellingPrice: 28900,
      costPrice: 22000,
      wh1Qty: 12,
      wh2Qty: 4,
      reorderPoint: 5,
    },
    {
      code: 'SKU-MN02',
      name: 'จอมอนิเตอร์ IPS 27 นิ้ว 4K',
      unit: 'เครื่อง',
      sellingPrice: 12500,
      costPrice: 8900,
      wh1Qty: 8,
      wh2Qty: 3,
      reorderPoint: 5,
    },
    {
      code: 'SKU-PR03',
      name: 'เครื่องพิมพ์เลเซอร์ไร้สาย Multi-Function',
      unit: 'เครื่อง',
      sellingPrice: 8900,
      costPrice: 6400,
      wh1Qty: 3,
      wh2Qty: 1,
      reorderPoint: 5, // Low Stock Alert
    },
    {
      code: 'SKU-KB04',
      name: 'คีย์บอร์ดไร้สาย Mechanical ภาษาไทย',
      unit: 'ชุด',
      sellingPrice: 2490,
      costPrice: 1650,
      wh1Qty: 2,
      wh2Qty: 0,
      reorderPoint: 10, // Low Stock Alert
    },
    {
      code: 'SKU-CH05',
      name: 'เก้าอี้สำนักงาน Ergonomic รุ่น Pro',
      unit: 'ตัว',
      sellingPrice: 6900,
      costPrice: 4500,
      wh1Qty: 10,
      wh2Qty: 5,
      reorderPoint: 4,
    },
  ];

  const productMap: Record<string, any> = {};
  for (const item of sampleProducts) {
    const existing = await prisma.product.findUnique({ where: { code: item.code } });
    if (!existing) {
      const totalQty = item.wh1Qty + item.wh2Qty;
      const p = await prisma.product.create({
        data: {
          code: item.code,
          name: item.name,
          unit: item.unit,
          sellingPrice: item.sellingPrice,
          costPrice: item.costPrice,
          currentStock: totalQty,
          reorderPoint: item.reorderPoint,
        },
      });
      await prisma.warehouseStock.create({
        data: { warehouseId: whMain.id, productId: p.id, quantity: item.wh1Qty },
      });
      await prisma.warehouseStock.create({
        data: { warehouseId: whBranch.id, productId: p.id, quantity: item.wh2Qty },
      });
      if (item.wh1Qty > 0) {
        await prisma.stockMovement.create({
          data: {
            productId: p.id,
            warehouseId: whMain.id,
            type: 'IN',
            quantity: item.wh1Qty,
            unitCost: item.costPrice,
            balanceAfter: item.wh1Qty,
            avgCostAfter: item.costPrice,
            referenceDocType: 'INITIAL',
            notes: 'ยอดยกมาคลังหลัก',
          },
        });
      }
      if (item.wh2Qty > 0) {
        await prisma.stockMovement.create({
          data: {
            productId: p.id,
            warehouseId: whBranch.id,
            type: 'IN',
            quantity: item.wh2Qty,
            unitCost: item.costPrice,
            balanceAfter: totalQty,
            avgCostAfter: item.costPrice,
            referenceDocType: 'INITIAL',
            notes: 'ยอดยกมาคลังสาขาลาดพร้าว',
          },
        });
      }
      productMap[item.code] = p;
    } else {
      productMap[item.code] = existing;
    }
  }

  // ซิงค์สินค้าเดิม (ถ้ามีใน DB อยู่แล้วแต่ยังไม่มี WarehouseStock) เข้า WH-01
  const allProducts = await prisma.product.findMany({ include: { warehouseStocks: true } });
  for (const p of allProducts) {
    if (p.warehouseStocks.length === 0 && p.currentStock > 0) {
      await prisma.warehouseStock.create({
        data: { warehouseId: whMain.id, productId: p.id, quantity: p.currentStock },
      });
    }
  }

  const now = new Date();
  const daysAgo = (d: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - d);
    return dt;
  };
  const daysAhead = (d: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    return dt;
  };

  // 4. ตัวอย่างวงจรซื้อ (AP): PO -> RR -> PV
  const pNb = productMap['SKU-NB01'];
  const pMn = productMap['SKU-MN02'];
  const pCh = productMap['SKU-CH05'];

  if (!(await prisma.purchaseOrder.findUnique({ where: { poNumber: 'PO-202611-001' } }))) {
    const tax1 = calculateTax({ subtotal: 2 * 21500, vatType: 'EXCLUSIVE', vatRate: 7 });
    const po1 = await prisma.purchaseOrder.create({
      data: {
        poNumber: 'PO-202611-001',
        poDate: daysAgo(18),
        expectedDate: daysAgo(15),
        contactId: vendor.id,
        warehouseId: whMain.id,
        status: 'RECEIVED',
        vatType: 'EXCLUSIVE',
        subtotal: tax1.subtotal,
        vatRate: 7,
        vatAmount: tax1.vatAmount,
        totalAmount: tax1.totalAmount,
        notes: 'สั่งซื้อโน้ตบุ๊กเพิ่มเข้าคลังหลัก',
        items: {
          create: [
            {
              productId: pNb.id,
              description: pNb.name,
              quantity: 2,
              unitPrice: 21500,
              amount: 43000,
            },
          ],
        },
      },
    });

    const { newStock, newAvgCost } = calculateMovingAverage(pNb.currentStock, pNb.costPrice, 2, 21500);
    await prisma.product.update({
      where: { id: pNb.id },
      data: { currentStock: newStock, costPrice: newAvgCost },
    });
    const whStockNb = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: whMain.id, productId: pNb.id } },
    });
    if (whStockNb) {
      await prisma.warehouseStock.update({
        where: { id: whStockNb.id },
        data: { quantity: roundMoney(whStockNb.quantity + 2) },
      });
    }

    const jvRr = await prisma.journalEntry.create({
      data: {
        entryNumber: 'JV-202611-901',
        entryDate: daysAgo(15),
        journalType: 'PURCHASE',
        memo: 'ตั้งเจ้าหนี้ซื้อเชื่อ/รับสินค้า RR-202611-001',
        sourceDocumentType: 'GOODS_RECEIPT',
        lines: {
          create: [
            { accountId: accMap['1150'], debitAmount: tax1.subtotal, creditAmount: 0, description: 'รับสินค้า - RR-202611-001' },
            { accountId: accMap['1130'], debitAmount: tax1.vatAmount, creditAmount: 0, description: 'ภาษีซื้อ - RR-202611-001' },
            { accountId: accMap['2110'], debitAmount: 0, creditAmount: tax1.totalAmount, description: 'เจ้าหนี้การค้า - RR-202611-001' },
          ],
        },
      },
    });

    const rr1 = await prisma.goodsReceipt.create({
      data: {
        rrNumber: 'RR-202611-001',
        rrDate: daysAgo(15),
        dueDate: daysAhead(15),
        vendorInvoiceNo: 'SUP-INV-8812',
        poId: po1.id,
        contactId: vendor.id,
        warehouseId: whMain.id,
        status: 'PAID',
        vatType: 'EXCLUSIVE',
        subtotal: tax1.subtotal,
        vatRate: 7,
        vatAmount: tax1.vatAmount,
        totalAmount: tax1.totalAmount,
        netAmount: tax1.netAmount,
        journalEntryId: jvRr.id,
        items: {
          create: [
            {
              productId: pNb.id,
              description: pNb.name,
              quantity: 2,
              unitPrice: 21500,
              amount: 43000,
            },
          ],
        },
      },
    });

    await prisma.stockMovement.create({
      data: {
        productId: pNb.id,
        warehouseId: whMain.id,
        type: 'IN',
        quantity: 2,
        unitCost: 21500,
        balanceAfter: newStock,
        avgCostAfter: newAvgCost,
        referenceDocType: 'RR',
        referenceDocId: rr1.id,
        movementDate: daysAgo(15),
        notes: 'รับสินค้าตาม RR-202611-001 (Moving Avg Updated)',
      },
    });

    await prisma.taxInvoice.create({
      data: {
        taxType: 'PURCHASE_TAX',
        taxInvoiceNumber: 'SUP-INV-8812',
        taxInvoiceDate: daysAgo(15),
        taxPeriodMonth: daysAgo(15).getMonth() + 1,
        taxPeriodYear: daysAgo(15).getFullYear(),
        contactName: vendor.name,
        contactTaxId: vendor.taxId || '-',
        contactBranch: vendor.branchCode || '00000',
        subtotalAmount: tax1.subtotal,
        vatRate: 7,
        vatAmount: tax1.vatAmount,
        rrId: rr1.id,
      },
    });

    const jvPv = await prisma.journalEntry.create({
      data: {
        entryNumber: 'JV-202611-902',
        entryDate: daysAgo(10),
        journalType: 'CASH_PAYMENT',
        memo: 'จ่ายชำระหนี้ PV-202611-001',
        sourceDocumentType: 'PAYMENT_VOUCHER',
        lines: {
          create: [
            { accountId: accMap['2110'], debitAmount: tax1.totalAmount, creditAmount: 0, description: 'ล้างเจ้าหนี้ - PV-202611-001' },
            { accountId: accMap['1112'], debitAmount: 0, creditAmount: tax1.totalAmount, description: 'โอนชำระหนี้ - PV-202611-001' },
          ],
        },
      },
    });

    await prisma.paymentVoucher.create({
      data: {
        pvNumber: 'PV-202611-001',
        pvDate: daysAgo(10),
        rrId: rr1.id,
        contactId: vendor.id,
        contactName: vendor.name,
        paymentMethod: 'TRANSFER',
        amount: tax1.totalAmount,
        whtAmount: 0,
        netPaid: tax1.totalAmount,
        status: 'PAID',
        journalEntryId: jvPv.id,
        notes: 'โอนชำระค่าสินค้าตาม RR-202611-001',
      },
    });
  }

  // PO รอรับของ + RR ค้างจ่ายสำหรับตาราง AP Aging
  if (!(await prisma.purchaseOrder.findUnique({ where: { poNumber: 'PO-202611-002' } }))) {
    const taxPo2 = calculateTax({ subtotal: 5 * 6400, vatType: 'EXCLUSIVE', vatRate: 7 });
    const pPr = productMap['SKU-PR03'];
    await prisma.purchaseOrder.create({
      data: {
        poNumber: 'PO-202611-002',
        poDate: daysAgo(2),
        expectedDate: daysAhead(5),
        contactId: vendor.id,
        warehouseId: whMain.id,
        status: 'APPROVED',
        vatType: 'EXCLUSIVE',
        subtotal: taxPo2.subtotal,
        vatRate: 7,
        vatAmount: taxPo2.vatAmount,
        totalAmount: taxPo2.totalAmount,
        notes: 'สั่งเติมสต็อกเครื่องพิมพ์ที่ใกล้หมด',
        items: {
          create: [
            {
              productId: pPr.id,
              description: pPr.name,
              quantity: 5,
              unitPrice: 6400,
              amount: 32000,
            },
          ],
        },
      },
    });
  }

  if (!(await prisma.goodsReceipt.findUnique({ where: { rrNumber: 'RR-202610-001' } }))) {
    const taxRrOld = calculateTax({ subtotal: 3 * 4500, vatType: 'EXCLUSIVE', vatRate: 7 });
    await prisma.goodsReceipt.create({
      data: {
        rrNumber: 'RR-202610-001',
        rrDate: daysAgo(45),
        dueDate: daysAgo(15), // เกินกำหนด 15 วัน สำหรับ AP Aging
        vendorInvoiceNo: 'SUP-INV-7701',
        contactId: vendor.id,
        warehouseId: whMain.id,
        status: 'UNPAID',
        vatType: 'EXCLUSIVE',
        subtotal: taxRrOld.subtotal,
        vatRate: 7,
        vatAmount: taxRrOld.vatAmount,
        totalAmount: taxRrOld.totalAmount,
        netAmount: taxRrOld.netAmount,
        notes: 'บิลซื้อเชื่อครบกำหนดชำระแล้ว',
        items: {
          create: [
            {
              productId: pCh.id,
              description: pCh.name,
              quantity: 3,
              unitPrice: 4500,
              amount: 13500,
            },
          ],
        },
      },
    });
  }

  // 5. ตัวอย่างวงจรขาย (AR): QT -> SO -> IV -> RE
  if (!(await prisma.quotation.findUnique({ where: { qtNumber: 'QT-202611-001' } }))) {
    const taxQt1 = calculateTax({ subtotal: 2 * 28900 + 2 * 12500, vatType: 'EXCLUSIVE', vatRate: 7 });
    const qt1 = await prisma.quotation.create({
      data: {
        qtNumber: 'QT-202611-001',
        qtDate: daysAgo(12),
        validUntil: daysAhead(18),
        contactId: customer.id,
        status: 'ORDERED',
        vatType: 'EXCLUSIVE',
        subtotal: taxQt1.subtotal,
        vatRate: 7,
        vatAmount: taxQt1.vatAmount,
        totalAmount: taxQt1.totalAmount,
        notes: 'ชุดอุปกรณ์ทำงานสำหรับฝ่ายพัฒนาซอฟต์แวร์',
        items: {
          create: [
            { productId: pNb.id, description: pNb.name, quantity: 2, unitPrice: 28900, amount: 57800 },
            { productId: pMn.id, description: pMn.name, quantity: 2, unitPrice: 12500, amount: 25000 },
          ],
        },
      },
    });

    const so1 = await prisma.salesOrder.create({
      data: {
        soNumber: 'SO-202611-001',
        soDate: daysAgo(10),
        deliveryDate: daysAgo(8),
        qtId: qt1.id,
        contactId: customer.id,
        warehouseId: whMain.id,
        status: 'INVOICED',
        vatType: 'EXCLUSIVE',
        subtotal: taxQt1.subtotal,
        vatRate: 7,
        vatAmount: taxQt1.vatAmount,
        totalAmount: taxQt1.totalAmount,
        notes: 'ยืนยันสั่งซื้อตาม QT-202611-001',
        items: {
          create: [
            { productId: pNb.id, description: pNb.name, quantity: 2, unitPrice: 28900, amount: 57800 },
            { productId: pMn.id, description: pMn.name, quantity: 2, unitPrice: 12500, amount: 25000 },
          ],
        },
      },
    });

    const jvIv = await prisma.journalEntry.create({
      data: {
        entryNumber: 'JV-202611-903',
        entryDate: daysAgo(8),
        journalType: 'SALES',
        memo: 'ตั้งลูกหนี้ใบแจ้งหนี้ IV-202611-001',
        sourceDocumentType: 'INVOICE',
        lines: {
          create: [
            { accountId: accMap['1120'], debitAmount: taxQt1.totalAmount, creditAmount: 0, description: 'ลูกหนี้การค้า - IV-202611-001' },
            { accountId: accMap['4100'], debitAmount: 0, creditAmount: taxQt1.subtotal, description: 'รายได้จากการขาย - IV-202611-001' },
            { accountId: accMap['2120'], debitAmount: 0, creditAmount: taxQt1.vatAmount, description: 'ภาษีขาย - IV-202611-001' },
          ],
        },
      },
    });

    const iv1 = await prisma.invoice.create({
      data: {
        invoiceNumber: 'IV-202611-001',
        invoiceDate: daysAgo(8),
        dueDate: daysAhead(22),
        contactId: customer.id,
        soId: so1.id,
        warehouseId: whMain.id,
        status: 'PAID',
        vatType: 'EXCLUSIVE',
        subtotal: taxQt1.subtotal,
        vatRate: 7,
        vatAmount: taxQt1.vatAmount,
        totalAmount: taxQt1.totalAmount,
        netAmount: taxQt1.totalAmount,
        journalEntryId: jvIv.id,
        notes: 'ออกบิลขายตาม SO-202611-001',
        items: {
          create: [
            { productId: pNb.id, description: pNb.name, quantity: 2, unitPrice: 28900, amount: 57800 },
            { productId: pMn.id, description: pMn.name, quantity: 2, unitPrice: 12500, amount: 25000 },
          ],
        },
      },
    });

    await prisma.taxInvoice.create({
      data: {
        taxType: 'SALES_TAX',
        taxInvoiceNumber: 'IV-202611-001',
        taxInvoiceDate: daysAgo(8),
        taxPeriodMonth: daysAgo(8).getMonth() + 1,
        taxPeriodYear: daysAgo(8).getFullYear(),
        contactName: customer.name,
        contactTaxId: customer.taxId || '-',
        contactBranch: customer.branchCode || '00000',
        subtotalAmount: taxQt1.subtotal,
        vatRate: 7,
        vatAmount: taxQt1.vatAmount,
        invoiceId: iv1.id,
      },
    });

    const jvRc = await prisma.journalEntry.create({
      data: {
        entryNumber: 'JV-202611-904',
        entryDate: daysAgo(5),
        journalType: 'CASH_RECEIPT',
        memo: 'รับชำระหนี้ RC-202611-001',
        sourceDocumentType: 'RECEIPT',
        lines: {
          create: [
            { accountId: accMap['1112'], debitAmount: taxQt1.totalAmount, creditAmount: 0, description: 'รับโอนเงิน - RC-202611-001' },
            { accountId: accMap['1120'], debitAmount: 0, creditAmount: taxQt1.totalAmount, description: 'ล้างลูกหนี้ - RC-202611-001' },
          ],
        },
      },
    });

    await prisma.receipt.create({
      data: {
        receiptNumber: 'RC-202611-001',
        receiptDate: daysAgo(5),
        invoiceId: iv1.id,
        contactName: customer.name,
        amount: taxQt1.totalAmount,
        paymentMethod: 'TRANSFER',
        whtAmount: 0,
        journalEntryId: jvRc.id,
        notes: 'รับชำระเงินครบถ้วนตามบิล IV-202611-001',
      },
    });
  }

  // QT รออนุมัติแปลงเป็น SO & SO รอออกบิล & IV ค้างชำระสำหรับ AR Aging
  if (!(await prisma.quotation.findUnique({ where: { qtNumber: 'QT-202611-002' } }))) {
    const taxQt2 = calculateTax({ subtotal: 4 * 6900, vatType: 'EXCLUSIVE', vatRate: 7 });
    await prisma.quotation.create({
      data: {
        qtNumber: 'QT-202611-002',
        qtDate: daysAgo(1),
        validUntil: daysAhead(14),
        contactId: customer.id,
        status: 'APPROVED',
        vatType: 'EXCLUSIVE',
        subtotal: taxQt2.subtotal,
        vatRate: 7,
        vatAmount: taxQt2.vatAmount,
        totalAmount: taxQt2.totalAmount,
        notes: 'เสนอราคาเก้าอี้ Ergonomic',
        items: {
          create: [
            { productId: pCh.id, description: pCh.name, quantity: 4, unitPrice: 6900, amount: 27600 },
          ],
        },
      },
    });
  }

  if (!(await prisma.salesOrder.findUnique({ where: { soNumber: 'SO-202611-002' } }))) {
    const taxSo2 = calculateTax({ subtotal: 2 * 12500, vatType: 'EXCLUSIVE', vatRate: 7 });
    await prisma.salesOrder.create({
      data: {
        soNumber: 'SO-202611-002',
        soDate: daysAgo(2),
        deliveryDate: daysAhead(3),
        contactId: customer.id,
        warehouseId: whMain.id,
        status: 'APPROVED',
        vatType: 'EXCLUSIVE',
        subtotal: taxSo2.subtotal,
        vatRate: 7,
        vatAmount: taxSo2.vatAmount,
        totalAmount: taxSo2.totalAmount,
        notes: 'ใบสั่งขายพร้อมส่งสินค้าและออกใบแจ้งหนี้',
        items: {
          create: [
            { productId: pMn.id, description: pMn.name, quantity: 2, unitPrice: 12500, amount: 25000 },
          ],
        },
      },
    });
  }

  if (!(await prisma.invoice.findUnique({ where: { invoiceNumber: 'IV-202610-001' } }))) {
    const taxIvOld = calculateTax({ subtotal: 3 * 6900, vatType: 'EXCLUSIVE', vatRate: 7 });
    await prisma.invoice.create({
      data: {
        invoiceNumber: 'IV-202610-001',
        invoiceDate: daysAgo(40),
        dueDate: daysAgo(10), // เกินกำหนด 10 วัน สำหรับ AR Aging
        contactId: customer.id,
        warehouseId: whMain.id,
        status: 'OVERDUE',
        vatType: 'EXCLUSIVE',
        subtotal: taxIvOld.subtotal,
        vatRate: 7,
        vatAmount: taxIvOld.vatAmount,
        totalAmount: taxIvOld.totalAmount,
        netAmount: taxIvOld.totalAmount,
        notes: 'ใบแจ้งหนี้ค้างรับสำหรับติดตามทวงหนี้',
        items: {
          create: [
            { productId: pCh.id, description: pCh.name, quantity: 3, unitPrice: 6900, amount: 20700 },
          ],
        },
      },
    });
  }

  // 6. ตัวอย่างเอกสารปรับปรุงสต็อก (AJ)
  if (!(await prisma.stockAdjustment.findUnique({ where: { adjustNumber: 'AJ-202611-001' } }))) {
    const adjVal = 1 * pCh.costPrice;
    const jvAj = await prisma.journalEntry.create({
      data: {
        entryNumber: 'JV-202611-905',
        entryDate: daysAgo(4),
        journalType: 'GENERAL',
        memo: 'ปรับปรุงสต็อกสินค้า AJ-202611-001 (ตรวจนับพบสินค้าเกิน)',
        sourceDocumentType: 'STOCK_ADJUSTMENT',
        lines: {
          create: [
            { accountId: accMap['1150'], debitAmount: adjVal, creditAmount: 0, description: 'ปรับเพิ่มสินค้าคงเหลือ - AJ-202611-001' },
            { accountId: accMap['4300'], debitAmount: 0, creditAmount: adjVal, description: 'รายได้อื่นจากการตรวจนับ - AJ-202611-001' },
          ],
        },
      },
    });

    await prisma.stockAdjustment.create({
      data: {
        adjustNumber: 'AJ-202611-001',
        adjustDate: daysAgo(4),
        warehouseId: whMain.id,
        adjustType: 'IN',
        reason: 'ตรวจนับสต็อกประจำเดือนพบเก้าอี้เกินบัญชี 1 ตัว',
        status: 'APPROVED',
        totalValue: adjVal,
        journalEntryId: jvAj.id,
        items: {
          create: [
            {
              productId: pCh.id,
              quantity: 1,
              unitCost: pCh.costPrice,
              totalCost: adjVal,
              notes: 'ตรวจนับคลังหลัก',
            },
          ],
        },
      },
    });
  }

  console.log('✅ สร้างข้อมูล Express ERP ครบวงจรเรียบร้อยแล้ว!');
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างข้อมูล Express ERP:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
