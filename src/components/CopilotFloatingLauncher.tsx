import React from 'react';
import { Sparkles, Globe, MessageSquare } from 'lucide-react';

interface CopilotFloatingLauncherProps {
  onOpen: () => void;
  outstandingCount?: number;
  lowStockCount?: number;
}

export const CopilotFloatingLauncher: React.FC<CopilotFloatingLauncherProps> = ({
  onOpen,
  outstandingCount = 0,
  lowStockCount = 0,
}) => {
  const hasAlerts = outstandingCount > 0 || lowStockCount > 0;

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden flex items-center space-x-2">
      <button
        onClick={onOpen}
        className="group relative flex items-center space-x-2.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl hover:shadow-2xl border border-slate-700/80 transition-all duration-200 active:scale-95"
        title="Open SmartBill Gemini Copilot with live Google Search"
      >
        <div className="relative">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center p-0.5">
            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          {hasAlerts && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-900 animate-pulse" />
          )}
        </div>

        <div className="flex flex-col text-left">
          <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1">
            Gemini Copilot
            <Globe className="w-2.5 h-2.5 text-emerald-400" />
          </span>
          <span className="text-[9px] text-slate-300">
            System & Live Search
          </span>
        </div>
      </button>
    </div>
  );
};
