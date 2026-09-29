import { Invoice } from '../types';

export class ExportService {
  /**
   * Generates a clean CSV file download for invoices
   */
  static exportInvoicesToCSV(invoices: Invoice[], filename = 'gst_invoices_sales_register.csv'): void {
    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer GSTIN',
      'Customer Type',
      'Place of Supply',
      'Supply Type',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Cess (INR)',
      'Total Tax (INR)',
      'Round Off (INR)',
      'Grand Total (INR)',
      'Paid Amount (INR)',
      'Balance Due (INR)',
      'Status',
    ];

    const rows = invoices.map(inv => [
      `"${inv.invoiceNumber}"`,
      `"${inv.invoiceDate}"`,
      `"${inv.buyerDetails.name.replace(/"/g, '""')}"`,
      `"${inv.buyerDetails.gstin || 'Unregistered'}"`,
      `"${inv.buyerDetails.customerType}"`,
      `"${inv.placeOfSupply}"`,
      `"${inv.supplyType}"`,
      inv.totals.taxableValue.toFixed(2),
      inv.totals.cgstTotal.toFixed(2),
      inv.totals.sgstTotal.toFixed(2),
      inv.totals.igstTotal.toFixed(2),
      inv.totals.cessTotal.toFixed(2),
      inv.totals.totalTax.toFixed(2),
      inv.totals.roundOff.toFixed(2),
      inv.totals.grandTotal.toFixed(2),
      inv.paidAmount.toFixed(2),
      inv.balanceDue.toFixed(2),
      `"${inv.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  /**
   * Generates GSTR-1 preparation summary (B2B vs B2C summary)
   */
  static exportGstSummaryToCSV(invoices: Invoice[], filename = 'gst_summary_report.csv'): void {
    const activeInvoices = invoices.filter(i => i.status !== 'CANCELLED' && i.status !== 'DRAFT');

    const b2bInvoices = activeInvoices.filter(i => i.buyerDetails.customerType === 'B2B_REGISTERED');
    const b2cInvoices = activeInvoices.filter(i => i.buyerDetails.customerType !== 'B2B_REGISTERED');

    const b2bTaxable = b2bInvoices.reduce((s, i) => s + i.totals.taxableValue, 0);
    const b2bCgst = b2bInvoices.reduce((s, i) => s + i.totals.cgstTotal, 0);
    const b2bSgst = b2bInvoices.reduce((s, i) => s + i.totals.sgstTotal, 0);
    const b2bIgst = b2bInvoices.reduce((s, i) => s + i.totals.igstTotal, 0);
    const b2bTotal = b2bInvoices.reduce((s, i) => s + i.totals.grandTotal, 0);

    const b2cTaxable = b2cInvoices.reduce((s, i) => s + i.totals.taxableValue, 0);
    const b2cCgst = b2cInvoices.reduce((s, i) => s + i.totals.cgstTotal, 0);
    const b2cSgst = b2cInvoices.reduce((s, i) => s + i.totals.sgstTotal, 0);
    const b2cIgst = b2cInvoices.reduce((s, i) => s + i.totals.igstTotal, 0);
    const b2cTotal = b2cInvoices.reduce((s, i) => s + i.totals.grandTotal, 0);

    const lines = [
      'GST SUMMARY REPORT (For Accountant & CA Consultation)',
      'Designed to assist with GST billing and record management',
      '',
      'Category,Invoice Count,Taxable Value (INR),CGST (INR),SGST (INR),IGST (INR),Total Tax (INR),Grand Total (INR)',
      `"B2B Registered",${b2bInvoices.length},${b2bTaxable.toFixed(2)},${b2bCgst.toFixed(2)},${b2bSgst.toFixed(2)},${b2bIgst.toFixed(2)},${(b2bCgst + b2bSgst + b2bIgst).toFixed(2)},${b2bTotal.toFixed(2)}`,
      `"B2C / Consumer",${b2cInvoices.length},${b2cTaxable.toFixed(2)},${b2cCgst.toFixed(2)},${b2cSgst.toFixed(2)},${b2cIgst.toFixed(2)},${(b2cCgst + b2cSgst + b2cIgst).toFixed(2)},${b2cTotal.toFixed(2)}`,
      `"TOTAL",${activeInvoices.length},${(b2bTaxable + b2cTaxable).toFixed(2)},${(b2bCgst + b2cCgst).toFixed(2)},${(b2bSgst + b2cSgst).toFixed(2)},${(b2bIgst + b2cIgst).toFixed(2)},${(b2bCgst + b2bSgst + b2bIgst + b2cCgst + b2cSgst + b2cIgst).toFixed(2)},${(b2bTotal + b2cTotal).toFixed(2)}`,
    ];

    this.downloadFile(lines.join('\r\n'), filename, 'text/csv;charset=utf-8;');
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
