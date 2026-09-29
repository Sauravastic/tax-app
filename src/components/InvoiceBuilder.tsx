import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Sparkles, 
  Calculator, 
  ArrowRight,
  Info,
  UserCheck,
  UserPlus,
  HelpCircle
} from 'lucide-react';
import { 
  Invoice, 
  InvoiceItem, 
  Customer, 
  Product, 
  BusinessProfile, 
  Language, 
  UnitType, 
  SupplyType,
  ValidationResult 
} from '../types';
import { INDIAN_STATES, getStateByCode } from '../services/gstinValidator';
import { calculateLineItem, calculateInvoiceTotals, determineSupplyType, round2 } from '../services/gstEngine';
import { CURRENT_TAX_RULE, CURRENT_TAX_RULE_VERSION } from '../services/taxRuleDatabase';
import { validateInvoice } from '../services/invoiceValidator';
import { StorageService } from '../services/storage';
import { TRANSLATIONS } from '../locales/translations';

interface InvoiceBuilderProps {
  initialInvoice?: Invoice | null;
  profile: BusinessProfile;
  customers: Customer[];
  products: Product[];
  currentLang: Language;
  existingInvoices: Invoice[];
  isQuickBillMode?: boolean;
  onSaveDraft: (invoice: Invoice) => void;
  onPreviewAndIssue: (invoice: Invoice) => void;
  onCancel: () => void;
}

