import { 
  BusinessProfile, 
  Customer, 
  Product, 
  Invoice, 
  PaymentRecord, 
  AuditLog, 
  InvoiceStatus,
  Language,
  InventoryLog,
  StockAdjustmentType 
} from '../types';
import { CURRENT_TAX_RULE_VERSION } from './taxRuleDatabase';
import { numberToWordsIndianEn, numberToWordsIndianHi } from './numberToWords';
import { calculateInvoiceTotals } from './gstEngine';

const STORAGE_KEYS = {
  USER: 'gst_smartbill_user',
  PROFILE: 'gst_smartbill_profile',
  CUSTOMERS: 'gst_smartbill_customers',
  PRODUCTS: 'gst_smartbill_products',
  INVOICES: 'gst_smartbill_invoices',
  PAYMENTS: 'gst_smartbill_payments',
  AUDIT_LOGS: 'gst_smartbill_audit_logs',
  INVENTORY_LOGS: 'gst_smartbill_inventory_logs',
  LANG: 'gst_smartbill_language',
};

const API_BASE = '/api';

function syncCustomerToDatabase(customer: Customer): void {
  void fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  })
    .then(response => {
      if (!response.ok) throw new Error(`Customer save failed (${response.status})`);
      return response.json() as Promise<Customer>;
    })
    .then(savedCustomer => {
      const customers = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]') as Customer[];
      const index = customers.findIndex(item => item.id === customer.id);
      if (index >= 0) {
        customers[index] = { ...customers[index], ...savedCustomer };
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      }
    })
    .catch(error => console.error('Customer database sync failed', error));
}

