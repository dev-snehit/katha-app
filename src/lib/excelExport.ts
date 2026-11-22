import ExcelJS from 'exceljs';
import { Product, Customer, Supplier, Order } from '../contracts';

/**
 * Generates and downloads the locked Master Excel spreadsheet (master_records.xlsx)
 * in browser memory using exceljs.
 */
export async function exportMasterExcelFile(
  products: Product[],
  customers: Customer[],
  suppliers: Supplier[],
  orders: Order[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Katha Wholesale Platform';
  workbook.lastModifiedBy = 'Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Tab 1: Master_Products
  const productSheet = workbook.addWorksheet('Master_Products');
  productSheet.columns = [
    { header: 'Product ID', key: 'id', width: 20 },
    { header: 'Commodity Name (EN)', key: 'name', width: 30 },
    { header: 'Commodity Name (TE)', key: 'nameTe', width: 30 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Brand / Mill (EN)', key: 'brandOrMill', width: 20 },
    { header: 'Brand / Mill (TE)', key: 'brandOrMillTe', width: 20 },
    { header: 'Inner Bag (kg)', key: 'innerBagWeightKg', width: 14 },
    { header: 'Inner Bags Count', key: 'innerBagsPerOuter', width: 16 },
    { header: 'Outer Bag (kg)', key: 'outerBagTotalKg', width: 14 },
    { header: 'Physical Bags (Godown)', key: 'stockPhysicalOuter', width: 22 },
    { header: 'Reserved Bags (Orders)', key: 'stockReservedOuter', width: 22 },
    { header: 'Loose Packets', key: 'stockLooseInner', width: 16 },
    { header: 'Cost Price / Bag (Rs.)', key: 'costPricePerBag', width: 20 },
    { header: 'Wholesale Price / Bag (Rs.)', key: 'wholesalePriceBag', width: 24 },
    { header: 'Retail Price / Bag (Rs.)', key: 'retailPriceBag', width: 24 },
  ];

  products.forEach((p) => {
    productSheet.addRow({
      id: p.id,
      name: p.name,
      nameTe: p.nameTe || '',
      category: p.category,
      brandOrMill: p.brandOrMill || '',
      brandOrMillTe: p.brandOrMillTe || '',
      innerBagWeightKg: p.innerBagWeightKg,
      innerBagsPerOuter: p.innerBagsPerOuter,
      outerBagTotalKg: p.outerBagTotalKg,
      stockPhysicalOuter: p.stockPhysicalOuter,
      stockReservedOuter: p.stockReservedOuter,
      stockLooseInner: p.stockLooseInner,
      costPricePerBag: p.costPricePerBag,
      wholesalePriceBag: p.wholesalePriceBag,
      retailPriceBag: p.retailPriceBag || p.wholesalePriceBag || 0,
    });
  });

  // Tab 2: Master_Customers
  const customerSheet = workbook.addWorksheet('Master_Customers');
  customerSheet.columns = [
    { header: 'Customer ID', key: 'id', width: 20 },
    { header: 'Customer Name (EN)', key: 'name', width: 30 },
    { header: 'Customer Name (TE)', key: 'nameTe', width: 30 },
    { header: 'Mobile Number', key: 'phone', width: 18 },
    { header: 'Business / Shop Name (EN)', key: 'businessName', width: 30 },
    { header: 'Business / Shop Name (TE)', key: 'businessNameTe', width: 30 },
    { header: 'Address (EN)', key: 'address', width: 35 },
    { header: 'Address (TE)', key: 'addressTe', width: 35 },
    { header: 'Current Due (Rs.)', key: 'currentDue', width: 18 },
  ];

  customers.forEach((c) => {
    customerSheet.addRow({
      id: c.id,
      name: c.name,
      nameTe: c.nameTe || '',
      phone: c.phone,
      businessName: c.businessName || '',
      businessNameTe: c.businessNameTe || '',
      address: c.address || '',
      addressTe: c.addressTe || '',
      currentDue: c.currentDue,
    });
  });

  // Tab 3: Master_Suppliers
  const supplierSheet = workbook.addWorksheet('Master_Suppliers');
  supplierSheet.columns = [
    { header: 'Supplier ID', key: 'id', width: 20 },
    { header: 'Business Name (EN)', key: 'businessName', width: 30 },
    { header: 'Business Name (TE)', key: 'businessNameTe', width: 30 },
    { header: 'Owner Name (EN)', key: 'ownerName', width: 25 },
    { header: 'Owner Name (TE)', key: 'ownerNameTe', width: 25 },
    { header: 'Bank Name', key: 'bankName', width: 25 },
    { header: 'Account Number', key: 'accountNumber', width: 20 },
    { header: 'IFSC Code', key: 'ifscCode', width: 16 },
    { header: 'Reference Nickname (EN)', key: 'nickname', width: 25 },
    { header: 'Reference Nickname (TE)', key: 'nicknameTe', width: 25 },
  ];

  suppliers.forEach((s) => {
    supplierSheet.addRow({
      id: s.id,
      businessName: s.businessName,
      businessNameTe: s.businessNameTe || '',
      ownerName: s.ownerName || '',
      ownerNameTe: s.ownerNameTe || '',
      bankName: s.bankName,
      accountNumber: s.accountNumber,
      ifscCode: s.ifscCode,
      nickname: s.nickname,
      nicknameTe: s.nicknameTe || '',
    });
  });

  // Tab 4: Master_Orders_Sales
  const orderSheet = workbook.addWorksheet('Master_Orders_Sales');
  orderSheet.columns = [
    { header: 'Order ID', key: 'id', width: 20 },
    { header: 'Order Number', key: 'orderNumber', width: 18 },
    { header: 'Date', key: 'orderDate', width: 22 },
    { header: 'Customer Name', key: 'customerName', width: 30 },
    { header: 'Customer Phone', key: 'customerPhone', width: 18 },
    { header: 'Total Bags', key: 'totalOuterBags', width: 14 },
    { header: 'Total Weight (kg)', key: 'totalWeightKg', width: 18 },
    { header: 'Discount (Rs.)', key: 'discount', width: 16 },
    { header: 'Grand Total (Rs.)', key: 'grandTotal', width: 18 },
    { header: 'Payment Mode', key: 'paymentMode', width: 16 },
    { header: 'Order Status', key: 'status', width: 18 },
    { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
    { header: 'Driver Phone', key: 'driverPhone', width: 18 },
    { header: 'Submitted By', key: 'submittedByRole', width: 16 },
  ];

  orders.forEach((o) => {
    orderSheet.addRow({
      id: o.id,
      orderNumber: o.orderNumber,
      orderDate: o.orderDate,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      totalOuterBags: o.totalOuterBags,
      totalWeightKg: o.totalWeightKg,
      discount: o.discount || 0,
      grandTotal: o.grandTotal,
      paymentMode: o.paymentMode,
      status: o.status,
      vehicleNumber: o.vehicleNumber || '',
      driverPhone: o.driverPhone || '',
      submittedByRole: o.submittedByRole,
    });
  });

  // Style Header Rows & Apply Protection
  [productSheet, customerSheet, supplierSheet, orderSheet].forEach((sheet) => {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF15803D' }, // Brand Green
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Export buffer to user's browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `master_records_${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
