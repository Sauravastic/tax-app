import React, { useState } from 'react';
import { 
  History, 
  Search, 
  ShieldCheck, 
  FileText, 
  CreditCard, 
  User, 
  Building2, 
  Ban,
  Clock
} from 'lucide-react';
import { AuditLog, Language } from '../types';
import { TRANSLATIONS } from '../locales/translations';

interface AuditLogViewProps {
  logs: AuditLog[];
  currentLang: Language;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [searchQuery, setSearchQuery] = useState('');

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filtered = sortedLogs.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    const performer = (l.performedBy || l.userName || '').toLowerCase();
    const id = (l.entityId || l.recordIdentifier || l.recordId || '').toLowerCase();
    return (
      !q ||
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      performer.includes(q) ||
      id.includes(q)
    );
  });

  const getActionBadge = (action: string) => {
    if (action.includes('CANCEL')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">CANCELLED</span>;
    }
    if (action.includes('PAYMENT')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">PAYMENT</span>;
    }
    if (action.includes('ISSUED')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">ISSUED</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{action}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              {t.auditTrail} ({filtered.length} Events)
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tamper Evident</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all invoice issuance, payments, edits, and cancellations for GST audits
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, details, invoice ID, user..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Entity Type</th>
                <th className="py-3 px-3">Details</th>
                <th className="py-3 px-3">Actor / User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getActionBadge(l.action)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 text-[11px]">
                      {l.entityType || l.recordType}
                    </td>
                    <td className="py-3 px-3 text-slate-800 text-xs">
                      {l.details}
                      {(l.entityId || l.recordIdentifier) && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Ref: {l.entityId || l.recordIdentifier}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-xs whitespace-nowrap">
                      {l.performedBy || l.userName || 'Admin'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
