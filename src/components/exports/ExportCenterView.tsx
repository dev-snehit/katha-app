import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { 
  generateSalesReportPDF, 
  generateNumberTallyPDF, 
  generateStockPositionPDF 
} from '../../lib/pdfGenerator';
import { exportMasterExcelFile } from '../../lib/excelExport';
import { 
  FileSpreadsheet, 
  FileText, 
  Calculator, 
  Layers, 
  Download, 
  Calendar 
} from 'lucide-react';

export const ExportCenterView: React.FC = () => {
  const { orders, inventory, customers, suppliers, language, hasFunctionalityAccess } = useAppStore();
  const t = language === 'TE' ? te : en;

  const todayStr = new Date().toISOString().slice(0, 10);
  const [filterMode, setFilterMode] = useState<'SINGLE' | 'RANGE'>('SINGLE');
  const [singleDate, setSingleDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Filter orders based on selected date or range
  const filteredOrders = orders.filter((o) => {
    const oDate = o.orderDate.slice(0, 10);
    if (filterMode === 'SINGLE') {
      return oDate === singleDate;
    } else {
      return oDate >= startDate && oDate <= endDate;
    }
  });

  const periodLabel = filterMode === 'SINGLE'
    ? `Date: ${singleDate}`
    : `Period: ${startDate} to ${endDate}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {language === 'TE' ? 'రిపోర్టులు & ఎగుమతులు' : 'Export & Reports'}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Generate print-ready PDFs and download the locked Master Excel workbook on demand
        </p>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-brand-600" />
          <span className="text-sm font-bold text-slate-800">Date Selection:</span>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setFilterMode('SINGLE')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'SINGLE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {t.common.singleDate}
            </button>
            <button
              onClick={() => setFilterMode('RANGE')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'RANGE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {t.common.dateRange}
            </button>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="flex items-center gap-3">
          {filterMode === 'SINGLE' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Selected Day:</span>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="text-xs font-semibold border border-slate-300 rounded-lg p-2 outline-none focus:border-brand-500"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-semibold border border-slate-300 rounded-lg p-2 outline-none focus:border-brand-500"
              />
              <span className="text-xs font-medium text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-semibold border border-slate-300 rounded-lg p-2 outline-none focus:border-brand-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* PDF 1: Sales Report */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-emerald-500 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Daily / Period Sales Report
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Official sales ledger detailing invoice numbers, customer names, items, bag totals, and cash/credit split.
            </p>
            <div className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
              {filteredOrders.length} Invoices Found ({periodLabel})
            </div>
          </div>

          <div className="pt-4 mt-2">
            {hasFunctionalityAccess('reports_page', 'generate_statement') ? (
              <button
                onClick={() => generateSalesReportPDF(filteredOrders, `Sales Report - ${periodLabel}`)}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Sales PDF
              </button>
            ) : (
              <p className="text-center text-xs text-slate-400 font-semibold py-2">
                {language === 'TE' ? 'అనుమతి లేదు' : 'Access Restricted'}
              </p>
            )}
          </div>
        </div>

        {/* PDF 2: Number Tally Sheet */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-amber-500 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Item-Wise Number Tally Sheet
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Physical dispatch audit sheet showing raw additive calculations (e.g. 1 + 4 + 5 + 6 = 16 Bags) to cross-check truck loading.
            </p>
            <div className="mt-3 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md inline-block">
              Loading Audit ({periodLabel})
            </div>
          </div>

          <div className="pt-4 mt-2">
            {hasFunctionalityAccess('reports_page', 'generate_statement') ? (
              <button
                onClick={() => generateNumberTallyPDF(filteredOrders, inventory, filterMode === 'RANGE', `Item-Wise Number Tally - ${periodLabel}`)}
                className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Tally PDF
              </button>
            ) : (
              <p className="text-center text-xs text-slate-400 font-semibold py-2">
                {language === 'TE' ? 'అనుమతి లేదు' : 'Access Restricted'}
              </p>
            )}
          </div>
        </div>

        {/* PDF 3: Stock Position */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-indigo-500 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Closing Stock Position
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Inventory reconciliation report displaying physical godown bags, reserved bags, loose packets, and total net weight.
            </p>
            <div className="mt-3 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md inline-block">
              {inventory.length} Commodities
            </div>
          </div>

          <div className="pt-4 mt-2">
            {hasFunctionalityAccess('reports_page', 'generate_statement') ? (
              <button
                onClick={() => generateStockPositionPDF(inventory, `Closing Stock Position - ${periodLabel}`)}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Stock PDF
              </button>
            ) : (
              <p className="text-center text-xs text-slate-400 font-semibold py-2">
                {language === 'TE' ? 'అనుమతి లేదు' : 'Access Restricted'}
              </p>
            )}
          </div>
        </div>

        {/* Excel: Master Workbook */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-brand-600 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Master Excel Workbook (.xlsx)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Complete, bilingual spreadsheet backup containing Products, Customers, Suppliers, and Sales tabs with formula locks.
            </p>
            <div className="mt-3 text-xs font-semibold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-md inline-block">
              master_records.xlsx
            </div>
          </div>

          <div className="pt-4 mt-2">
            {hasFunctionalityAccess('reports_page', 'export_data') ? (
              <button
                onClick={() => exportMasterExcelFile(inventory, customers, suppliers, orders)}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Master Excel
              </button>
            ) : (
              <p className="text-center text-xs text-slate-400 font-semibold py-2">
                {language === 'TE' ? 'అనుమతి లేదు' : 'Access Restricted'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
