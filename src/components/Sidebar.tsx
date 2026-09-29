import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Zap, 
  Users, 
  Package, 
  CreditCard, 
  BarChart3, 
  Settings, 
  History, 
  X, 
  Building2,
  HelpCircle
} from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../locales/translations';

export type ActiveView = 
  | 'DASHBOARD'
  | 'INVOICES'
  | 'CREATE_INVOICE'
  | 'QUICK_BILL'
  | 'CUSTOMERS'
  | 'PRODUCTS'
  | 'PAYMENTS'
  | 'REPORTS'
  | 'SETTINGS'
  | 'AUDIT_LOG';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currentLang: Language;
  isOpen: boolean;
  onClose: () => void;
  invoiceCount: number;
  customerCount: number;
  productCount: number;
  onOpenAssistant?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  currentLang,
  isOpen,
  onClose,
  invoiceCount,
  customerCount,
  productCount,
  onOpenAssistant,
}) => {
  const t = TRANSLATIONS[currentLang];

  const navItems = [
    { id: 'DASHBOARD', label: t.dashboard, icon: LayoutDashboard, count: undefined },
    { id: 'INVOICES', label: t.invoices, icon: FileText, count: invoiceCount },
    { id: 'CREATE_INVOICE', label: t.createInvoice, icon: PlusCircle, count: undefined, highlight: true },
    { id: 'QUICK_BILL', label: t.quickBill, icon: Zap, count: undefined },
    { id: 'CUSTOMERS', label: t.customers, icon: Users, count: customerCount },
    { id: 'PRODUCTS', label: t.products, icon: Package, count: productCount },
    { id: 'PAYMENTS', label: 'Payments', icon: CreditCard, count: undefined },
    { id: 'REPORTS', label: t.reports, icon: BarChart3, count: undefined },
    { id: 'SETTINGS', label: t.settings, icon: Settings, count: undefined },
    { id: 'AUDIT_LOG', label: t.auditTrail, icon: History, count: undefined },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[min(18rem,calc(100vw-2rem))] bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } print:hidden`}
      >
        {/* Mobile Header in sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 lg:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800 text-sm">{t.appName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as ActiveView);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : item.highlight
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : item.highlight ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-emerald-200 text-emerald-900 font-bold' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Gemini Copilot Card */}
        {onOpenAssistant && (
          <div className="p-3 border-t border-slate-200">
            <button
              onClick={() => {
                onOpenAssistant();
                onClose();
              }}
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-left shadow-xs hover:shadow-md transition group border border-indigo-900/50 flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Gemini Copilot</span>
                </div>
                <p className="text-[10px] text-indigo-200 leading-tight">
                  System Aware • Live Search
                </p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 group-hover:scale-105 transition-transform">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
              </div>
            </button>
          </div>
        )}

        {/* Bottom Trust & Compliance Notice */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>GST Compliance Assistant</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Rule v2026.1 • Taxable logic deterministic. Consult tax professional for official filing.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
