import { Language } from '../types';

export interface Translations {
  appName: string;
  tagline: string;
  dashboard: string;
  invoices: string;
  createInvoice: string;
  quickBill: string;
  customers: string;
  products: string;
  reports: string;
  settings: string;
  auditTrail: string;
  assistant: string;
  
  // Dashboard cards
  todaySales: string;
  monthlySales: string;
  gstCollected: string;
  outstandingPayments: string;
  totalInvoices: string;
  paidInvoices: string;
  pendingInvoices: string;
  overdueInvoices: string;
  recentInvoices: string;
  topProducts: string;

  // Invoice Fields
  taxInvoiceHeading: string;
  originalForRecipient: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  sellerDetails: string;
  buyerDetails: string;
  gstin: string;
  pan: string;
  placeOfSupply: string;
  supplyType: string;
  intraState: string;
  interState: string;
  reverseCharge: string;
  no: string;
  yes: string;

  // Items table
  itemSNo: string;
  productDescription: string;
  hsnSac: string;
  qty: string;
  unit: string;
  rate: string;
  discount: string;
  taxableValue: string;
  gstRate: string;
  cgst: string;
  sgst: string;
  igst: string;
  cess: string;
  total: string;
  roundOff: string;
  grandTotal: string;
  amountInWords: string;

  // Bank & Footer
  bankDetails: string;
  accountHolder: string;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  branch: string;
  upiPayment: string;
  termsConditions: string;
  authorizedSignatory: string;
  forBusiness: string;

  // Actions
  edit: string;
  validate: string;
  issueInvoice: string;
  downloadPdf: string;
  printInvoice: string;
  shareInvoice: string;
  recordPayment: string;
  cancelInvoice: string;
  search: string;
  status: string;
  paid: string;
  partiallyPaid: string;
  unpaid: string;
  draft: string;
  cancelled: string;
  disclaimer: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    appName: 'GST SmartBill',
    tagline: 'Smart GST Billing. Simple Business Management.',
    dashboard: 'Dashboard',
    invoices: 'Invoices',
    createInvoice: 'Create Invoice',
    quickBill: 'Quick Bill',
    customers: 'Customers',
    products: 'Products & Inventory',
    reports: 'GST Reports',
    settings: 'Business Profile',
    auditTrail: 'Audit Log',
    assistant: 'Smart Assistant',

    todaySales: "Today's Sales",
    monthlySales: 'This Month Sales',
    gstCollected: 'GST Collected',
    outstandingPayments: 'Outstanding Balance',
    totalInvoices: 'Total Invoices',
    paidInvoices: 'Paid Invoices',
    pendingInvoices: 'Pending Invoices',
    overdueInvoices: 'Overdue Invoices',
    recentInvoices: 'Recent Invoices',
    topProducts: 'Top Selling Products',

    taxInvoiceHeading: 'TAX INVOICE',
    originalForRecipient: 'Original for Recipient',
    invoiceNumber: 'Invoice No.',
    invoiceDate: 'Invoice Date',
    dueDate: 'Due Date',
    sellerDetails: 'Seller (Billed By)',
    buyerDetails: 'Buyer / Consignee (Billed To)',
    gstin: 'GSTIN',
    pan: 'PAN',
    placeOfSupply: 'Place of Supply',
    supplyType: 'Supply Type',
    intraState: 'Intra-State Supply (CGST + SGST)',
    interState: 'Inter-State Supply (IGST)',
    reverseCharge: 'Reverse Charge Applicable',
    no: 'No',
    yes: 'Yes',

    itemSNo: '#',
    productDescription: 'Description of Goods / Services',
    hsnSac: 'HSN / SAC',
    qty: 'Qty',
    unit: 'Unit',
    rate: 'Rate (₹)',
    discount: 'Disc.',
    taxableValue: 'Taxable Value',
    gstRate: 'GST %',
    cgst: 'CGST',
    sgst: 'SGST',
    igst: 'IGST',
    cess: 'Cess',
    total: 'Total Amount',
    roundOff: 'Round Off',
    grandTotal: 'Grand Total',
    amountInWords: 'Amount in Words',

    bankDetails: 'Bank Account & Payment Details',
    accountHolder: 'Account Name',
    bankName: 'Bank Name',
    accountNo: 'A/C Number',
    ifscCode: 'IFSC Code',
    branch: 'Branch',
    upiPayment: 'Scan & Pay via any UPI App',
    termsConditions: 'Terms & Conditions',
    authorizedSignatory: 'Authorized Signatory',
    forBusiness: 'For',

