import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  IndianRupee,
  Receipt
} from 'lucide-react';
import { Invoice, Payment, PaymentMethod, Language } from '../types';
import { TRANSLATIONS } from '../locales/translations';

interface PaymentsViewProps {
  invoices: Invoice[];
  currentLang: Language;
  onRecordPayment: (payment: Payment) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  invoices,
  currentLang,
  onRecordPayment,
}) => {
  const t = TRANSLATIONS[currentLang];

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Extract all recorded payments across all invoices
  const allPayments: Array<{ payment: Payment; invoiceNumber: string; customerName: string }> = [];
  invoices.forEach(inv => {
    inv.payments.forEach(p => {
      allPayments.push({
        payment: p,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.buyerDetails.name,
      });
    });
  });

  // Sort latest first
  allPayments.sort((a, b) => new Date(b.payment.createdAt).getTime() - new Date(a.payment.createdAt).getTime());

  // Invoices eligible for payment (issued or partially paid, with balance due)
  const eligibleInvoices = invoices.filter(inv => 
    (inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID') && inv.balanceDue > 0
  );

  const openPaymentModal = (invoiceId?: string) => {
    const target = eligibleInvoices.find(i => i.id === invoiceId) || eligibleInvoices[0];
    if (!target) {
      alert('No outstanding invoices available to record payment against.');
      return;
    }
    setSelectedInvoiceId(target.id);
    setAmount(target.balanceDue);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('UPI');
    setReferenceNumber('');
    setNotes('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoices.find(i => i.id === selectedInvoiceId);
    if (!inv) return;

    if (amount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    if (amount > inv.balanceDue) {
      if (!confirm(`Amount ₹${amount} exceeds balance due ₹${inv.balanceDue}. Do you want to continue?`)) {
        return;
      }
    }

    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      invoiceId: inv.id,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim(),
      notes: notes.trim(),
      recordedBy: 'user_owner_01',
      createdAt: new Date().toISOString(),
    };

    onRecordPayment(newPayment);
    setModalOpen(false);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Payment Receipts & Collections
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log and reconcile cash, UPI, and bank transfers against issued GST invoices
          </p>
        </div>

        <button
          onClick={() => openPaymentModal()}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Collected</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {formatINR(allPayments.reduce((sum, p) => sum + p.payment.amount, 0))}
          </div>
          <span className="text-[11px] text-slate-400">{allPayments.length} transactions recorded</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Pending Invoices</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {eligibleInvoices.length}
          </div>
          <span className="text-[11px] text-slate-400">Awaiting full customer settlement</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Outstanding</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatINR(eligibleInvoices.reduce((sum, i) => sum + i.balanceDue, 0))}
          </div>
          <span className="text-[11px] text-slate-400">Receivable across all buyers</span>
        </div>
      </div>

      {/* Payments History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-sm">Receipt Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Invoice No.</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Reference / Txn ID</th>
                <th className="py-3 px-3 text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                allPayments.map(p => (
                  <tr key={p.payment.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {p.payment.paymentDate}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {p.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {p.customerName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                        {p.payment.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {p.payment.referenceNumber || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      ₹{p.payment.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-xs sm:p-4">
          <div className="mobile-dialog w-full max-w-md space-y-4 rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>Record Customer Payment</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Outstanding Invoice <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={e => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = eligibleInvoices.find(i => i.id === e.target.value);
                    if (inv) setAmount(inv.balanceDue);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white font-medium"
                >
                  {eligibleInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.buyerDetails.name} (Due: ₹{inv.balanceDue})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount Received (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm, BHIM)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="CASH">Cash Payment</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference / Transaction / UTR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref: 312489123891"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Internal Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  Confirm & Update Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
