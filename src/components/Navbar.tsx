import React from 'react';
import { 
  FileText, 
  Plus, 
  Zap, 
  Globe, 
  ShieldCheck, 
  Building2, 
  Sparkles,
  Menu,
  LogOut
} from 'lucide-react';
import { BusinessProfile, Language } from '../types';
import { UserSession } from '../services/storage';
import { TRANSLATIONS } from '../locales/translations';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  profile: BusinessProfile;
  onNewInvoice: () => void;
  onQuickBill: () => void;
  onOpenAssistant: () => void;
  onToggleSidebar: () => void;
  user: UserSession;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  profile,
  onNewInvoice,
  onQuickBill,
  onOpenAssistant,
  onToggleSidebar,
  user,
  onLogout,
}) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs print:hidden">
      <div className="px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center justify-between gap-2 py-2 sm:h-16 sm:py-0">
          {/* Left: Mobile Toggle & Brand */}
          <div className="flex min-w-0 items-center space-x-2 sm:space-x-3">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex min-w-0 items-center space-x-2">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-xs sm:w-9 sm:h-9">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex min-w-0 items-center space-x-2">
                  <span className="max-w-[9rem] truncate text-sm font-bold text-slate-900 tracking-tight sm:max-w-none sm:text-lg">
                    {t.appName}
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    GST Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden md:block">
                  {profile.tradeName || profile.businessName} • GSTIN: {profile.gstin || 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex shrink-0 items-center space-x-1 sm:space-x-3">
            {/* Gemini Copilot Assistant with Live Search badge */}
            <button
              onClick={onOpenAssistant}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-indigo-100 px-2 py-2 text-xs font-semibold text-indigo-900 shadow-2xs transition hover:from-indigo-100 hover:to-indigo-200 group sm:px-3 sm:py-1.5"
              title="Open Gemini Copilot with live Google Search & System Awareness"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 group-hover:rotate-12 transition-transform" />
              <span className="hidden md:inline">Gemini Copilot</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </button>

            {/* Language Switcher */}
            <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 sm:flex">
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  currentLang === 'en'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => onLanguageChange('hi')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  currentLang === 'hi'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* Quick Bill Button */}
            <button
              onClick={onQuickBill}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-amber-300 bg-amber-100 px-2 py-2 text-xs font-medium text-amber-800 shadow-xs transition hover:bg-amber-200 sm:px-3 sm:py-2"
            >
              <Zap className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">{t.quickBill}</span>
            </button>

            {/* New Invoice Button */}
            <button
              onClick={onNewInvoice}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-98 sm:px-3.5 sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t.createInvoice}</span>
            </button>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 sm:px-3"
              title={`Sign out ${user.name}`}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