function deleteCustomerFromDatabase(id: string): void {
  void fetch(`${API_BASE}/customers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(error => console.error('Customer database delete failed', error));
}

function syncInvoiceToDatabase(invoice: Invoice): void {
  void fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  }).catch(error => console.error('Invoice database sync failed', error));
}

function syncPaymentToDatabase(payment: PaymentRecord): void {
  void fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  }).catch(error => console.error('Payment database sync failed', error));
}

function syncProductToDatabase(product: Product): void {
  void fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  }).catch(error => console.error('Product database sync failed', error));
}

function deleteProductFromDatabase(id: string): void {
  void fetch(`${API_BASE}/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(error => console.error('Product database delete failed', error));
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Manager' | 'Cashier' | 'Accountant';
  businessId: string;
  token?: string;
}

const DEMO_LOGIN = {
  email: 'owner@smartbill.local',
  password: 'admin123',
};

const DEFAULT_PROFILE: BusinessProfile = {
  id: 'biz_default_01',
  businessName: 'Sharma Electricals & Hardware',
  legalName: 'Sharma Trading Enterprises LLP',
  tradeName: 'Sharma Electricals',
  gstin: '07AAAAA0000A1Z5',
  pan: 'AAAAA0000A',
  businessType: 'Partnership',
  businessCategory: ['Hardware & Electricals', 'Retail & Wholesale'],
  address: 'Shop No. 14, Main Market, Chandni Chowk',
  city: 'New Delhi',
  district: 'Central Delhi',
  state: 'Delhi',
  stateCode: '07',
  pinCode: '110006',
  phone: '+91 98765 43210',
  email: 'contact@sharmaelectricals.in',
  website: 'https://sharmaelectricals.in',
  bankDetails: {
    bankName: 'State Bank of India',
    accountNumber: '34891029384',
    ifscCode: 'SBIN0000691',
    branchName: 'Chandni Chowk Main Branch',
    accountHolderName: 'Sharma Trading Enterprises LLP',
  },
  upiId: 'sharmaelectricals@sbi',
  invoicePrefix: 'INV-2026',
  startingInvoiceNumber: 1,
  financialYear: '2026-27',
  termsAndConditions: [
    'Goods once sold will not be taken back without valid invoice within 7 days.',
    'Interest @ 18% p.a. will be charged on all unpaid bills overdue beyond 30 days.',
    'Subject to Delhi jurisdiction only.',
  ],
};

const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust_01',
    businessId: 'biz_default_01',
    name: 'Rajesh Verma',
    businessName: 'Verma Constructions & Interiors',
    customerType: 'B2B_REGISTERED',
    gstin: '07AABCV1234F1Z8',
    pan: 'AABCV1234F',
    address: 'Plot 42, Okhla Industrial Area Phase-III',
    city: 'New Delhi',
    state: 'Delhi',
    stateCode: '07',
    pinCode: '110020',
    phone: '+91 98111 22334',
    email: 'rajesh@vermaconstructions.com',
    creditLimit: 200000,
    totalInvoiced: 145000,
    totalPaid: 95000,
    outstandingBalance: 50000,
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-10T10:00:00Z',
    isActive: true,
  },
  {
    id: 'cust_02',
    businessId: 'biz_default_01',
    name: 'Gupta Traders',
    businessName: 'Gupta Hardware Mart',
    customerType: 'B2B_REGISTERED',
    gstin: '06AABCG9876E1Z1',
    pan: 'AABCG9876E',
    address: 'Railway Road, Sector 14',
    city: 'Gurugram',
    state: 'Haryana',
    stateCode: '06',
    pinCode: '122001',
    phone: '+91 99990 88877',
    email: 'contact@guptahardware.in',
    creditLimit: 300000,
    totalInvoiced: 78500,
    totalPaid: 78500,
    outstandingBalance: 0,
    createdAt: '2026-04-12T11:30:00Z',
    updatedAt: '2026-04-12T11:30:00Z',
    isActive: true,
  },
  {
    id: 'cust_03',
    businessId: 'biz_default_01',
    name: 'Amit Kumar',
    businessName: '',
    customerType: 'CONSUMER',
    address: 'B-12, Lajpat Nagar-II',
    city: 'New Delhi',
    state: 'Delhi',
    stateCode: '07',
    pinCode: '110024',
    phone: '+91 98712 34567',
    totalInvoiced: 6490,
    totalPaid: 6490,
    outstandingBalance: 0,
    createdAt: '2026-04-15T15:20:00Z',
    updatedAt: '2026-04-15T15:20:00Z',
    isActive: true,
  },
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod_01',
    businessId: 'biz_default_01',
    name: 'Havells Submersible Cable 4.0 sq mm',
    description: '3 Core Flat copper cable for water pumps & industrial motors',
    sku: 'HVL-CBL-4MM',
    hsnCode: '8544',
    unit: 'MTR',
    mrp: 180,
    sellingPrice: 150,
    gstRate: 18,
    currentStock: 450,
    lowStockAlert: 100,
    isActive: true,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z',
  },
  {
    id: 'prod_02',
    businessId: 'biz_default_01',
    name: 'Schneider Electric MCB 32A C-Curve',
    description: 'Miniature Circuit Breaker Single Pole 10kA breaking capacity',
    sku: 'SCH-MCB-32A',
    hsnCode: '8536',
    unit: 'PCS',
    mrp: 360,
    sellingPrice: 290,
    gstRate: 18,
    currentStock: 120,
    lowStockAlert: 25,
    isActive: true,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z',
  },
  {
    id: 'prod_03',
    businessId: 'biz_default_01',
    name: 'Philips LED Downlight 15W Cool Daylight',
    description: 'Round recessed ceiling LED panel 6500K bright white',
    sku: 'PHL-LED-15W',
    hsnCode: '9405',
    unit: 'PCS',
    mrp: 650,
    sellingPrice: 480,
    gstRate: 12,
    currentStock: 85,
    lowStockAlert: 20,
    isActive: true,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z',
  },
  {
    id: 'prod_04',
    businessId: 'biz_default_01',
    name: 'Anchor Roma Modular Switch 10A 1-Way',
    description: 'Premium white glossy flame-retardant polycarbonate switch',
    sku: 'ANC-SW-10A',
    hsnCode: '8536',
    unit: 'BOX',
    mrp: 850,
    sellingPrice: 720,
    gstRate: 18,
    currentStock: 60,
    lowStockAlert: 15,
    isActive: true,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z',
  },
  {
    id: 'prod_05',
    businessId: 'biz_default_01',
    name: 'Crompton 1.0 HP Monoblock Water Pump',
    description: 'High suction centrifugal pump with copper rotor',
    sku: 'CMP-PUMP-1HP',
    hsnCode: '8413',
    unit: 'PCS',
    mrp: 6200,
    sellingPrice: 5100,
    gstRate: 18,
    currentStock: 18,
    lowStockAlert: 5,
    isActive: true,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z',
  },
];

