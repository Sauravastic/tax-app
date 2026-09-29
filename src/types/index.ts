export type Language = 'en' | 'hi';

export type BusinessType = 
  | 'Proprietorship'
  | 'Partnership'
  | 'LLP'
  | 'Private Limited'
  | 'Public Limited'
  | 'HUF'
  | 'Trust'
  | 'Society'
  | 'Other';

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountHolderName: string;
}

export interface BusinessProfile {
  id: string;
  businessName: string;
  legalName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  businessType: BusinessType;
  businessCategory: string[];
  address: string;
  city: string;
  district: string;
  state: string;
  stateCode: string;
  pinCode: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  bankDetails: BankDetails;
  upiId: string;
  invoicePrefix: string;
  startingInvoiceNumber: number;
  nextInvoiceNumber?: number;
  financialYear: string;
  termsAndConditions: string[];
  updatedAt?: string;
}

export type CustomerType = 'B2B_REGISTERED' | 'B2C_UNREGISTERED' | 'CONSUMER';

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  businessName?: string;
  customerType: CustomerType;
  gstin?: string;
  pan?: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pinCode: string;
  phone: string;
  email?: string;
  creditLimit?: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export type UnitType = 
  | 'PCS'
  | 'BOX'
  | 'KGS'
  | 'GMS'
  | 'LTR'
  | 'MTR'
  | 'SET'
  | 'PAIR'
  | 'DOZ'
  | 'HRS'
  | 'DAYS'
  | 'NOS'
  | 'OTHER';

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  sku?: string;
  hsnCode: string;
  unit: UnitType;
  mrp: number;
  sellingPrice: number;
  gstRate: number; // e.g., 0, 5, 12, 18, 28
  cessRate?: number; // e.g., 0, 12%
  currentStock?: number;
  lowStockAlert?: number;
  stockQuantity?: number;
  minStockAlert?: number;
  stock?: number;
  minStock?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockAdjustmentType = 
  | 'STOCK_IN_PURCHASE'
  | 'STOCK_IN_RETURN'
  | 'STOCK_IN_ADJUSTMENT'
  | 'STOCK_OUT_DAMAGE'
  | 'STOCK_OUT_EXPIRED'
  | 'STOCK_OUT_CONSUMPTION'
  | 'STOCK_OUT_LOSS'
  | 'STOCK_OUT_AUDIT'
  | 'STOCK_DELETE_ALL';

export interface InventoryLog {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  sku?: string;
  adjustmentType: StockAdjustmentType;
  quantityChange: number; // positive for addition, negative for deduction
  previousStock: number;
  newStock: number;
  unit: UnitType;
  reason: string;
  notes?: string;
  recordedBy: string;
  timestamp: string;
}

export type InvoiceStatus = 
  | 'DRAFT'
  | 'VALIDATED'
  | 'ISSUED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'UNPAID'
  | 'CANCELLED';

export type SupplyType = 'INTRA_STATE' | 'INTER_STATE';

export interface InvoiceItem {
  id: string;
  productId?: string;
  productName: string;
  description?: string;
  hsnCode: string;
  quantity: number;
  unit: UnitType;
  mrp: number;
  rate: number; // Selling price per unit
  discountAmount: number; // Line flat discount
  discountPercent: number; // Line percentage discount
  taxableValue: number; // After discount
  gstRate: number; // e.g. 18
  cgstRate: number; // e.g. 9
  cgstAmount: number;
  sgstRate: number; // e.g. 9
  sgstAmount: number;
  igstRate: number; // e.g. 18
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface TaxBreakdown {
  gstRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
}

export interface InvoiceTotals {
  itemCount: number;
  totalQuantity: number;
  grossAmount: number; // sum of (rate * qty)
  totalDiscount: number;
  taxableValue: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  taxBreakdowns: TaxBreakdown[];
}

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'CHEQUE' | 'OTHER';

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  businessId?: string;
  amount: number;
  paymentDate: string;
  paymentMode?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export type Payment = PaymentRecord;

export interface Invoice {
  id: string;
  businessId: string;
  isQuickBill?: boolean;
  invoiceNumber: string;
  financialYear: string;
  invoiceDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  language: Language;
  template: 'modern' | 'minimal' | 'traditional';
  
  // Place of Supply & Tax Treatment
  sellerState: string;
  sellerStateCode: string;
  buyerState: string;
  buyerStateCode: string;
  placeOfSupply: string; // State name & code
  supplyType: SupplyType;
  isReverseCharge: boolean;

  // Parties
  sellerDetails: BusinessProfile;
  buyerDetails: {
    customerId?: string;
    name: string;
    businessName?: string;
    gstin?: string;
    pan?: string;
    address: string;
    city: string;
    state: string;
    stateCode: string;
    pinCode: string;
    phone: string;
    email?: string;
    customerType: CustomerType;
  };

  // Line items & totals
  items: InvoiceItem[];
  totals: InvoiceTotals;

  // Payments & balances
  paidAmount: number;
  balanceDue: number;
  payments: PaymentRecord[];

  // Legal & Meta
  amountInWordsEn: string;
  amountInWordsHi: string;
  taxRuleVersion: string;
  notes?: string;
  terms: string[];
  issuedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  field: string;
  messageEn: string;
  messageHi: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface AuditLog {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  action: string;
  recordType: 'INVOICE' | 'CUSTOMER' | 'PRODUCT' | 'PAYMENT' | 'BUSINESS' | 'INVENTORY';
  recordId: string;
  recordIdentifier: string;
  details: string;
  timestamp: string;
  entityType?: string;
  entityId?: string;
  performedBy?: string;
}

export interface GSTState {
  code: string;
  name: string;
  tin: string;
}

export interface TaxRule {
  version: string;
  effectiveFrom: string;
  rates: number[];
  standardHsnCategories: {
    category: string;
    hsn: string;
    description: string;
    defaultGstRate: number;
  }[];
}
