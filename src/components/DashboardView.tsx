import React from 'react';
import { 
  TrendingUp, 
  IndianRupee, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Plus, 
  Zap, 
  FileText, 
  Users, 
  Package, 
  Printer, 
  CreditCard,
  Building2,
  Calendar
} from 'lucide-react';
import { Invoice, Language, Customer, Product } from '../types';
import { TRANSLATIONS } from '../locales/translations';

interface DashboardViewProps {
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  currentLang: Language;
  onNewInvoice: () => void;
  onQuickBill: () => void;
  onAddCustomer: () => void;
  onAddProduct: () => void;
  onViewInvoices: () => void;
  onViewReports: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices,
  customers,
  products,
  currentLang,
  onNewInvoice,
  onQuickBill,
  onAddCustomer,
  onAddProduct,
  onViewInvoices,
  onViewReports,
  onSelectInvoice,
  onRecordPayment,
}) => {
  const t = TRANSLATIONS[currentLang];

  // Computations
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  const validInvoices = invoices.filter(i => i.status !== 'CANCELLED');

  const todaySales = validInvoices
    .filter(i => i.invoiceDate === todayStr)
    .reduce((sum, i) => sum + i.totals.grandTotal, 0);

  const monthSales = validInvoices
    .filter(i => i.invoiceDate.startsWith(currentMonthStr))
    .reduce((sum, i) => sum + i.totals.grandTotal, 0);

  const totalGstCollected = validInvoices.reduce((sum, i) => sum + i.totals.totalTax, 0);
  const totalOutstanding = validInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

  const totalInvoicesCount = invoices.length;
  const paidCount = invoices.filter(i => i.status === 'PAID').length;
  const pendingCount = invoices.filter(i => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID').length;
  const draftCount = invoices.filter(i => i.status === 'DRAFT').length;

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Bar */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-700/60 text-emerald-200 mb-2 border border-emerald-600/50">
              <Building2 className="w-3 h-3" />
              <span>FY 2026-27 Active</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t.appName}
            </h1>
            <p className="text-sm text-emerald-100/90 mt-0.5 max-w-xl">
              {t.tagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onQuickBill}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold shadow-sm transition active:scale-95"
            >
              <Zap className="w-4 h-4 text-slate-950" />
              <span>{t.quickBill} (30s)</span>
            </button>
            <button
              onClick={onNewInvoice}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 text-xs sm:text-sm font-bold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>{t.createInvoice}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.todaySales}</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{formatINR(todaySales)}</span>
            <p className="text-xs text-slate-400 mt-1">Live recorded today</p>
          </div>
        </div>

        {/* This Month's Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.monthlySales}</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{formatINR(monthSales)}</span>
            <p className="text-xs text-slate-400 mt-1">Current billing cycle</p>
          </div>
        </div>

        {/* GST Collected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.gstCollected}</span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-purple-700">{formatINR(totalGstCollected)}</span>
            <p className="text-xs text-slate-400 mt-1">CGST + SGST + IGST liability</p>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.outstandingPayments}</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-600">{formatINR(totalOutstanding)}</span>
            <p className="text-xs text-slate-400 mt-1">Pending customer collections</p>
          </div>
        </div>
      </div>

      {/* Invoice Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">{t.totalInvoices}</div>
            <div className="text-lg font-bold text-slate-900">{totalInvoicesCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">{t.paidInvoices}</div>
            <div className="text-lg font-bold text-emerald-700">{paidCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">{t.pendingInvoices}</div>
            <div className="text-lg font-bold text-amber-600">{pendingCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Drafts</div>
            <div className="text-lg font-bold text-slate-700">{draftCount}</div>
          </div>
        </div>
      </div>

      {/* Recent Invoices & Top Products Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">{t.recentInvoices}</h2>
            <button
              onClick={onViewInvoices}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider">
                  <th className="py-2 font-medium">Invoice No.</th>
                  <th className="py-2 font-medium">Customer</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                  <th className="py-2 font-medium text-center">Status</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 text-slate-700 font-medium truncate max-w-[140px]">
                      {inv.buyerDetails.name}
                      {inv.buyerDetails.gstin && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {inv.buyerDetails.gstin}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-500 whitespace-nowrap">{inv.invoiceDate}</td>
                    <td className="py-3 text-right font-bold text-slate-900">
                      {formatINR(inv.totals.grandTotal)}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'PARTIALLY_PAID'
                          ? 'bg-amber-100 text-amber-800'
                          : inv.status === 'ISSUED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="px-2 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium transition"
                        title="View / Print Tax Invoice"
                      >
                        View
                      </button>
                      {inv.balanceDue > 0 && inv.status !== 'CANCELLED' && (
                        <button
                          onClick={() => onRecordPayment(inv)}
                          className="px-2 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded font-medium transition"
                          title="Record Payment"
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Master Data & Top Products (1 col) */}
        <div className="space-y-4">
          {/* Quick Actions Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Navigation</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onAddCustomer}
                className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition text-left"
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800">+ Customer</span>
              </button>
              <button
                onClick={onAddProduct}
                className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition text-left"
              >
                <Package className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">+ Product</span>
              </button>
              <button
                onClick={onViewReports}
                className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition text-left col-span-2"
              >
                <FileText className="w-4 h-4 text-purple-600" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">GST Summary & CA Report</span>
                  <span className="text-slate-400 text-[10px]">Export to Excel/CSV for filing</span>
                </div>
              </button>
            </div>
          </div>

          {/* Top Catalog Products */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">{t.topProducts}</h3>
            <div className="space-y-2.5">
              {products.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                  <div className="truncate max-w-[180px]">
                    <div className="font-semibold text-slate-800 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400">HSN: {p.hsnCode} • GST: {p.gstRate}%</div>
                  </div>
                  <div className="font-bold text-slate-900">{formatINR(p.sellingPrice)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Statutory Disclaimer as mandated by Constraint 6 & Section 90 */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 text-center leading-relaxed">
        <p className="font-medium text-slate-700 mb-0.5">Statutory Disclosure & Accuracy Commitment</p>
        <p className="text-[11px] text-slate-500">
          {t.disclaimer} GST rates and HSN classifications are powered by verified CBIC schedules. Always verify applicable tax classifications with your Chartered Accountant.
        </p>
      </div>
    </div>
  );
};