    edit: 'Edit',
    validate: 'Validate',
    issueInvoice: 'Issue Invoice',
    downloadPdf: 'Print / Save PDF',
    printInvoice: 'Print Invoice',
    shareInvoice: 'Share via WhatsApp',
    recordPayment: 'Record Payment',
    cancelInvoice: 'Cancel Invoice',
    search: 'Search invoices, customers, products...',
    status: 'Status',
    paid: 'Paid',
    partiallyPaid: 'Partially Paid',
    unpaid: 'Unpaid',
    draft: 'Draft',
    cancelled: 'Cancelled',
    disclaimer: 'Designed to assist with GST billing and record management. Verify tax treatment before filing official returns.',
  },
  hi: {
    appName: 'जीएसटी स्मार्टबिल',
    tagline: 'सरल एवं सटीक भारतीय जीएसटी बिलिंग समाधान',
    dashboard: 'डैशबोर्ड',
    invoices: 'बीजक (Invoices)',
    createInvoice: 'नया बिल बनाएं',
    quickBill: 'त्वरित बिल (Quick Bill)',
    customers: 'ग्राहक (Customers)',
    products: 'उत्पाद एवं इन्वेंट्री (Products & Inventory)',
    reports: 'जीएसटी रिपोर्ट',
    settings: 'व्यवसाय विवरण',
    auditTrail: 'ऑडिट लॉग',
    assistant: 'स्मार्ट सहायक',

    todaySales: 'आज की कुल बिक्री',
    monthlySales: 'इस माह की बिक्री',
    gstCollected: 'एकत्रित जीएसटी',
    outstandingPayments: 'बकाया राशि',
    totalInvoices: 'कुल बीजक',
    paidInvoices: 'भुगतान किए बीजक',
    pendingInvoices: 'लंबित बीजक',
    overdueInvoices: 'अतिदेय बीजक',
    recentInvoices: 'हालिया बीजक',
    topProducts: 'प्रमुख उत्पाद',

    taxInvoiceHeading: 'कर बीजक (TAX INVOICE)',
    originalForRecipient: 'मूल प्रति (प्राप्तकर्ता हेतु)',
    invoiceNumber: 'बीजक संख्या (Invoice No.)',
    invoiceDate: 'बीजक तिथि',
    dueDate: 'अंतिम तिथि',
    sellerDetails: 'विक्रेता का विवरण',
    buyerDetails: 'क्रेता / ग्राहक का विवरण',
    gstin: 'जीएसटी पहचान संख्या (GSTIN)',
    pan: 'पैन (PAN)',
    placeOfSupply: 'आपूर्ति का स्थान',
    supplyType: 'आपूर्ति का प्रकार',
    intraState: 'अंतःराज्यीय आपूर्ति (CGST + SGST)',
    interState: 'अंतर्राज्यीय आपूर्ति (IGST)',
    reverseCharge: 'रिवर्स चार्ज लागू',
    no: 'नहीं',
    yes: 'हाँ',

    itemSNo: 'क्र.',
    productDescription: 'वस्तु या सेवा का विवरण',
    hsnSac: 'एचएसएन / सैक (HSN)',
    qty: 'मात्रा',
    unit: 'इकाई',
    rate: 'दर (₹)',
    discount: 'छूट',
    taxableValue: 'कर योग्य मूल्य',
    gstRate: 'जीएसटी दर',
    cgst: 'केंद्रीय कर (CGST)',
    sgst: 'राज्य कर (SGST)',
    igst: 'एकीकृत कर (IGST)',
    cess: 'उपकर (Cess)',
    total: 'कुल राशि',
    roundOff: 'राउंड ऑफ',
    grandTotal: 'कुल देय राशि',
    amountInWords: 'शब्दों में कुल राशि',

    bankDetails: 'बैंक खाता व भुगतान विवरण',
    accountHolder: 'खाताधारक का नाम',
    bankName: 'बैंक का नाम',
    accountNo: 'खाता संख्या',
    ifscCode: 'आईएफएससी (IFSC) कोड',
    branch: 'शाखा',
    upiPayment: 'किसी भी यूपीआई ऐप से स्कैन करें और भुगतान करें',
    termsConditions: 'नियम एवं शर्तें',
    authorizedSignatory: 'अधिकृत हस्ताक्षरकर्ता',
    forBusiness: 'हस्ताक्षरकर्ता हेतु',

    edit: 'संपादित करें',
    validate: 'सत्यापित करें',
    issueInvoice: 'बीजक जारी करें',
    downloadPdf: 'प्रिंट / पीडीएफ सेव करें',
    printInvoice: 'प्रिंट करें',
    shareInvoice: 'व्हाट्सएप साझा करें',
    recordPayment: 'भुगतान दर्ज करें',
    cancelInvoice: 'बीजक रद्द करें',
    search: 'बीजक, ग्राहक या वस्तु खोजें...',
    status: 'स्थिति',
    paid: 'भुगतान प्राप्त',
    partiallyPaid: 'आंशिक भुगतान',
    unpaid: 'बकाया',
    draft: 'ड्राफ्ट',
    cancelled: 'रद्द',
    disclaimer: 'यह सॉफ्टवेयर जीएसटी बिलिंग और रिकॉर्ड प्रबंधन में सहायता के लिए बनाया गया है। सरकारी रिटर्न से पूर्व सत्यापन करें।',
  },
};
