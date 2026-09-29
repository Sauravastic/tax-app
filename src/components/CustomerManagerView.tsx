import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { Customer, CustomerType, Language } from '../types';
import { INDIAN_STATES, validateGSTIN, getStateByCode } from '../services/gstinValidator';
import { TRANSLATIONS } from '../locales/translations';

interface CustomerManagerViewProps {
  customers: Customer[];
  currentLang: Language;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export const CustomerManagerView: React.FC<CustomerManagerViewProps> = ({
  customers,
  currentLang,
  onSaveCustomer,
  onDeleteCustomer,
}) => {
  const t = TRANSLATIONS[currentLang];

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('B2B_REGISTERED');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('07');
  const [pinCode, setPinCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstinCheckMsg, setGstinCheckMsg] = useState<{ isValid: boolean; msg: string } | null>(null);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setBusinessName('');
    setCustomerType('B2B_REGISTERED');
    setGstin('');
    setPan('');
    setAddress('');
    setCity('');
    setStateCode('07');
    setPinCode('');
    setPhone('');
    setEmail('');
    setGstinCheckMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setBusinessName(c.businessName || '');
    setCustomerType(c.customerType);
    setGstin(c.gstin || '');
    setPan(c.pan || '');
    setAddress(c.address || '');
    setCity(c.city || '');
    setStateCode(c.stateCode || '07');
    setPinCode(c.pinCode || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setGstinCheckMsg(null);
    setModalOpen(true);
  };

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setGstin(clean);
    if (clean.length === 15) {
      const res = validateGSTIN(clean);
      setGstinCheckMsg({ isValid: res.isValid, msg: res.message });
      if (res.isValid && res.stateCode) {
        setStateCode(res.stateCode);
        if (res.pan) setPan(res.pan);
      }
    } else {
      setGstinCheckMsg(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Customer name is required.');
      return;
    }

    if (customerType === 'B2B_REGISTERED' && gstin.trim()) {
      const check = validateGSTIN(gstin);
      if (!check.isValid) {
        if (!confirm(`Warning: GSTIN format appears invalid (${check.message}). Proceed anyway?`)) {
          return;
        }
      }
    }

    const stateObj = getStateByCode(stateCode);
    const updated: Customer = {
      id: editingCustomer?.id || `cust_${Date.now()}`,
      businessId: editingCustomer?.businessId || 'biz_default_01',
      name: name.trim(),
      businessName: businessName.trim(),
      customerType,
      gstin: gstin.trim(),
      pan: pan.trim(),
      address: address.trim(),
      city: city.trim(),
      state: stateObj?.name || 'Delhi',
      stateCode,
      pinCode: pinCode.trim(),
      phone: phone.trim(),
      email: email.trim(),
      totalInvoiced: editingCustomer?.totalInvoiced || 0,
      totalPaid: editingCustomer?.totalPaid || 0,
      outstandingBalance: editingCustomer?.outstandingBalance || 0,
      createdAt: editingCustomer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };

    onSaveCustomer(updated);
    setModalOpen(false);
  };

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const customerName = c.name || '';
    const customerBusinessName = c.businessName || '';
    const customerGstin = c.gstin || '';
    const customerPhone = c.phone || '';
    return (
      !q ||
      customerName.toLowerCase().includes(q) ||
      customerBusinessName.toLowerCase().includes(q) ||
      customerGstin.toLowerCase().includes(q) ||
      customerPhone.includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {t.customers} ({filtered.length})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage GST registered buyers & retail consumer profiles
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, trade name, GSTIN, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div
            key={c.id}
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between space-y-3 hover:border-emerald-300 transition"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                  {c.businessName && (
                    <div className="text-xs font-medium text-slate-600 flex items-center space-x-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>{c.businessName}</span>
                    </div>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  c.customerType === 'B2B_REGISTERED'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {c.customerType === 'B2B_REGISTERED' ? 'B2B Registered' : 'Consumer'}
                </span>
              </div>

              <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                {c.gstin && (
                  <div className="font-mono text-[11px] font-bold text-slate-800">
                    GSTIN: {c.gstin}
                  </div>
                )}
                <div className="flex items-center space-x-1 text-[11px]">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{c.city || 'Delhi'}, {c.state} ({c.stateCode})</span>
                </div>
                {c.phone && (
                  <div className="flex items-center space-x-1 text-[11px]">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial History Summary */}
            <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Invoiced</span>
                <span className="font-bold text-slate-800">₹{Number(c.totalInvoiced || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Balance Due</span>
                <span className={`font-bold ${Number(c.outstandingBalance || 0) > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                  ₹{Number(c.outstandingBalance || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 pt-2 flex items-center justify-end space-x-2">
              <button
                onClick={() => openEditModal(c)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                title="Edit Customer"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to remove customer "${c.name}"?`)) {
                    onDeleteCustomer(c.id);
                  }
                }}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                title="Delete Customer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-xs sm:p-4">
          <div className="mobile-dialog w-full max-w-lg space-y-4 rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <h3 className="font-bold text-slate-900 text-base">
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerType('B2B_REGISTERED')}
                    className={`py-2 px-3 rounded-lg border font-bold text-center transition ${
                      customerType === 'B2B_REGISTERED'
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    B2B Registered
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('CONSUMER')}
                    className={`py-2 px-3 rounded-lg border font-bold text-center transition ${
                      customerType === 'CONSUMER'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    Consumer / B2C
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer / Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Verma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Trade / Business Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verma Constructions & Interiors"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              {customerType === 'B2B_REGISTERED' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    GSTIN (15 Characters) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    value={gstin}
                    onChange={e => handleGstinChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-bold"
                  />
                  {gstinCheckMsg && (
                    <p className={`mt-1 text-[11px] font-medium ${gstinCheckMsg.isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                      {gstinCheckMsg.msg}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State <span className="text-red-500">*</span></label>
                  <select
                    value={stateCode}
                    onChange={e => setStateCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. New Delhi"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registered Address</label>
                <input
                  type="text"
                  placeholder="Plot/Shop, Street, Area"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 Mobile"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    placeholder="PIN Code"
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