export const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({
  initialInvoice,
  profile,
  customers,
  products,
  currentLang,
  existingInvoices,
  isQuickBillMode = false,
  onSaveDraft,
  onPreviewAndIssue,
  onCancel,
}) => {
  const t = TRANSLATIONS[currentLang];

  // 1. Base invoice state
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    initialInvoice?.invoiceNumber || StorageService.getNextInvoiceNumber()
  );
  const [invoiceDate, setInvoiceDate] = useState<string>(
    initialInvoice?.invoiceDate || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    initialInvoice?.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [invoiceLanguage, setInvoiceLanguage] = useState<Language>(
    initialInvoice?.language || currentLang
  );

  // 2. Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialInvoice?.buyerDetails.customerId || ''
  );
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>(initialInvoice?.buyerDetails.name || '');
  const [buyerBusinessName, setBuyerBusinessName] = useState<string>(initialInvoice?.buyerDetails.businessName || '');
  const [buyerGstin, setBuyerGstin] = useState<string>(initialInvoice?.buyerDetails.gstin || '');
  const [buyerAddress, setBuyerAddress] = useState<string>(initialInvoice?.buyerDetails.address || '');
  const [buyerCity, setBuyerCity] = useState<string>(initialInvoice?.buyerDetails.city || '');
  const [buyerStateCode, setBuyerStateCode] = useState<string>(
    initialInvoice?.buyerStateCode || profile.stateCode || '07'
  );
  const [buyerPinCode, setBuyerPinCode] = useState<string>(initialInvoice?.buyerDetails.pinCode || '');
  const [buyerPhone, setBuyerPhone] = useState<string>(initialInvoice?.buyerDetails.phone || '');
  const [buyerCustomerType, setBuyerCustomerType] = useState<Invoice['buyerDetails']['customerType']>(
    initialInvoice?.buyerDetails.customerType || 'B2C_UNREGISTERED'
  );

  // 3. Place of Supply & Supply Type
  const sellerStateCode = profile.stateCode || '07';
  const supplyType: SupplyType = determineSupplyType(sellerStateCode, buyerStateCode);

  // 4. Line Items
  const createEmptyItem = (): InvoiceItem => {
    const calc = calculateLineItem({
      quantity: 1,
      rate: 100,
      gstRate: isQuickBillMode ? 0 : 18,
      supplyType,
    });
    return {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productName: '',
      description: '',
      hsnCode: '8471',
      quantity: 1,
      unit: 'PCS',
      mrp: 120,
      rate: 100,
      discountAmount: 0,
      discountPercent: 0,
      taxableValue: calc.taxableValue,
      gstRate: isQuickBillMode ? 0 : 18,
      cgstRate: calc.cgstRate,
      cgstAmount: calc.cgstAmount,
      sgstRate: calc.sgstRate,
      sgstAmount: calc.sgstAmount,
      igstRate: calc.igstRate,
      igstAmount: calc.igstAmount,
      cessRate: 0,
      cessAmount: 0,
      totalTax: calc.totalTax,
      totalAmount: calc.totalAmount,
    };
  };

  const [items, setItems] = useState<InvoiceItem[]>(
    initialInvoice?.items?.length ? initialInvoice.items : [createEmptyItem()]
  );

  // Notes & terms
  const [notes, setNotes] = useState<string>(
    initialInvoice?.notes || 'Thank you for your business!'
  );

  // Advisory HSN Helper Modal state
  const [hsnHelperOpen, setHsnHelperOpen] = useState(false);
  const [activeItemIndexForHsn, setActiveItemIndexForHsn] = useState<number | null>(null);
  const [hsnQuery, setHsnQuery] = useState('');
  const [hsnSuggestions, setHsnSuggestions] = useState<any[]>([]);
  const [hsnLoading, setHsnLoading] = useState(false);
  const [hsnDisclaimer, setHsnDisclaimer] = useState('');

  // Real-time calculated totals
  const totals = calculateInvoiceTotals(items);

  // Validation inspector
  const currentInvoiceDraft: Partial<Invoice> = {
    id: initialInvoice?.id || `inv_${Date.now()}`,
    invoiceNumber,
    invoiceDate,
    dueDate,
    sellerState: profile.state,
    sellerStateCode: profile.stateCode,
    buyerState: getStateByCode(buyerStateCode)?.name || 'Delhi',
    buyerStateCode,
    placeOfSupply: `${getStateByCode(buyerStateCode)?.name || 'Delhi'} (${buyerStateCode})`,
    supplyType,
    sellerDetails: profile,
    buyerDetails: {
      customerId: selectedCustomerId,
      name: buyerName,
      businessName: buyerBusinessName,
      gstin: buyerGstin,
      address: buyerAddress,
      city: buyerCity,
      state: getStateByCode(buyerStateCode)?.name || 'Delhi',
      stateCode: buyerStateCode,
      pinCode: buyerPinCode,
      phone: buyerPhone,
      customerType: buyerCustomerType,
    },
    items,
    totals,
  };

  const validation: ValidationResult = validateInvoice(currentInvoiceDraft, existingInvoices);

  // Re-calculate all items whenever supply type or bill mode changes
  useEffect(() => {
    setItems(prev =>
      prev.map(item => {
        const recalculated = calculateLineItem({
          quantity: item.quantity,
          rate: item.rate,
          discountAmount: isQuickBillMode ? 0 : item.discountAmount,
          discountPercent: isQuickBillMode ? 0 : item.discountPercent,
          gstRate: isQuickBillMode ? 0 : item.gstRate,
          cessRate: isQuickBillMode ? 0 : item.cessRate,
          supplyType,
        });
        return {
          ...item,
          ...recalculated,
          ...(isQuickBillMode ? { discountAmount: 0, discountPercent: 0, gstRate: 0, cessRate: 0 } : {}),
        };
      })
    );
  }, [supplyType, isQuickBillMode]);

  // Handle customer selection
  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setBuyerName(cust.name);
    setBuyerBusinessName(cust.businessName || '');
    setBuyerGstin(cust.gstin || '');
    setBuyerAddress(cust.address || '');
    setBuyerCity(cust.city || '');
    setBuyerStateCode(cust.stateCode || profile.stateCode);
    setBuyerPinCode(cust.pinCode || '');
    setBuyerPhone(cust.phone || '');
    setBuyerCustomerType(cust.customerType);
    setCustomerSearchQuery('');
  };

  const handleWalkInCustomer = () => {
    setSelectedCustomerId('');
    setBuyerName('Cash / Walk-in Customer');
    setBuyerBusinessName('');
    setBuyerGstin('');
    setBuyerAddress('Counter Sale');
    setBuyerCity(profile.city);
    setBuyerStateCode(profile.stateCode);
    setBuyerPinCode(profile.pinCode);
    setBuyerPhone('');
    setBuyerCustomerType('CONSUMER');
  };

  // Line item manipulation
  const updateItemField = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // If user selected product from autocomplete
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          item.productName = prod.name;
          item.description = prod.description;
          item.hsnCode = prod.hsnCode;
          item.unit = prod.unit;
          item.mrp = prod.mrp;
          item.rate = prod.sellingPrice;
          item.gstRate = prod.gstRate;
          item.cessRate = prod.cessRate || 0;
        }
      }

      if (isQuickBillMode) {
        item.discountAmount = 0;
        item.discountPercent = 0;
        item.gstRate = 0;
        item.cessRate = 0;
      }

      // Recompute taxes
      const recalc = calculateLineItem({
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        discountAmount: isQuickBillMode ? 0 : Number(item.discountAmount) || 0,
        discountPercent: isQuickBillMode ? 0 : Number(item.discountPercent) || 0,
        gstRate: isQuickBillMode ? 0 : Number(item.gstRate) || 0,
        cessRate: isQuickBillMode ? 0 : Number(item.cessRate) || 0,
        supplyType,
      });

      updated[index] = {
        ...item,
        ...recalc,
      };
      return updated;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, createEmptyItem()]);
  };

  const duplicateItem = (index: number) => {
    const item = items[index];
    const copy = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setItems(prev => [...prev, copy]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      alert('Invoice must have at least one line item.');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Advisory HSN Suggestion Handler
  const openHsnHelper = (index: number) => {
    setActiveItemIndexForHsn(index);
    const item = items[index];
    setHsnQuery(item.productName || '');
    setHsnSuggestions([]);
    setHsnDisclaimer('');
    setHsnHelperOpen(true);
  };

  const searchHsnSuggestions = async () => {
    if (!hsnQuery.trim()) return;
    setHsnLoading(true);

    // First search in local curated tax rule schedule
    const localMatches = CURRENT_TAX_RULE.standardHsnCategories
      .filter(c => 
        c.description.toLowerCase().includes(hsnQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(hsnQuery.toLowerCase()) ||
        c.hsn.includes(hsnQuery)
      )
      .map(c => ({
        hsn: c.hsn,
        description: c.description,
        suggestedRate: c.defaultGstRate,
        confidence: 'High',
        notes: `Official standard rate from ${c.category}`,
      }));

    // If backend route available, also call /api/ai/suggest-hsn
    try {
      const res = await fetch('/api/ai/suggest-hsn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: hsnQuery }),
      });
      if (res.ok) {
        const data = await res.json();
        const combined = [...localMatches, ...(data.suggestions || [])];
        // Deduplicate by HSN
        const seen = new Set();
        const unique = combined.filter(s => {
          if (seen.has(s.hsn)) return false;
          seen.add(s.hsn);
          return true;
        });
        setHsnSuggestions(unique);
        setHsnDisclaimer(data.disclaimer || 'Advisory suggestion. User confirmation required before invoice issuance.');
      } else {
        setHsnSuggestions(localMatches);
      }
    } catch {
      setHsnSuggestions(localMatches);
    } finally {
      setHsnLoading(false);
    }
  };

  const applyHsnSuggestion = (s: any) => {
    if (activeItemIndexForHsn !== null) {
      updateItemField(activeItemIndexForHsn, 'hsnCode', s.hsn);
      if (s.suggestedRate !== undefined) {
        updateItemField(activeItemIndexForHsn, 'gstRate', s.suggestedRate);
      }
    }
    setHsnHelperOpen(false);
  };

  const buildCompleteInvoice = (status: Invoice['status']): Invoice => {
    const buyerStateName = getStateByCode(buyerStateCode)?.name || profile.state;
    return {
      id: initialInvoice?.id || `inv_${Date.now()}`,
      businessId: profile.id,
      isQuickBill: isQuickBillMode,
      invoiceNumber,
      financialYear: profile.financialYear || '2026-27',
      invoiceDate,
      dueDate,
      status,
      language: invoiceLanguage,
      template: 'modern',
      sellerState: profile.state,
      sellerStateCode: profile.stateCode,
      buyerState: buyerStateName,
      buyerStateCode,
      placeOfSupply: `${buyerStateName} (${buyerStateCode})`,
      supplyType,
      isReverseCharge: false,
      sellerDetails: profile,
      buyerDetails: {
        customerId: selectedCustomerId,
        name: buyerName.trim() || 'Valued Customer',
        businessName: buyerBusinessName.trim(),
        gstin: buyerGstin.trim().toUpperCase(),
        address: buyerAddress.trim(),
        city: buyerCity.trim(),
        state: buyerStateName,
        stateCode: buyerStateCode,
        pinCode: buyerPinCode.trim(),
        phone: buyerPhone.trim(),
        customerType: buyerCustomerType,
      },
      items,
      totals,
      paidAmount: initialInvoice?.paidAmount || 0,
      balanceDue: Math.max(0, totals.grandTotal - (initialInvoice?.paidAmount || 0)),
      payments: initialInvoice?.payments || [],
      amountInWordsEn: '',
      amountInWordsHi: '',
      taxRuleVersion: CURRENT_TAX_RULE_VERSION,
      notes,
      terms: profile.termsAndConditions,
      createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleProceedToIssue = () => {
    if (!validation.isValid) {
      const errorMsgs = validation.errors.map(e => `• ${e.messageEn}`).join('\n');
      alert(`Cannot issue invoice due to validation errors:\n\n${errorMsgs}`);
      return;
    }
    const inv = buildCompleteInvoice('VALIDATED');
    onPreviewAndIssue(inv);
  };

  const handleSaveDraftClick = () => {
    const inv = buildCompleteInvoice('DRAFT');
    onSaveDraft(inv);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              {isQuickBillMode ? '⚡ Quick Counter Bill' : 'Create Tax Invoice'}
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
              GST Tax Invoice
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Rule Version: {CURRENT_TAX_RULE_VERSION} • Deterministic Decimal Engine
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {/* Invoice Language Switcher */}
          <div className="flex items-center space-x-1.5 text-xs bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-medium px-1">Doc Lang:</span>
            <button
              onClick={() => setInvoiceLanguage('en')}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                invoiceLanguage === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setInvoiceLanguage('hi')}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                invoiceLanguage === 'hi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              हिंदी
            </button>
          </div>

          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDraftClick}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Save Draft
          </button>
          <button
            onClick={handleProceedToIssue}
            className={`inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs sm:text-sm font-bold text-white rounded-lg shadow-sm transition ${
              validation.isValid
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <span>Review & Issue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Validation Banner if errors exist */}
      {!validation.isValid && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center space-x-2 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Invoice Requires Correction Before Official Issuance ({validation.errors.length} Critical Errors)</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-amber-800">
            {validation.errors.map((err, i) => (
              <li key={i}>{currentLang === 'hi' ? err.messageHi : err.messageEn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step 1: Invoice Meta & Customer Selection */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">Customer & Document Details</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleWalkInCustomer}
              className="text-xs px-2.5 py-1 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
            >
              + Walk-in Cash Customer
            </button>
          </div>
        </div>

        {/* Invoice Number & Date row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invoice Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={e => setInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Customer Select / Autocomplete Search */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800">
              Select or Search Saved Customer
            </label>
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, phone or GSTIN..."
                value={customerSearchQuery}
                onChange={e => setCustomerSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              {customerSearchQuery.trim() && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
                  {customers
                    .filter(c =>
                      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                      (c.gstin && c.gstin.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
                      c.phone.includes(customerSearchQuery)
                    )
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 border-b border-slate-100 last:border-0 flex justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{c.name}</div>
                          <div className="text-[10px] text-slate-500">{c.phone} • {c.state}</div>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded self-center">
                          {c.gstin || 'B2C'}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Customer Details Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh Verma"
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Customer Type
              </label>
              <select
                value={buyerCustomerType}
                onChange={e => setBuyerCustomerType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden"
              >
                <option value="B2B_REGISTERED">B2B Registered (Has GSTIN)</option>
                <option value="B2C_UNREGISTERED">B2C Unregistered Business</option>
                <option value="CONSUMER">Consumer / Retail Buyer</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Customer GSTIN {buyerCustomerType === 'B2B_REGISTERED' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                placeholder="15-digit GSTIN (e.g. 07AAAAA0000A1Z5)"
                value={buyerGstin}
                onChange={e => {
                  const val = e.target.value.toUpperCase();
                  setBuyerGstin(val);
                  // Auto-extract state code if valid
                  if (val.length >= 2) {
                    const st = val.substring(0, 2);
                    if (INDIAN_STATES.some(s => s.code === st)) {
                      setBuyerStateCode(st);
                    }
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Place of Supply (State) <span className="text-red-500">*</span>
              </label>
              <select
                value={buyerStateCode}
                onChange={e => setBuyerStateCode(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden font-medium"
              >
                {INDIAN_STATES.map(st => (
                  <option key={st.code} value={st.code}>
                    {st.code} - {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Billing Address
              </label>
              <input
                type="text"
                placeholder="Plot/Shop, Street, Area"
                value={buyerAddress}
                onChange={e => setBuyerAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                City & PIN Code
              </label>
              <div className="flex space-x-1">
                <input
                  type="text"
                  placeholder="City"
                  value={buyerCity}
                  onChange={e => setBuyerCity(e.target.value)}
                  className="w-2/3 px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                />
                <input
                  type="text"
                  placeholder="PIN"
                  value={buyerPinCode}
                  onChange={e => setBuyerPinCode(e.target.value)}
                  className="w-1/3 px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Customer Phone
              </label>
              <input
                type="text"
                placeholder="+91 Mobile number"
                value={buyerPhone}
                onChange={e => setBuyerPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          {/* Supply Type Indicator Banner */}
          <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs font-semibold ${
            supplyType === 'INTRA_STATE'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>
                GST Supply Classification:{' '}
                <strong>
                  {supplyType === 'INTRA_STATE'
                    ? 'INTRA-STATE (CGST + SGST Applies)'
                    : 'INTER-STATE (IGST Applies)'}
                </strong>
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-600">
              Seller: {profile.stateCode} ➔ Place of Supply: {buyerStateCode}
            </span>
          </div>
        </div>
      </div>

      {/* Step 2: Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              Products / Line Items ({items.length})
            </h2>
          </div>

          <button
            onClick={addItem}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="mobile-scroll-x">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50">
                <th className="py-2.5 px-2 font-semibold w-8">#</th>
                <th className="py-2.5 px-2 font-semibold w-64">Product / Description</th>
                <th className="py-2.5 px-2 font-semibold w-24">HSN/SAC</th>
                <th className="py-2.5 px-2 font-semibold w-16 text-right">Qty</th>
                <th className="py-2.5 px-2 font-semibold w-20">Unit</th>
                <th className="py-2.5 px-2 font-semibold w-24 text-right">Rate (₹)</th>
                {!isQuickBillMode && <th className="py-2.5 px-2 font-semibold w-20 text-right">Disc. (₹)</th>}
                <th className="py-2.5 px-2 font-semibold w-24 text-right">Taxable (₹)</th>
                {!isQuickBillMode && <th className="py-2.5 px-2 font-semibold w-20 text-center">GST %</th>}
                {!isQuickBillMode && <th className="py-2.5 px-2 font-semibold w-24 text-right">Tax (₹)</th>}
                <th className="py-2.5 px-2 font-semibold w-28 text-right">Total (₹)</th>
                <th className="py-2.5 px-2 font-semibold w-16 text-center">Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 px-2 font-bold text-slate-400 text-center">{idx + 1}</td>

                  {/* Product selection / Name */}
                  <td className="py-2.5 px-2 space-y-1">
                    <div className="flex items-center space-x-1">
                      {products.length > 0 && (
                        <select
                          value={item.productId || ''}
                          onChange={e => updateItemField(idx, 'productId', e.target.value)}
                          className="w-24 text-[10px] bg-slate-50 border border-slate-300 rounded px-1 py-1 text-slate-700"
                        >
                          <option value="">Catalog...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="text"
                        placeholder="Product Name"
                        value={item.productName}
                        onChange={e => updateItemField(idx, 'productName', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs font-semibold text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Optional description / model"
                      value={item.description || ''}
                      onChange={e => updateItemField(idx, 'description', e.target.value)}
                      className="w-full px-2 py-0.5 text-[10px] text-slate-500 border border-slate-200 rounded focus:outline-hidden"
                    />
                  </td>

                  {/* HSN Code & Advisory AI Helper button */}
                  <td className="py-2.5 px-2">
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        placeholder="HSN"
                        value={item.hsnCode}
                        onChange={e => updateItemField(idx, 'hsnCode', e.target.value)}
                        className="w-16 px-1.5 py-1 text-xs font-mono border border-slate-300 rounded text-center"
                      />
                      <button
                        type="button"
                        onClick={() => openHsnHelper(idx)}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                        title="AI / Standard HSN Candidate Helper"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-2.5 px-2">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={e => updateItemField(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-1 text-xs text-right border border-slate-300 rounded font-semibold"
                    />
                  </td>

                  {/* Unit */}
                  <td className="py-2.5 px-2">
                    <select
                      value={item.unit}
                      onChange={e => updateItemField(idx, 'unit', e.target.value as UnitType)}
                      className="w-16 px-1 py-1 text-xs border border-slate-300 rounded bg-white text-center"
                    >
                      <option value="PCS">PCS</option>
                      <option value="BOX">BOX</option>
                      <option value="KGS">KGS</option>
                      <option value="LTR">LTR</option>
                      <option value="MTR">MTR</option>
                      <option value="SET">SET</option>
                      <option value="NOS">NOS</option>
                      <option value="DOZ">DOZ</option>
                      <option value="HRS">HRS</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </td>

                  {/* Rate */}
                  <td className="py-2.5 px-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={e => updateItemField(idx, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-20 px-1.5 py-1 text-xs text-right border border-slate-300 rounded font-semibold"
                    />
                  </td>

                  {/* Discount Flat */}
                  {!isQuickBillMode && (
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.discountAmount}
                        onChange={e => updateItemField(idx, 'discountAmount', parseFloat(e.target.value) || 0)}
                        className="w-16 px-1 py-1 text-xs text-right border border-slate-300 rounded text-slate-600"
                      />
                    </td>
                  )}

                  {/* Taxable Value */}
                  <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800">
                    ₹{item.taxableValue.toFixed(2)}
                  </td>

                  {/* GST Rate */}
                  {!isQuickBillMode && (
                    <td className="py-2.5 px-2 text-center">
                      <select
                        value={item.gstRate}
                        onChange={e => updateItemField(idx, 'gstRate', parseFloat(e.target.value) || 0)}
                        className="px-1 py-1 text-xs border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>
                  )}

                  {/* Total Tax */}
                  {!isQuickBillMode && (
                    <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-700">
                      <div>₹{item.totalTax.toFixed(2)}</div>
                      <div className="text-[9px] text-slate-400">
                        {supplyType === 'INTRA_STATE'
                          ? `C:${item.cgstAmount.toFixed(1)} S:${item.sgstAmount.toFixed(1)}`
                          : `I:${item.igstAmount.toFixed(1)}`}
                      </div>
                    </td>
                  )}

                  {/* Line Total */}
                  <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                    ₹{item.totalAmount.toFixed(2)}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-2 text-center space-x-1">
                    <button
                      type="button"
                      onClick={() => duplicateItem(idx)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title="Duplicate row"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1 text-red-400 hover:text-red-700"
                      title="Delete row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 3: Transparent Tax Breakdown & Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transparent Calculation Breakdown ("How was this calculated?") */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Calculator className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Deterministic Tax Calculation Audit
            </h3>
          </div>

          <div className="text-xs space-y-2 text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Gross Product Value (Qty × Rate):</span>
              <span className="font-mono font-semibold text-slate-900">₹{totals.grossAmount.toFixed(2)}</span>
            </div>
            {!isQuickBillMode && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Total Item Discounts Applied:</span>
                <span className="font-mono text-emerald-700">- ₹{totals.totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-100 font-semibold text-slate-900">
              <span>Net Taxable Value:</span>
              <span className="font-mono">₹{totals.taxableValue.toFixed(2)}</span>
            </div>

            {/* Rate-wise tax slabs */}
            {!isQuickBillMode && <div className="pt-2">
              <span className="font-semibold text-[11px] text-slate-700 uppercase tracking-wider block mb-1">
                Rate Slabs Applied:
              </span>
              <div className="space-y-1">
                {totals.taxBreakdowns.map((tb, idx) => (
                  <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 flex justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-slate-800">GST @ {tb.gstRate}%</span>
                      <span className="text-slate-500 ml-2">(Taxable: ₹{tb.taxableValue.toFixed(2)})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {supplyType === 'INTRA_STATE'
                        ? `CGST ₹${tb.cgstAmount.toFixed(2)} + SGST ₹${tb.sgstAmount.toFixed(2)}`
                        : `IGST ₹${tb.igstAmount.toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>}

            {/* Statutory advisory reminder */}
            <div className="text-[11px] text-slate-500 pt-2 flex items-start space-x-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Calculated deterministically using fixed-precision decimal arithmetic. No LLM or estimation used for numbers.
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Summary Box */}
        <div className="bg-slate-900 text-white rounded-xl shadow-md p-5 space-y-4">
          <h3 className="font-bold text-sm tracking-wide text-emerald-400 uppercase">
            Grand Total Summary
          </h3>

          <div className="space-y-2 text-xs border-b border-slate-800 pb-3">
            <div className="flex justify-between text-slate-300">
              <span>{isQuickBillMode ? 'Product Value:' : 'Total Taxable Amount:'}</span>
              <span className="font-mono text-sm">₹{totals.taxableValue.toFixed(2)}</span>
            </div>

            {!isQuickBillMode && (supplyType === 'INTRA_STATE' ? (
              <>
                <div className="flex justify-between text-slate-300">
                  <span>CGST (Central Tax):</span>
                  <span className="font-mono text-sm">₹{totals.cgstTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>SGST (State Tax):</span>
                  <span className="font-mono text-sm">₹{totals.sgstTotal.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-300">
                <span>IGST (Integrated Tax):</span>
                <span className="font-mono text-sm">₹{totals.igstTotal.toFixed(2)}</span>
              </div>
            ))}

            {!isQuickBillMode && totals.cessTotal > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>GST Cess:</span>
                <span className="font-mono text-sm">₹{totals.cessTotal.toFixed(2)}</span>
              </div>
            )}

            {!isQuickBillMode && <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Round Off Adjustment:</span>
              <span className="font-mono">{totals.roundOff >= 0 ? `+₹${totals.roundOff.toFixed(2)}` : `-₹${Math.abs(totals.roundOff).toFixed(2)}`}</span>
            </div>}
          </div>

          <div className="flex justify-between items-baseline pt-1">
            <span className="text-sm font-bold text-slate-200">Grand Total:</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              ₹{totals.grandTotal.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              onClick={handleSaveDraftClick}
              className="flex-1 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              Save Draft
            </button>
            <button
              onClick={handleProceedToIssue}
              className="flex-2 py-2.5 text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg transition shadow-md flex items-center justify-center space-x-1.5"
            >
              <FileText className="w-4 h-4 text-slate-950" />
              <span>Review & Issue Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Advisory HSN / Tax Suggestion Modal */}
      {hsnHelperOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Advisory HSN & GST Rate Candidate Helper
                </h3>
              </div>
              <button
                onClick={() => setHsnHelperOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Search official CBIC standard schedule or receive AI candidate suggestions for product classification.
            </p>

            <div className="flex space-x-2">
              <input
                type="text"
                value={hsnQuery}
                onChange={e => setHsnQuery(e.target.value)}
                placeholder="Product name or keyword (e.g. Copper wire, Laptop, Garment)..."
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
              />
              <button
                onClick={searchHsnSuggestions}
                disabled={hsnLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
              >
                {hsnLoading ? 'Searching...' : 'Find HSN'}
              </button>
            </div>

            {/* Results list */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {hsnSuggestions.length === 0 && !hsnLoading && (
                <div className="text-center py-6 text-xs text-slate-400">
                  Type a product name above and click "Find HSN"
                </div>
              )}

              {hsnSuggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-xl transition flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 max-w-[320px]">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        HSN {s.hsn}
                      </span>
                      <span className="font-bold text-indigo-700">{s.suggestedRate}% GST</span>
                      <span className="text-[10px] text-slate-400">({s.confidence} confidence)</span>
                    </div>
                    <p className="text-slate-600 font-medium text-[11px] truncate">{s.description}</p>
                    {s.notes && <p className="text-[10px] text-slate-400">{s.notes}</p>}
                  </div>

                  <button
                    onClick={() => applyHsnSuggestion(s)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px]"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[11px] text-amber-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Mandatory Tax Principle:</strong> AI suggestions are purely advisory. The business owner must verify the applicable HSN code and GST rate with official schedules before finalizing the invoice.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