const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv_01',
    businessId: 'biz_default_01',
    invoiceNumber: 'INV-2026-0001',
    financialYear: '2026-27',
    invoiceDate: '2026-04-14',
    status: 'PAID',
    language: 'en',
    template: 'modern',
    sellerState: 'Delhi',
    sellerStateCode: '07',
    buyerState: 'Delhi',
    buyerStateCode: '07',
    placeOfSupply: 'Delhi (07)',
    supplyType: 'INTRA_STATE',
    isReverseCharge: false,
    sellerDetails: DEFAULT_PROFILE,
    buyerDetails: {
      customerId: 'cust_01',
      name: 'Rajesh Verma',
      businessName: 'Verma Constructions & Interiors',
      gstin: '07AABCV1234F1Z8',
      pan: 'AABCV1234F',
      address: 'Plot 42, Okhla Industrial Area Phase-III',
      city: 'New Delhi',
      state: 'Delhi',
      stateCode: '07',
      pinCode: '110020',
      phone: '+91 98111 22334',
      email: 'rajesh@vermaconstructions.com',
      customerType: 'B2B_REGISTERED',
    },
    items: [
      {
        id: 'item_1',
        productId: 'prod_01',
        productName: 'Havells Submersible Cable 4.0 sq mm',
        description: '3 Core Flat copper cable',
        hsnCode: '8544',
        quantity: 200,
        unit: 'MTR',
        mrp: 180,
        rate: 150,
        discountAmount: 1000,
        discountPercent: 0,
        taxableValue: 29000,
        gstRate: 18,
        cgstRate: 9,
        cgstAmount: 2610,
        sgstRate: 9,
        sgstAmount: 2610,
        igstRate: 0,
        igstAmount: 0,
        cessRate: 0,
        cessAmount: 0,
        totalTax: 5220,
        totalAmount: 34220,
      },
      {
        id: 'item_2',
        productId: 'prod_02',
        productName: 'Schneider Electric MCB 32A C-Curve',
        description: 'Miniature Circuit Breaker Single Pole',
        hsnCode: '8536',
        quantity: 50,
        unit: 'PCS',
        mrp: 360,
        rate: 290,
        discountAmount: 0,
        discountPercent: 0,
        taxableValue: 14500,
        gstRate: 18,
        cgstRate: 9,
        cgstAmount: 1305,
        sgstRate: 9,
        sgstAmount: 1305,
        igstRate: 0,
        igstAmount: 0,
        cessRate: 0,
        cessAmount: 0,
        totalTax: 2610,
        totalAmount: 17110,
      }
    ],
    totals: {
      itemCount: 2,
      totalQuantity: 250,
      grossAmount: 44500,
      totalDiscount: 1000,
      taxableValue: 43500,
      cgstTotal: 3915,
      sgstTotal: 3915,
      igstTotal: 0,
      cessTotal: 0,
      totalTax: 7830,
      roundOff: 0,
      grandTotal: 51330,
      taxBreakdowns: [
        {
          gstRate: 18,
          taxableValue: 43500,
          cgstAmount: 3915,
          sgstAmount: 3915,
          igstAmount: 0,
          cessAmount: 0,
          totalTax: 7830,
        }
      ]
    },
    paidAmount: 51330,
    balanceDue: 0,
    payments: [
      {
        id: 'pay_01',
        invoiceId: 'inv_01',
        businessId: 'biz_default_01',
        amount: 51330,
        paymentDate: '2026-04-14',
        paymentMode: 'BANK_TRANSFER',
        referenceNumber: 'NEFT-SBI948271',
        notes: 'Full payment received via NEFT',
        recordedBy: 'Owner',
        createdAt: '2026-04-14T14:30:00Z',
      }
    ],
    amountInWordsEn: 'Rupees Fifty-One Thousand Three Hundred Thirty Only',
    amountInWordsHi: 'इक्यावन हज़ार तीन सौ तीस रुपये मात्र',
    taxRuleVersion: CURRENT_TAX_RULE_VERSION,
    notes: 'Thank you for your business!',
    terms: DEFAULT_PROFILE.termsAndConditions,
    issuedAt: '2026-04-14T10:15:00Z',
    createdAt: '2026-04-14T10:10:00Z',
    updatedAt: '2026-04-14T14:30:00Z',
  },
  {
    id: 'inv_02',
    businessId: 'biz_default_01',
    invoiceNumber: 'INV-2026-0002',
    financialYear: '2026-27',
    invoiceDate: '2026-04-16',
    status: 'PARTIALLY_PAID',
    language: 'en',
    template: 'modern',
    sellerState: 'Delhi',
    sellerStateCode: '07',
    buyerState: 'Haryana',
    buyerStateCode: '06',
    placeOfSupply: 'Haryana (06)',
    supplyType: 'INTER_STATE',
    isReverseCharge: false,
    sellerDetails: DEFAULT_PROFILE,
    buyerDetails: {
      customerId: 'cust_02',
      name: 'Gupta Traders',
      businessName: 'Gupta Hardware Mart',
      gstin: '06AABCG9876E1Z1',
      pan: 'AABCG9876E',
      address: 'Railway Road, Sector 14',
      city: 'Gurugram',
      state: 'Haryana',
      stateCode: '06',
      pinCode: '122001',
      phone: '+91 99990 88877',
      email: 'contact@guptahardware.in',
      customerType: 'B2B_REGISTERED',
    },
    items: [
      {
        id: 'item_3',
        productId: 'prod_05',
        productName: 'Crompton 1.0 HP Monoblock Water Pump',
        description: 'High suction centrifugal pump',
        hsnCode: '8413',
        quantity: 10,
        unit: 'PCS',
        mrp: 6200,
        rate: 5100,
        discountAmount: 1000,
        discountPercent: 0,
        taxableValue: 50000,
        gstRate: 18,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 18,
        igstAmount: 9000,
        cessRate: 0,
        cessAmount: 0,
        totalTax: 9000,
        totalAmount: 59000,
      }
    ],
    totals: {
      itemCount: 1,
      totalQuantity: 10,
      grossAmount: 51000,
      totalDiscount: 1000,
      taxableValue: 50000,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 9000,
      cessTotal: 0,
      totalTax: 9000,
      roundOff: 0,
      grandTotal: 59000,
      taxBreakdowns: [
        {
          gstRate: 18,
          taxableValue: 50000,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 9000,
          cessAmount: 0,
          totalTax: 9000,
        }
      ]
    },
    paidAmount: 30000,
    balanceDue: 29000,
    payments: [
      {
        id: 'pay_02',
        invoiceId: 'inv_02',
        businessId: 'biz_default_01',
        amount: 30000,
        paymentDate: '2026-04-16',
        paymentMode: 'UPI',
        referenceNumber: 'UPI-TXN-884920',
        notes: 'Advance 50%+ received via UPI',
        recordedBy: 'Owner',
        createdAt: '2026-04-16T11:00:00Z',
      }
    ],
    amountInWordsEn: 'Rupees Fifty-Nine Thousand Only',
    amountInWordsHi: 'उनसठ हज़ार रुपये मात्र',
    taxRuleVersion: CURRENT_TAX_RULE_VERSION,
    notes: 'Inter-state delivery dispatched via SafeX Express',
    terms: DEFAULT_PROFILE.termsAndConditions,
    issuedAt: '2026-04-16T10:45:00Z',
    createdAt: '2026-04-16T10:30:00Z',
    updatedAt: '2026-04-16T11:00:00Z',
  }
];

