import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, Product } from '../contracts';
import { buildSingleDayTally, buildDateRangeTally, DateGroupedEntry } from './tallyEngine';

/**
 * 1. Daily / Date-Range Sales Report PDF
 */
export function generateSalesReportPDF(
  orders: Order[],
  titlePeriod: string = 'Daily Sales Report',
  storeName: string = 'Katha Wholesale (కథా హోల్‌సేల్)'
): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text(storeName, 14, 18);
  doc.setFontSize(12);
  doc.text(titlePeriod, 14, 26);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

  const tableRows = orders.map((ord) => [
    ord.orderNumber,
    new Date(ord.orderDate).toLocaleDateString(),
    ord.customerName,
    ord.customerPhone,
    ord.totalOuterBags.toString(),
    ord.items.map((i) => `${i.productName} (${i.quantity})`).join(', '),
    ord.paymentMode,
    `Rs. ${ord.grandTotal.toLocaleString()}`
  ]);

  const grandTotal = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalBags = orders.reduce((sum, o) => sum + o.totalOuterBags, 0);

  autoTable(doc, {
    startY: 38,
    head: [['Order #', 'Date', 'Customer', 'Phone', 'Bags', 'Commodities', 'Payment', 'Total (Rs.)']],
    body: tableRows,
    foot: [['TOTALS', '', '', '', `${totalBags} Bags`, '', '', `Rs. ${grandTotal.toLocaleString()}`]],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74] }, // Brand Green
    footStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  doc.save(`Sales_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 2. Item-Wise Number Tally PDF (Audit Sheet: "1 + 4 + 5 + 6 = 16 Bags")
 */
export function generateNumberTallyPDF(
  orders: Order[],
  products: Product[],
  isDateRange: boolean = false,
  titlePeriod: string = 'Item-Wise Number Tally Sheet'
): void {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Katha Wholesale - Physical Loading Audit', 14, 18);
  doc.setFontSize(12);
  doc.text(titlePeriod, 14, 26);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Raw arithmetic calculation to cross-verify physical warehouse bag counts vs orders', 14, 32);

  const tableRows: string[][] = [];
  let grandTotalBags = 0;

  for (const product of products) {
    if (!isDateRange) {
      // Single day: collect all sales quantities for this product
      const quantities: number[] = [];
      orders.forEach((o) => {
        o.items.forEach((item) => {
          if (item.productId === product.id && item.unitType === 'OUTER_BAG') {
            quantities.push(item.quantity);
          }
        });
      });

      const tally = buildSingleDayTally(quantities);
      if (tally.total > 0) {
        tableRows.push([
          product.name,
          `${product.outerBagTotalKg} kg Bag`,
          tally.formula,
          `${tally.total} Bags`
        ]);
        grandTotalBags += tally.total;
      }
    } else {
      // Multi-day date range: group by date
      const dateMap = new Map<string, number[]>();
      orders.forEach((o) => {
        const d = o.orderDate.slice(0, 10);
        o.items.forEach((item) => {
          if (item.productId === product.id && item.unitType === 'OUTER_BAG') {
            if (!dateMap.has(d)) dateMap.set(d, []);
            dateMap.get(d)!.push(item.quantity);
          }
        });
      });

      const entries: DateGroupedEntry[] = Array.from(dateMap.entries()).map(([date, quantities]) => ({
        date,
        quantities
      }));

      const rangeTally = buildDateRangeTally(entries);
      if (rangeTally.periodTotal > 0) {
        tableRows.push([
          product.name,
          `${product.outerBagTotalKg} kg Bag`,
          rangeTally.periodSummaryText,
          `${rangeTally.periodTotal} Bags`
        ]);
        grandTotalBags += rangeTally.periodTotal;
      }
    }
  }

  autoTable(doc, {
    startY: 38,
    head: [['Commodity Name', 'Bag Size', 'Number Tally Breakdown (Sale Arithmetic)', 'Total Count']],
    body: tableRows.length > 0 ? tableRows : [['No sales recorded for this period', '', '', '0 Bags']],
    foot: [['TOTAL DISPATCHED BAGS', '', '', `${grandTotalBags} Bags`]],
    theme: 'grid',
    headStyles: { fillColor: [202, 138, 4] }, // Amber/Gold for Tally
    footStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  doc.save(`Number_Tally_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 3. Daily / Period Stock Position PDF
 */
export function generateStockPositionPDF(
  products: Product[],
  titlePeriod: string = 'Closing Stock Position'
): void {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Katha Wholesale - Stock Position Report', 14, 18);
  doc.setFontSize(12);
  doc.text(titlePeriod, 14, 26);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Reconciliation as of: ${new Date().toLocaleString()}`, 14, 32);

  let totalPhysicalBags = 0;
  let totalReservedBags = 0;
  let totalAvailableBags = 0;

  const tableRows = products.map((p) => {
    const available = Math.max(0, p.stockPhysicalOuter - p.stockReservedOuter);
    totalPhysicalBags += p.stockPhysicalOuter;
    totalReservedBags += p.stockReservedOuter;
    totalAvailableBags += available;

    return [
      p.name,
      p.category,
      p.brandOrMill || 'Generic',
      `${p.outerBagTotalKg} kg`,
      p.stockPhysicalOuter.toString(),
      p.stockReservedOuter.toString(),
      available.toString(),
      `${p.stockLooseInner} packets`,
      `Rs. ${p.wholesalePriceBag.toLocaleString()}`
    ];
  });

  autoTable(doc, {
    startY: 38,
    head: [['Item Name', 'Category', 'Brand/Mill', 'Bag Size', 'Physical Bags', 'Reserved Bags', 'Available Bags', 'Loose Packets', 'Rate/Bag']],
    body: tableRows,
    foot: [['TOTALS', '', '', '', `${totalPhysicalBags} Bags`, `${totalReservedBags} Bags`, `${totalAvailableBags} Bags`, '', '']],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo
    footStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  doc.save(`Stock_Position_${new Date().toISOString().slice(0, 10)}.pdf`);
}
