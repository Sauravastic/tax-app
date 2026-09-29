import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Printer, 
  CreditCard, 
  Plus, 
  Calendar,
  AlertCircle,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { Invoice, Language, InvoiceStatus } from '../types';
import { TRANSLATIONS } from '../locales/translations';
import { ExportService } from '../services/exportService';

interface InvoiceHistoryViewProps {
  invoices: Invoice[];
  currentLang: Language;
  onSelectInvoice: (invoice: Invoice) => void;
  onNewInvoice: () => void;
  onRecordPayment: (invoice: Invoice) => void;
}

export const InvoiceHistoryView: React.FC<InvoiceHistoryViewProps> = ({
  invoices,
  currentLang,
  onSelectInvoice,
  onNewInvoice,
  onRecordPayment,
}) => {
  const t = TRANSLATIONS[currentLang];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filter logic
  const filtered = invoices.filter(inv => {
    // Search
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.buyerDetails.name.toLowerCase().includes(q) ||
      (inv.buyerDetails.gstin && inv.buyerDetails.gstin.toLowerCase().includes(q)) ||
      inv.totals.grandTotal.toString().includes(q);

    // Status
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;

    // Date range
    let matchesDate = true;
    if (dateFrom && inv.invoiceDate < dateFrom) matchesDate = false;
    if (dateTo && inv.invoiceDate > dateTo) matchesDate = false;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleExportCSV = () => {
    ExportService.exportInvoicesToCSV(filtered);
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-5">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {t.invoices} ({filtered.length})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sequential sales ledger with tamper-evident audit history
          </p>
        </div>

        <div className="mobile-stack-actions flex w-full items-center space-x-2 sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            title="Export to CSV for Accountant"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onNewInvoice}
            className="inline-flex items-center justify-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createInvoice}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search text */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice no, customer, GSTIN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="ISSUED">Issued</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Date from */}
          <div className="flex items-center space-x-1">
            <span className="text-[11px] text-slate-500 whitespace-nowrap">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
            />
          </div>

          {/* Date to */}
          <div className="flex items-center space-x-1">
            <span className="text-[11px] text-slate-500 whitespace-nowrap">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Invoice No.</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer Details</th>
                <th className="py-3 px-3">Place of Supply</th>
                <th className="py-3 px-3 text-right">Taxable (₹)</th>
                <th className="py-3 px-3 text-right">Tax (₹)</th>
                <th className="py-3 px-3 text-right">Grand Total (₹)</th>
                <th className="py-3 px-3 text-right">Balance Due (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-bold text-slate-900 font-mono">
                      {inv.invoiceNumber}
                      {inv.isQuickBill && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-sans font-bold text-amber-800">
                          QUICK BILL
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {inv.invoiceDate}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{inv.buyerDetails.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {inv.buyerDetails.gstin || 'Consumer'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {inv.placeOfSupply}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      ₹{inv.totals.taxableValue.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      ₹{inv.totals.totalTax.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{inv.totals.grandTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                      {inv.balanceDue > 0 ? `₹${inv.balanceDue.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'PARTIALLY_PAID'
                          ? 'bg-amber-100 text-amber-800'
                          : inv.status === 'ISSUED'
                          ? 'bg-blue-100 text-blue-800'
                          : inv.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        title="View / Print Tax Invoice"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {inv.status !== 'CANCELLED' && inv.balanceDue > 0 && (
                        <button
                          onClick={() => onRecordPayment(inv)}
                          className="p-1.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                          title="Record Payment"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
