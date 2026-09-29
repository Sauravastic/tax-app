import React, { useState } from 'react';
import { 
  Building2, 
  Save, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Hash
} from 'lucide-react';
import { BusinessProfile, BusinessType, Language } from '../types';
import { INDIAN_STATES, validateGSTIN, getStateByCode } from '../services/gstinValidator';
import { TRANSLATIONS } from '../locales/translations';

interface BusinessSettingsViewProps {
  profile: BusinessProfile;
  currentLang: Language;
  onSaveProfile: (profile: BusinessProfile) => void;
}

export const BusinessSettingsView: React.FC<BusinessSettingsViewProps> = ({
  profile,
  currentLang,
  onSaveProfile,
}) => {
  const t = TRANSLATIONS[currentLang];

  const [businessName, setBusinessName] = useState(profile.businessName);
  const [legalName, setLegalName] = useState(profile.legalName || '');
  const [tradeName, setTradeName] = useState(profile.tradeName || '');
  const [gstin, setGstin] = useState(profile.gstin || '');
  const [pan, setPan] = useState(profile.pan || '');
  const [businessType, setBusinessType] = useState(profile.businessType || 'Proprietorship');
  const [address, setAddress] = useState(profile.address || '');
  const [city, setCity] = useState(profile.city || '');
  const [stateCode, setStateCode] = useState(profile.stateCode || '07');
  const [pinCode, setPinCode] = useState(profile.pinCode || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [email, setEmail] = useState(profile.email || '');

  // Bank
  const [bankName, setBankName] = useState(profile.bankDetails.bankName || '');
  const [accountNumber, setAccountNumber] = useState(profile.bankDetails.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(profile.bankDetails.ifscCode || '');
  const [branchName, setBranchName] = useState(profile.bankDetails.branchName || '');
  const [accountHolderName, setAccountHolderName] = useState(profile.bankDetails.accountHolderName || '');
  const [upiId, setUpiId] = useState(profile.upiId || '');

  // Invoicing config
  const [invoicePrefix, setInvoicePrefix] = useState(profile.invoicePrefix || 'INV-');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(profile.nextInvoiceNumber || 1001);
  const [financialYear, setFinancialYear] = useState(profile.financialYear || '2026-27');
  const [termsText, setTermsText] = useState((profile.termsAndConditions || []).join('\n'));

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setGstin(clean);
    if (clean.length === 15) {
      const res = validateGSTIN(clean);
      if (res.isValid) {
        if (res.stateCode) setStateCode(res.stateCode);
        if (res.pan) setPan(res.pan);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      alert('Business name is required.');
      return;
    }

    if (gstin.trim()) {
      const check = validateGSTIN(gstin);
      if (!check.isValid) {
        if (!confirm(`Warning: GSTIN format appears invalid (${check.message}). Save anyway?`)) {
          return;
        }
      }
    }

    const stateObj = getStateByCode(stateCode);
    const updated: BusinessProfile = {
      ...profile,
      businessName: businessName.trim(),
      legalName: legalName.trim(),
      tradeName: tradeName.trim() || businessName.trim(),
      gstin: gstin.trim().toUpperCase(),
      pan: pan.trim().toUpperCase(),
      businessType,
      address: address.trim(),
      city: city.trim(),
      state: stateObj?.name || 'Delhi',
      stateCode,
      pinCode: pinCode.trim(),
      phone: phone.trim(),
      email: email.trim(),
      bankDetails: {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        branchName: branchName.trim(),
        accountHolderName: accountHolderName.trim() || businessName.trim(),
      },
      upiId: upiId.trim(),
      invoicePrefix: invoicePrefix.trim().toUpperCase(),
      nextInvoiceNumber: Number(nextInvoiceNumber) || 1001,
      financialYear: financialYear.trim(),
      termsAndConditions: termsText.split('\n').filter(t => t.trim().length > 0),
      updatedAt: new Date().toISOString(),
    };

    onSaveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {t.settings || 'Business Profile'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure legal entity, tax identifiers, banking details, and invoice series
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile Saved Successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Legal Entity & GST Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-900 text-sm">Entity & Tax Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Trade Name (Display on Invoices)
              </label>
              <input
                type="text"
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                placeholder="e.g. Sharma Electricals & Hardware"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Legal Entity Name (As per PAN / GST Registration)
              </label>
              <input
                type="text"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder="e.g. Sharma Electricals Pvt Ltd"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Business Structure / Constitution
              </label>
              <select
                value={businessType}
                onChange={e => setBusinessType(e.target.value as BusinessType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
              >
                <option value="Proprietorship">Proprietorship</option>
                <option value="Partnership">Partnership Firm</option>
                <option value="Private Limited">Private Limited Company</option>
                <option value="LLP">Limited Liability Partnership (LLP)</option>
                <option value="Public Limited">Public Limited Company</option>
                <option value="Individual">Individual / Freelancer</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                GSTIN (15 Characters) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={gstin}
                onChange={e => handleGstinChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                State code & PAN auto-extracted from valid GSTIN
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Income Tax PAN (10 Characters) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={pan}
                onChange={e => setPan(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* 2. Registered Principal Place of Business */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Principal Place of Business & Contact
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Registered Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Shop / Office No, Building, Road, Area"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                State & State Code <span className="text-red-500">*</span>
              </label>
              <select
                value={stateCode}
                onChange={e => setStateCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white font-medium"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                City & PIN Code <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-2/3 px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
                <input
                  type="text"
                  required
                  placeholder="PIN"
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value)}
                  className="w-1/3 px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Business Phone / Mobile
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Business Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* 3. Bank Accounts & UPI Payment QR Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-900 text-sm">
              Bank Account Details & UPI QR Code
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. State Bank of India"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                placeholder="As per passbook"
                value={accountHolderName}
                onChange={e => setAccountHolderName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                placeholder="Account number"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                IFSC Code & Branch
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="IFSC (e.g. SBIN0001234)"
                  value={ifscCode}
                  onChange={e => setIfscCode(e.target.value.toUpperCase())}
                  className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold"
                />
                <input
                  type="text"
                  placeholder="Branch name"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Virtual Payment Address / UPI ID (Generates On-Invoice Payment QR)
              </label>
              <input
                type="text"
                placeholder="e.g. sharmaelectricals@sbi or 9876543210@paytm"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold text-emerald-800"
              />
            </div>
          </div>
        </div>

        {/* 4. Invoicing Series & Terms */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Hash className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-900 text-sm">
              Invoice Series & Terms & Conditions
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={e => setInvoicePrefix(e.target.value)}
                placeholder="e.g. INV-"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Next Starting Sequence Number
              </label>
              <input
                type="number"
                value={nextInvoiceNumber}
                onChange={e => setNextInvoiceNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Active Financial Year
              </label>
              <input
                type="text"
                value={financialYear}
                onChange={e => setFinancialYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">
                Standard Invoice Terms & Conditions (One per line)
              </label>
              <textarea
                rows={4}
                value={termsText}
                onChange={e => setTermsText(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-hidden text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
