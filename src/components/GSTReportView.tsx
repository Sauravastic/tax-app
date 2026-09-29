import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  FileSpreadsheet, 
  Building2, 
  Users, 
  Receipt,
  Info,
  Sparkles
} from 'lucide-react';
import { Invoice, Language } from '../types';
import { TRANSLATIONS } from '../locales/translations';
import { ExportService } from '../services/exportService';

interface GSTReportViewProps {
  invoices: Invoice[];
  currentLang: Language;
}

export const GSTReportView: React.FC<GSTReportViewProps> = ({
  invoices,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang];

  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // YYYY-MM
  );

  // Filter non-cancelled invoices for the period
  const periodInvoices = invoices.filter(
    i => i.status !== 'CANCELLED' && i.invoiceDate.startsWith(selectedMonth)
  );
  const gstInvoices = periodInvoices.filter(invoice => !invoice.isQuickBill);
  const quickBillInvoices = periodInvoices.filter(invoice => invoice.isQuickBill);

  // Aggregations
  let grossTurnover = 0;
  let taxableValue = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let cessTotal = 0;
  let totalTax = 0;

  let b2bTaxable = 0;
  let b2bTax = 0;
  let b2bCount = 0;

  let b2cTaxable = 0;
  let b2cTax = 0;
  let b2cCount = 0;

  // Rate slabs map
  const rateBreakdowns: Record<number, { taxable: number; cgst: number; sgst: number; igst: number; cess: number; totalTax: number }> = {};

  gstInvoices.forEach(inv => {
    grossTurnover += inv.totals.grandTotal;
    taxableValue += inv.totals.taxableValue;
    cgstTotal += inv.totals.cgstTotal;
    sgstTotal += inv.totals.sgstTotal;
    igstTotal += inv.totals.igstTotal;
    cessTotal += inv.totals.cessTotal;
    totalTax += inv.totals.totalTax;

    const isB2B = inv.buyerDetails.customerType === 'B2B_REGISTERED' || !!inv.buyerDetails.gstin;
    if (isB2B) {
      b2bCount += 1;
      b2bTaxable += inv.totals.taxableValue;
      b2bTax += inv.totals.totalTax;
    } else {
      b2cCount += 1;
      b2cTaxable += inv.totals.taxableValue;
      b2cTax += inv.totals.totalTax;
    }

    // Accumulate rate breakdown
    inv.totals.taxBreakdowns.forEach(tb => {
      if (!rateBreakdowns[tb.gstRate]) {
        rateBreakdowns[tb.gstRate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, totalTax: 0 };
      }
      rateBreakdowns[tb.gstRate].taxable += tb.taxableValue;
      rateBreakdowns[tb.gstRate].cgst += tb.cgstAmount;
      rateBreakdowns[tb.gstRate].sgst += tb.sgstAmount;
      rateBreakdowns[tb.gstRate].igst += tb.igstAmount;
      rateBreakdowns[tb.gstRate].cess += tb.cessAmount;
      rateBreakdowns[tb.gstRate].totalTax += tb.totalTax;
    });
  });

  const quickBillTurnover = quickBillInvoices.reduce(
    (sum, invoice) => sum + invoice.totals.grandTotal,
    0,
  );

  const sortedRates = Object.keys(rateBreakdowns)
    .map(Number)
    .sort((a, b) => a - b);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            GST & CA Compliance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-computed tax schedules ready for GSTR-1, GSTR-3B preparation & audit reconciliation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden"
            />
          </div>

          <button
            onClick={() => ExportService.exportGstSummaryToCSV(gstInvoices, selectedMonth)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CA Report</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Gross Sales Turnover</span>
          <div className="text-2xl font-black text-slate-900 mt-2">{formatINR(grossTurnover)}</div>
          <span className="text-[11px] text-slate-400">{gstInvoices.length} GST invoices issued in {selectedMonth}</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Taxable Turnover</span>
          <div className="text-2xl font-black text-blue-700 mt-2">{formatINR(taxableValue)}</div>
          <span className="text-[11px] text-slate-400">Base value excluding GST</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total GST Collected</span>
          <div className="text-2xl font-black text-purple-700 mt-2">{formatINR(totalTax)}</div>
          <span className="text-[11px] text-slate-400">Tax liability payable to Govt</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Tax Breakdown</span>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>CGST + SGST:</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(cgstTotal + sgstTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>IGST (Inter-State):</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(igstTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick bills are intentionally excluded from GST turnover and tax liability. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-800 uppercase">Quick Bill Turnover</span>
          <div className="text-2xl font-black text-amber-900 mt-2">{formatINR(quickBillTurnover)}</div>
          <span className="text-[11px] text-amber-700">{quickBillInvoices.length} non-GST counter bills in {selectedMonth}</span>
        </div>
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs flex items-center">
          <p className="text-xs text-slate-600">
            Quick bills are recorded separately as product-price-only sales and are excluded from taxable turnover, GST collected, and rate-wise GST liability.
          </p>
        </div>
      </div>

      {/* B2B vs B2C Segmentation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* B2B (Table 4 of GSTR-1) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">B2B Registered Supplies (Table 4)</h3>
                <span className="text-[11px] text-slate-400">Sales to GST Registered Entities</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
              {b2bCount} Invoices
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">Taxable Amount</span>
              <span className="text-base font-bold text-slate-900">{formatINR(b2bTaxable)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Tax Amount</span>
              <span className="text-base font-bold text-blue-700">{formatINR(b2bTax)}</span>
            </div>
          </div>
        </div>

        {/* B2C (Table 5 & 7 of GSTR-1) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">B2C Retail / Consumer Supplies</h3>
                <span className="text-[11px] text-slate-400">Sales to Unregistered Persons & Consumers</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
              {b2cCount} Invoices
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">Taxable Amount</span>
              <span className="text-base font-bold text-slate-900">{formatINR(b2cTaxable)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Tax Amount</span>
              <span className="text-base font-bold text-emerald-700">{formatINR(b2cTax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rate-Wise Tax Liability Schedule Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Rate-Wise GST Liability Schedule ({selectedMonth})
            </h3>
          </div>
          <span className="text-xs text-slate-500">Matches GSTR-3B Table 3.1</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">GST Slab Rate</th>
                <th className="py-3 px-3 text-right">Taxable Value (₹)</th>
                <th className="py-3 px-3 text-right">CGST (₹)</th>
                <th className="py-3 px-3 text-right">SGST (₹)</th>
                <th className="py-3 px-3 text-right">IGST (₹)</th>
                <th className="py-3 px-3 text-right">Cess (₹)</th>
                <th className="py-3 px-3 text-right">Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {sortedRates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No sales recorded for month {selectedMonth}.
                  </td>
                </tr>
              ) : (
                sortedRates.map(rate => {
                  const b = rateBreakdowns[rate];
                  return (
                    <tr key={rate} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-bold text-slate-900 font-sans">
                        {rate}% Slab
                      </td>
                      <td className="py-3 px-3 text-right text-slate-800">
                        ₹{b.taxable.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        ₹{b.cgst.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        ₹{b.sgst.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        ₹{b.igst.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        ₹{b.cess.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ₹{b.totalTax.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedRates.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 font-mono">
                <tr>
                  <td className="py-3 px-3 font-sans">Total</td>
                  <td className="py-3 px-3 text-right">₹{taxableValue.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">₹{cgstTotal.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">₹{sgstTotal.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">₹{igstTotal.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">₹{cessTotal.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-purple-800">₹{totalTax.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
