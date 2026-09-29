import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  Share2, 
  CheckCircle2, 
  X, 
  QrCode, 
  CreditCard, 
  Globe, 
  Building2, 
  AlertCircle,
  FileCheck,
  Ban
} from 'lucide-react';
import { Invoice, Language } from '../types';
import { TRANSLATIONS } from '../locales/translations';
import { numberToWordsIndianEn, numberToWordsIndianHi } from '../services/numberToWords';

interface InvoicePreviewModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onIssueInvoice?: (invoiceId: string) => void;
  onRecordPayment?: (invoice: Invoice) => void;
  onCancelInvoice?: (invoiceId: string, reason: string) => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onIssueInvoice,
  onRecordPayment,
  onCancelInvoice,
}) => {
  const [currentLang, setCurrentLang] = useState<Language>(invoice.language || 'en');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!isOpen) return null;

  const t = TRANSLATIONS[currentLang];
  const isIssued = invoice.status === 'ISSUED' || invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID';
  const isCancelled = invoice.status === 'CANCELLED';

  const amountInWords = currentLang === 'hi' 
    ? (invoice.amountInWordsHi || numberToWordsIndianHi(invoice.totals.grandTotal))
    : (invoice.amountInWordsEn || numberToWordsIndianEn(invoice.totals.grandTotal));

  // Dynamic UPI Payment Link URI for India
  const upiUri = `upi://pay?pa=${encodeURIComponent(invoice.sellerDetails.upiId || 'sharma@sbi')}&pn=${encodeURIComponent(invoice.sellerDetails.tradeName || invoice.sellerDetails.businessName)}&am=${invoice.balanceDue > 0 ? invoice.balanceDue : invoice.totals.grandTotal}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoice.invoiceNumber}`)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `Invoice from ${invoice.sellerDetails.businessName}%0AInvoice No: ${invoice.invoiceNumber}%0ADate: ${invoice.invoiceDate}%0ATotal Amount: ₹${invoice.totals.grandTotal}%0ABalance Due: ₹${invoice.balanceDue}%0APay via UPI: ${invoice.sellerDetails.upiId}`;
    const url = `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  };

  const handleIssueConfirm = () => {
    if (onIssueInvoice) {
      onIssueInvoice(invoice.id);
    }
  };

  const handleCancelSubmit = () => {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason for audit compliance.');
      return;
    }
    if (onCancelInvoice) {
      onCancelInvoice(invoice.id, cancelReason);
      setCancelModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white">
      {/* Modal Card */}
      <div className="mobile-dialog flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Action Bar (Hidden on Print) */}
        <div className="p-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-emerald-400">
              {invoice.invoiceNumber}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              invoice.status === 'PAID'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : invoice.status === 'ISSUED'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : invoice.status === 'CANCELLED'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {invoice.status}
            </span>
            {isCancelled && (
              <span className="text-xs text-red-400">
                Reason: {invoice.cancelReason}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Toggle in Modal */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => setCurrentLang('en')}
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  currentLang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setCurrentLang('hi')}
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  currentLang === 'hi' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* If Draft, provide Issue Invoice button */}
            {!isIssued && !isCancelled && onIssueInvoice && (
              <button
                onClick={handleIssueConfirm}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Issue Invoice</span>
              </button>
            )}

            {/* Payment Recording */}
            {isIssued && invoice.balanceDue > 0 && onRecordPayment && (
              <button
                onClick={() => onRecordPayment(invoice)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}

            {/* Print / Save as PDF */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs rounded-lg transition flex items-center space-x-1"
              title="Print to Paper or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg transition flex items-center space-x-1"
              title="Share via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Cancel invoice workflow */}
            {isIssued && !isCancelled && onCancelInvoice && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="px-2.5 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg text-xs font-semibold transition"
                title="Cancel Invoice (Audit Compliant)"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Return to the invoice list without printing or sharing */}
            <button
              onClick={onClose}
              className="inline-flex items-center space-x-1 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              title="Return to invoices"
            >
              <span>Back</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="inline-flex items-center space-x-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Close invoice preview"
            >
              <X className="w-5 h-5" />
              <span className="text-xs sm:hidden">Close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          <div 
            id="printable-invoice"
            className="mx-auto w-full max-w-[780px] bg-white p-4 text-xs leading-normal text-slate-900 shadow-md relative sm:p-8 print:shadow-none print:border-none print:rounded-none"
          >
            {/* Cancelled Watermark if applicable */}
            {isCancelled && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-15 select-none">
                <span className="text-8xl font-black tracking-widest text-red-600 -rotate-30">
                  CANCELLED
                </span>
              </div>
            )}

            {/* 1. Invoice heading and copy marker */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {invoice.isQuickBill ? 'QUICK BILL' : t.taxInvoiceHeading}
                  </h1>
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    {invoice.isQuickBill ? 'Retail receipt • No GST' : t.originalForRecipient}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">
                    {t.invoiceNumber}
                  </span>
                  <span className="text-sm font-black font-mono text-slate-900">
                    {invoice.invoiceNumber}
                  </span>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    <strong>{t.invoiceDate}:</strong> {invoice.invoiceDate}
                  </div>
                  {invoice.dueDate && (
                    <div className="text-[10px] text-slate-500">
                      <strong>{t.dueDate}:</strong> {invoice.dueDate}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Seller & Buyer Columns */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-4 mb-4">
              {/* Seller */}
              <div className="border-r border-slate-200 pr-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.sellerDetails}
                </span>
                <div className="text-sm font-black text-slate-900">
                  {invoice.sellerDetails.tradeName || invoice.sellerDetails.businessName}
                </div>
                {invoice.sellerDetails.legalName && invoice.sellerDetails.legalName !== invoice.sellerDetails.tradeName && (
                  <div className="text-[11px] text-slate-600">({invoice.sellerDetails.legalName})</div>
                )}
                <div className="text-[11px] text-slate-700 leading-tight">
                  {invoice.sellerDetails.address}, {invoice.sellerDetails.city} - {invoice.sellerDetails.pinCode}
                </div>
                <div className="text-[11px]">
                  <strong>State:</strong> {invoice.sellerDetails.state} (Code: {invoice.sellerDetails.stateCode})
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-900">
                  <strong>{t.gstin}:</strong> {invoice.sellerDetails.gstin}
                </div>
                <div className="text-[10px] font-mono text-slate-600">
                  <strong>{t.pan}:</strong> {invoice.sellerDetails.pan} • Tel: {invoice.sellerDetails.phone}
                </div>
              </div>

              {/* Buyer */}
              <div className="pl-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.buyerDetails}
                </span>
                <div className="text-sm font-black text-slate-900">
                  {invoice.buyerDetails.name}
                </div>
                {invoice.buyerDetails.businessName && (
                  <div className="text-[11px] font-semibold text-slate-700">
                    {invoice.buyerDetails.businessName}
                  </div>
                )}
                <div className="text-[11px] text-slate-700 leading-tight">
                  {invoice.buyerDetails.address || 'Counter Sale'}, {invoice.buyerDetails.city} {invoice.buyerDetails.pinCode ? `- ${invoice.buyerDetails.pinCode}` : ''}
                </div>
                <div className="text-[11px]">
                  <strong>State:</strong> {invoice.buyerDetails.state} (Code: {invoice.buyerDetails.stateCode})
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-900">
                  <strong>{t.gstin}:</strong> {invoice.buyerDetails.gstin || 'Unregistered / Consumer'}
                </div>
                <div className="text-[10px] text-slate-600">
                  <strong>{t.placeOfSupply}:</strong> {invoice.placeOfSupply}
                </div>
                <div className="text-[10px] text-slate-600">
                  <strong>{t.reverseCharge}:</strong> {invoice.isReverseCharge ? t.yes : t.no}
                </div>
              </div>
            </div>

            {/* 3. Items Table */}
            <div className="border border-slate-300 rounded-md overflow-hidden mb-4">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[9px] tracking-wider">
                  <tr>
                    <th className="py-2 px-2 text-center w-6">{t.itemSNo}</th>
                    <th className="py-2 px-2">{t.productDescription}</th>
                    <th className="py-2 px-2 text-center w-14">{t.hsnSac}</th>
                    <th className="py-2 px-2 text-right w-12">{t.qty}</th>
                    <th className="py-2 px-2 text-center w-12">{t.unit}</th>
                    <th className="py-2 px-2 text-right w-16">{t.rate}</th>
                    {!invoice.isQuickBill && <th className="py-2 px-2 text-right w-14">{t.discount}</th>}
                    <th className="py-2 px-2 text-right w-20">{t.taxableValue}</th>
                    {!invoice.isQuickBill && <th className="py-2 px-2 text-center w-12">{t.gstRate}</th>}
                    {!invoice.isQuickBill && <th className="py-2 px-2 text-right w-20">
                      {invoice.supplyType === 'INTRA_STATE' ? 'CGST+SGST' : 'IGST'}
                    </th>}
                    <th className="py-2 px-2 text-right w-24">{t.total}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items.map((item, i) => (
                    <tr key={item.id || i} className="align-top">
                      <td className="py-2 px-2 text-center text-slate-500 font-medium">{i + 1}</td>
                      <td className="py-2 px-2">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        {item.description && (
                          <div className="text-[10px] text-slate-500 leading-tight">{item.description}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[10px]">{item.hsnCode || '-'}</td>
                      <td className="py-2 px-2 text-right font-semibold">{item.quantity}</td>
                      <td className="py-2 px-2 text-center text-slate-600">{item.unit}</td>
                      <td className="py-2 px-2 text-right font-mono">₹{item.rate.toFixed(2)}</td>
                      {!invoice.isQuickBill && <td className="py-2 px-2 text-right font-mono text-slate-600">
                        {item.discountAmount > 0 ? `₹${item.discountAmount.toFixed(2)}` : '-'}
                      </td>}
                      <td className="py-2 px-2 text-right font-mono font-semibold text-slate-900">
                        ₹{item.taxableValue.toFixed(2)}
                      </td>
                      {!invoice.isQuickBill && <td className="py-2 px-2 text-center font-semibold">{item.gstRate}%</td>}
                      {!invoice.isQuickBill && <td className="py-2 px-2 text-right font-mono text-slate-800">
                        ₹{item.totalTax.toFixed(2)}
                      </td>}
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                        ₹{item.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Tax Breakdown Table & Grand Total Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Rate-wise GST Breakdown */}
              {!invoice.isQuickBill ? <div className="border border-slate-200 rounded p-2.5 bg-slate-50/70 text-[10px]">
                <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1.5 border-b border-slate-200 pb-1">
                  Tax Schedule Summary (Rate-wise)
                </span>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 font-semibold border-b border-slate-200">
                      <th>GST Rate</th>
                      <th className="text-right">Taxable</th>
                      {invoice.supplyType === 'INTRA_STATE' ? (
                        <>
                          <th className="text-right">CGST</th>
                          <th className="text-right">SGST</th>
                        </>
                      ) : (
                        <th className="text-right">IGST</th>
                      )}
                      <th className="text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {invoice.totals.taxBreakdowns.map((tb, idx) => (
                      <tr key={idx}>
                        <td className="py-1 font-bold">{tb.gstRate}%</td>
                        <td className="py-1 text-right">₹{tb.taxableValue.toFixed(2)}</td>
                        {invoice.supplyType === 'INTRA_STATE' ? (
                          <>
                            <td className="py-1 text-right">₹{tb.cgstAmount.toFixed(2)}</td>
                            <td className="py-1 text-right">₹{tb.sgstAmount.toFixed(2)}</td>
                          </>
                        ) : (
                          <td className="py-1 text-right">₹{tb.igstAmount.toFixed(2)}</td>
                        )}
                        <td className="py-1 text-right font-bold">₹{tb.totalTax.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div> : <div className="border border-amber-200 rounded p-3 bg-amber-50/70 text-[10px] flex items-center">
                <span className="font-semibold text-amber-900">Quick bill: product prices only. No GST or extra charges applied.</span>
              </div>}

              {/* Totals Summary */}
              <div className="border border-slate-200 rounded p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-700">
                  <span>{t.taxableValue}:</span>
                  <span className="font-mono font-semibold">₹{invoice.totals.taxableValue.toFixed(2)}</span>
                </div>

                {!invoice.isQuickBill && (invoice.supplyType === 'INTRA_STATE' ? (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <span>{t.cgst} Total:</span>
                      <span className="font-mono">₹{invoice.totals.cgstTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>{t.sgst} Total:</span>
                      <span className="font-mono">₹{invoice.totals.sgstTotal.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-700">
                    <span>{t.igst} Total:</span>
                    <span className="font-mono">₹{invoice.totals.igstTotal.toFixed(2)}</span>
                  </div>
                ))}

                {!invoice.isQuickBill && invoice.totals.cessTotal > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>{t.cess} Total:</span>
                    <span className="font-mono">₹{invoice.totals.cessTotal.toFixed(2)}</span>
                  </div>
                )}

                {!invoice.isQuickBill && <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>{t.roundOff}:</span>
                  <span className="font-mono">{invoice.totals.roundOff >= 0 ? `+₹${invoice.totals.roundOff.toFixed(2)}` : `-₹${Math.abs(invoice.totals.roundOff).toFixed(2)}`}</span>
                </div>}

                <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between font-black text-sm text-slate-900">
                  <span>{t.grandTotal}:</span>
                  <span className="font-mono text-base">₹{invoice.totals.grandTotal.toLocaleString('en-IN')}</span>
                </div>

                {isIssued && (
                  <div className="border-t border-slate-200 pt-1 text-[10px] flex justify-between font-bold">
                    <span className="text-emerald-700">Amount Received: ₹{invoice.paidAmount.toLocaleString('en-IN')}</span>
                    <span className={invoice.balanceDue > 0 ? 'text-amber-700' : 'text-slate-500'}>
                      Balance Due: ₹{invoice.balanceDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Amount in Words */}
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5 mb-4 text-[11px]">
              <span className="font-bold text-slate-700">{t.amountInWords}: </span>
              <span className="font-semibold text-slate-900 italic">{amountInWords}</span>
            </div>

            {/* 6. Bank Details, UPI QR & Signatory */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-300 pt-4">
              {/* Bank Details */}
              <div className="space-y-1 text-[10px]">
                <span className="font-bold text-slate-800 uppercase tracking-wider block">
                  {t.bankDetails}
                </span>
                <div><strong>{t.bankName}:</strong> {invoice.sellerDetails.bankDetails.bankName}</div>
                <div><strong>{t.accountHolder}:</strong> {invoice.sellerDetails.bankDetails.accountHolderName}</div>
                <div className="font-mono"><strong>{t.accountNo}:</strong> {invoice.sellerDetails.bankDetails.accountNumber}</div>
                <div className="font-mono"><strong>{t.ifscCode}:</strong> {invoice.sellerDetails.bankDetails.ifscCode}</div>
                <div><strong>{t.branch}:</strong> {invoice.sellerDetails.bankDetails.branchName}</div>
              </div>

              {/* UPI QR Code Block */}
              <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded border border-slate-200 text-center">
                {/* Visual SVG QR representation */}
                <div className="w-20 h-20 bg-white border border-slate-300 p-1 rounded flex items-center justify-center shadow-2xs">
                  <QrCode className="w-16 h-16 text-slate-900" />
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">{t.upiPayment}</span>
                <span className="text-[8px] font-mono text-emerald-700 break-all">{invoice.sellerDetails.upiId}</span>
              </div>

              {/* Authorized Signatory */}
              <div className="flex flex-col justify-between text-right text-[10px]">
                <div>
                  <span className="text-slate-500 font-medium">{t.forBusiness}</span>
                  <div className="font-black text-slate-900">{invoice.sellerDetails.tradeName || invoice.sellerDetails.businessName}</div>
                </div>

                <div className="pt-8">
                  <div className="border-t border-slate-400 w-36 ml-auto pt-1 font-bold text-slate-800">
                    {t.authorizedSignatory}
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Terms & Conditions */}
            {invoice.terms && invoice.terms.length > 0 && (
              <div className="border-t border-slate-200 mt-4 pt-2 text-[9px] text-slate-500 leading-tight">
                <span className="font-bold text-slate-600 block">{t.termsConditions}:</span>
                <ul className="list-decimal pl-3 space-y-0.5 mt-0.5">
                  {invoice.terms.map((term, idx) => (
                    <li key={idx}>{term}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Cancel Issued Invoice ({invoice.invoiceNumber})</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Once issued, GST Tax Invoices cannot be silently modified or deleted. Cancelling this invoice will permanently record a cancellation audit log.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Order cancelled by buyer / incorrect quantity entered"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleCancelSubmit}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