export class StorageService {
  // 1. Session & Auth
  static getSession(): UserSession | null {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserSession;
    } catch (error) {
      console.error('Session load error', error);
      localStorage.removeItem(STORAGE_KEYS.USER);
      return null;
    }
  }

  static login(email: string, password: string): UserSession | null {
    if (email.trim().toLowerCase() !== DEMO_LOGIN.email || password !== DEMO_LOGIN.password) {
      return null;
    }

    const user: UserSession = {
      id: 'usr_01',
      name: 'Ramesh Sharma',
      email: DEMO_LOGIN.email,
      role: 'Owner',
      businessId: DEFAULT_PROFILE.id,
    };
    this.setUser(user);
    return user;
  }

  static getUser(): UserSession {
    const session = this.getSession();
    if (session) return session;

    const defaultUser: UserSession = {
      id: 'usr_01',
      name: 'Ramesh Sharma',
      email: 'ramesh@sharmaelectricals.in',
      role: 'Owner',
      businessId: DEFAULT_PROFILE.id,
    };
    this.setUser(defaultUser);
    return defaultUser;
  }

  static setUser(user: UserSession): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  static logout(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  // 2. Business Profile
  static getProfile(): BusinessProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Profile load error', e);
      }
    }
    this.saveProfile(DEFAULT_PROFILE);
    return DEFAULT_PROFILE;
  }

  static getBusinessProfile(): BusinessProfile {
    return this.getProfile();
  }

  static saveProfile(profile: BusinessProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    this.addAuditLog('BUSINESS', profile.id, profile.businessName, 'Updated business profile settings');
  }

  static saveBusinessProfile(profile: BusinessProfile): void {
    this.saveProfile(profile);
  }

  // 3. Customers
  static getCustomers(): Customer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Customer load error', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
    return SEED_CUSTOMERS;
  }

  static saveCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const existingIndex = customers.findIndex(c => c.id === customer.id);
    let persistedCustomer: Customer;
    if (existingIndex >= 0) {
      persistedCustomer = { ...customer, updatedAt: new Date().toISOString() };
      customers[existingIndex] = persistedCustomer;
      this.addAuditLog('CUSTOMER', customer.id, customer.name, 'Updated customer details');
    } else {
      persistedCustomer = {
        ...customer,
        id: customer.id || `cust_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      customers.push(persistedCustomer);
      this.addAuditLog('CUSTOMER', customer.id, customer.name, 'Added new customer');
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    syncCustomerToDatabase(persistedCustomer);
  }

  static deleteCustomer(id: string): void {
    let customers = this.getCustomers();
    const c = customers.find(item => item.id === id);
    customers = customers.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    if (c) {
      this.addAuditLog('CUSTOMER', id, c.name, 'Deactivated / removed customer');
      deleteCustomerFromDatabase(id);
    }
  }

  // 4. Products & Inventory Management
  static getProducts(): Product[] {
    let list: Product[] = [];
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch (e) {
        console.error('Product load error', e);
        list = SEED_PRODUCTS;
      }
    } else {
      list = SEED_PRODUCTS;
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SEED_PRODUCTS));
    }

    // Ensure all stock fields are normalized
    return list.map(p => {
      const stock = p.currentStock ?? p.stockQuantity ?? p.stock ?? 0;
      const minStock = p.lowStockAlert ?? p.minStockAlert ?? p.minStock ?? 5;
      return {
        ...p,
        currentStock: stock,
        stockQuantity: stock,
        stock: stock,
        lowStockAlert: minStock,
        minStockAlert: minStock,
        minStock: minStock,
      };
    });
  }

  static getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  static saveProduct(product: Product): Product {
    const products = this.getProducts();
    const existingIndex = products.findIndex(p => p.id === product.id);
    const stock = product.currentStock ?? product.stockQuantity ?? product.stock ?? 0;
    const minStock = product.lowStockAlert ?? product.minStockAlert ?? product.minStock ?? 5;
    
    const normalizedProduct: Product = {
      ...product,
      currentStock: stock,
      stockQuantity: stock,
      stock: stock,
      lowStockAlert: minStock,
      minStockAlert: minStock,
      minStock: minStock,
    };

    if (existingIndex >= 0) {
      const prev = products[existingIndex];
      const prevStock = prev.currentStock ?? prev.stockQuantity ?? 0;
      normalizedProduct.updatedAt = new Date().toISOString();
      products[existingIndex] = normalizedProduct;

      this.addAuditLog('PRODUCT', normalizedProduct.id, normalizedProduct.name, `Updated product catalog details`);

      // If stock was adjusted via product edit, record inventory movement
      if (stock !== prevStock) {
        const delta = stock - prevStock;
        this.addInventoryLog({
          businessId: normalizedProduct.businessId || 'biz_default_01',
          productId: normalizedProduct.id,
          productName: normalizedProduct.name,
          sku: normalizedProduct.sku,
          adjustmentType: delta > 0 ? 'STOCK_IN_ADJUSTMENT' : 'STOCK_OUT_AUDIT',
          quantityChange: delta,
          previousStock: prevStock,
          newStock: stock,
          unit: normalizedProduct.unit,
          reason: 'Manual stock edit in product settings',
        });
      }
    } else {
      normalizedProduct.id = product.id || `prod_${Date.now()}`;
      normalizedProduct.createdAt = new Date().toISOString();
      normalizedProduct.updatedAt = new Date().toISOString();
      products.push(normalizedProduct);

      this.addAuditLog('PRODUCT', normalizedProduct.id, normalizedProduct.name, `Added new product with initial inventory of ${stock} ${normalizedProduct.unit}`);

      if (stock > 0) {
        this.addInventoryLog({
          businessId: normalizedProduct.businessId || 'biz_default_01',
          productId: normalizedProduct.id,
          productName: normalizedProduct.name,
          sku: normalizedProduct.sku,
          adjustmentType: 'STOCK_IN_PURCHASE',
          quantityChange: stock,
          previousStock: 0,
          newStock: stock,
          unit: normalizedProduct.unit,
          reason: 'Initial opening stock upon product creation',
        });
      }
    }

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    syncProductToDatabase(normalizedProduct);
    return normalizedProduct;
  }

  static deleteProduct(id: string): boolean {
    let products = this.getProducts();
    const p = products.find(item => item.id === id);
    if (!p) return false;

    products = products.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    deleteProductFromDatabase(id);

    const remainingStock = p.currentStock ?? p.stockQuantity ?? 0;
    this.addAuditLog('PRODUCT', id, p.name, `Deleted product permanently (Had ${remainingStock} ${p.unit} remaining in inventory)`);

    if (remainingStock > 0) {
      this.addInventoryLog({
        businessId: p.businessId || 'biz_default_01',
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        adjustmentType: 'STOCK_DELETE_ALL',
        quantityChange: -remainingStock,
        previousStock: remainingStock,
        newStock: 0,
        unit: p.unit,
        reason: 'Product deleted from catalog',
      });
    }

    return true;
  }

  static bulkDeleteProducts(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    let products = this.getProducts();
    const toDelete = products.filter(p => ids.includes(p.id));
    if (toDelete.length === 0) return 0;

    const names = toDelete.map(p => p.name).join(', ');
    products = products.filter(p => !ids.includes(p.id));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    toDelete.forEach(p => {
      deleteProductFromDatabase(p.id);
      const remainingStock = p.currentStock ?? p.stockQuantity ?? 0;
      if (remainingStock > 0) {
        this.addInventoryLog({
          businessId: p.businessId || 'biz_default_01',
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          adjustmentType: 'STOCK_DELETE_ALL',
          quantityChange: -remainingStock,
          previousStock: remainingStock,
          newStock: 0,
          unit: p.unit,
          reason: 'Bulk product deletion',
        });
      }
    });

    this.addAuditLog('PRODUCT', ids.join(','), `Batch of ${toDelete.length} items`, `Bulk deleted ${toDelete.length} products: ${names.slice(0, 100)}...`);
    return toDelete.length;
  }

  /**
   * Adjusts inventory for a product (Add stock or deduct stock)
   */
  static adjustStock(
    productId: string,
    quantityChange: number,
    adjustmentType: StockAdjustmentType,
    reason: string,
    notes?: string
  ): Product | null {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) return null;

    const p = products[index];
    const prevStock = p.currentStock ?? p.stockQuantity ?? 0;
    const newStock = Math.max(0, prevStock + quantityChange);
    const actualDelta = newStock - prevStock;

    p.currentStock = newStock;
    p.stockQuantity = newStock;
    p.stock = newStock;
    p.updatedAt = new Date().toISOString();

    products[index] = p;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    syncProductToDatabase(p);

    // Record inventory log
    this.addInventoryLog({
      businessId: p.businessId || 'biz_default_01',
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      adjustmentType,
      quantityChange: actualDelta,
      previousStock: prevStock,
      newStock,
      unit: p.unit,
      reason,
      notes,
    });

    // Record system audit log
    const actionLabel = actualDelta >= 0 ? 'Added Inventory' : 'Deducted/Deleted Inventory';
    this.addAuditLog(
      'INVENTORY',
      p.id,
      p.name,
      `${actionLabel}: ${Math.abs(actualDelta)} ${p.unit} (${reason}). New stock: ${newStock} ${p.unit}`
    );

    return p;
  }

  /**
   * Delete or zero out inventory for a specific product
   */
  static clearProductStock(productId: string, reason: string = 'Stock cleared / written off to zero', notes?: string): Product | null {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) return null;

    const p = products[index];
    const prevStock = p.currentStock ?? p.stockQuantity ?? 0;
    if (prevStock === 0) return p;

    return this.adjustStock(
      productId,
      -prevStock,
      'STOCK_DELETE_ALL',
      reason,
      notes || 'Zeroed out entire remaining stock'
    );
  }

  // 4b. Inventory Logs
  static getInventoryLogs(productId?: string): InventoryLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY_LOGS);
    let logs: InventoryLog[] = [];
    if (raw) {
      try {
        logs = JSON.parse(raw);
      } catch (e) {
        console.error('Inventory log parse error', e);
      }
    }
    if (productId) {
      return logs.filter(l => l.productId === productId);
    }
    return logs;
  }

  static addInventoryLog(logData: Omit<InventoryLog, 'id' | 'timestamp' | 'recordedBy'>): void {
    const logs = this.getInventoryLogs();
    const user = this.getUser();
    const newLog: InventoryLog = {
      ...logData,
      id: `inv_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recordedBy: user.name || 'Owner',
      timestamp: new Date().toISOString(),
    };

    // Keep up to latest 500 inventory logs
    logs.unshift(newLog);
    if (logs.length > 500) {
      logs.length = 500;
    }

    localStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(logs));
  }

  // 5. Invoices
  static getInvoices(): Invoice[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Invoice load error', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(SEED_INVOICES));
    return SEED_INVOICES;
  }

  static getInvoiceById(id: string): Invoice | undefined {
    return this.getInvoices().find(inv => inv.id === id);
  }

  /**
   * Generates next sequential invoice number based on prefix and financial year
   */
  static getNextInvoiceNumber(): string {
    const profile = this.getProfile();
    const prefix = profile.invoicePrefix || 'INV-2026';
    const invoices = this.getInvoices();

    // Extract sequence numbers that match the prefix
    const matchingNumbers = invoices
      .map(inv => inv.invoiceNumber)
      .filter(num => num && num.startsWith(prefix))
      .map(num => {
        const parts = num.split('-');
        const lastPart = parts[parts.length - 1];
        const parsed = parseInt(lastPart, 10);
        return isNaN(parsed) ? 0 : parsed;
      });

    const maxNum = matchingNumbers.length > 0 ? Math.max(...matchingNumbers) : (profile.startingInvoiceNumber - 1 || 0);
    const nextSeq = maxNum + 1;
    const padded = String(nextSeq).padStart(4, '0');
    return `${prefix}-${padded}`;
  }

  static saveInvoice(invoice: Invoice): Invoice {
    const invoices = this.getInvoices();
    const index = invoices.findIndex(i => i.id === invoice.id);
    const now = new Date().toISOString();

    const preparedInvoice: Invoice = {
      ...invoice,
      amountInWordsEn: numberToWordsIndianEn(invoice.totals.grandTotal),
      amountInWordsHi: numberToWordsIndianHi(invoice.totals.grandTotal),
      updatedAt: now,
    };

    if (index >= 0) {
      // If invoice was already issued, guard against modification of critical fields
      const existing = invoices[index];
      if (existing.status === 'ISSUED' && preparedInvoice.status === 'DRAFT') {
        throw new Error('Issued invoices cannot be converted back to Draft. Use credit note or cancellation.');
      }
      invoices[index] = preparedInvoice;
      this.addAuditLog('INVOICE', invoice.id, invoice.invoiceNumber, `Updated invoice (${invoice.status})`);
    } else {
      preparedInvoice.createdAt = now;
      invoices.push(preparedInvoice);
      this.addAuditLog('INVOICE', invoice.id, invoice.invoiceNumber, `Created invoice (${invoice.status})`);
    }

    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    syncInvoiceToDatabase(preparedInvoice);
    return preparedInvoice;
  }

  static issueInvoice(invoiceId: string): Invoice {
    const invoices = this.getInvoices();
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }
    if (inv.status === 'ISSUED' || inv.status === 'PAID') {
      return inv;
    }

    inv.status = inv.paidAmount >= inv.totals.grandTotal ? 'PAID' : (inv.paidAmount > 0 ? 'PARTIALLY_PAID' : 'ISSUED');
    inv.issuedAt = new Date().toISOString();
    inv.updatedAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    syncInvoiceToDatabase(inv);
    this.addAuditLog('INVOICE', inv.id, inv.invoiceNumber, `Officially issued tax invoice. Number locked.`);

    // Update customer balances
    if (inv.buyerDetails.customerId) {
      this.syncCustomerBalance(inv.buyerDetails.customerId);
    }

    return inv;
  }

  static cancelInvoice(invoiceId: string, reason: string): Invoice {
    const invoices = this.getInvoices();
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    inv.status = 'CANCELLED';
    inv.cancelledAt = new Date().toISOString();
    inv.cancelReason = reason || 'Cancelled by authorized user';
    inv.updatedAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    syncInvoiceToDatabase(inv);
    this.addAuditLog('INVOICE', inv.id, inv.invoiceNumber, `Cancelled invoice. Reason: ${reason}`);

    if (inv.buyerDetails.customerId) {
      this.syncCustomerBalance(inv.buyerDetails.customerId);
    }

    return inv;
  }

  // 6. Payments
  static recordPayment(payment: Omit<PaymentRecord, 'id' | 'createdAt'>): PaymentRecord {
    const newRecord: PaymentRecord = {
      ...payment,
      id: `pay_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const invoices = this.getInvoices();
    const inv = invoices.find(i => i.id === payment.invoiceId);
    if (inv) {
      inv.payments = [...(inv.payments || []), newRecord];
      const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      inv.paidAmount = totalPaid;
      inv.balanceDue = Math.max(0, inv.totals.grandTotal - totalPaid);

      if (inv.status !== 'CANCELLED') {
        if (inv.balanceDue <= 0) {
          inv.status = 'PAID';
        } else if (inv.paidAmount > 0) {
          inv.status = 'PARTIALLY_PAID';
        }
      }
      inv.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

      if (inv.buyerDetails.customerId) {
        this.syncCustomerBalance(inv.buyerDetails.customerId);
      }
    }

    this.addAuditLog('PAYMENT', newRecord.id, `₹${payment.amount} for ${inv?.invoiceNumber || payment.invoiceId}`, `Recorded payment via ${payment.paymentMode || payment.paymentMethod || 'CASH'}`);
    syncPaymentToDatabase(newRecord);
    if (inv) syncInvoiceToDatabase(inv);
    return newRecord;
  }

  static savePayment(payment: any): PaymentRecord {
    return this.recordPayment({
      invoiceId: payment.invoiceId,
      businessId: payment.businessId || 'biz_default_01',
      amount: payment.amount,
      paymentDate: payment.paymentDate || new Date().toISOString().substring(0, 10),
      paymentMode: payment.paymentMode || payment.paymentMethod || 'CASH',
      referenceNumber: payment.referenceNumber,
      notes: payment.notes,
      recordedBy: payment.recordedBy || 'Owner',
    });
  }

  static syncAllCustomerBalances(): void {
    const customers = this.getCustomers();
    customers.forEach(c => {
      this.syncCustomerBalance(c.id);
    });
  }

  private static syncCustomerBalance(customerId: string): void {
    const customers = this.getCustomers();
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;

    const invoices = this.getInvoices().filter(
      i => i.buyerDetails.customerId === customerId && i.status !== 'CANCELLED' && i.status !== 'DRAFT'
    );

    const totalInvoiced = invoices.reduce((sum, i) => sum + i.totals.grandTotal, 0);
    const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const outstanding = Math.max(0, totalInvoiced - totalPaid);

    cust.totalInvoiced = totalInvoiced;
    cust.totalPaid = totalPaid;
    cust.outstandingBalance = outstanding;
    cust.updatedAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  // 7. Audit Logging
  static getAuditLogs(): AuditLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Audit log error', e);
      }
    }
    return [];
  }

  static addAuditLog(
    recordTypeOrObj: AuditLog['recordType'] | any,
    recordId?: string,
    recordIdentifier?: string,
    details?: string
  ): void {
    const logs = this.getAuditLogs();
    const user = this.getUser();

    let newLog: AuditLog;
    if (typeof recordTypeOrObj === 'object' && recordTypeOrObj !== null) {
      newLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        businessId: recordTypeOrObj.businessId || user.businessId,
        userId: user.id,
        userName: recordTypeOrObj.performedBy || user.name,
        action: recordTypeOrObj.action || recordTypeOrObj.details || 'ACTION',
        recordType: (recordTypeOrObj.entityType || 'INVOICE') as any,
        recordId: recordTypeOrObj.entityId || '',
        recordIdentifier: recordTypeOrObj.entityId || '',
        details: recordTypeOrObj.details || recordTypeOrObj.action || '',
        timestamp: new Date().toISOString(),
      };
    } else {
      newLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        businessId: user.businessId,
        userId: user.id,
        userName: user.name,
        action: details || '',
        recordType: recordTypeOrObj,
        recordId: recordId || '',
        recordIdentifier: recordIdentifier || '',
        details: details || '',
        timestamp: new Date().toISOString(),
      };
    }
    logs.unshift(newLog);
    // Keep last 500 logs
    if (logs.length > 500) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  }

  // 8. Language Preference
  static getLanguage(): Language {
    return (localStorage.getItem(STORAGE_KEYS.LANG) as Language) || 'en';
  }

  static setLanguage(lang: Language): void {
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  }
}
