import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  HelpCircle,
  FileText,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Markdown from 'react-markdown';
import { BusinessProfile, Customer, Invoice, Language, Product } from '../types';

interface SmartAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  profile: BusinessProfile;
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  onNavigate?: (view: any) => void;
  onNewInvoice?: () => void;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  sources?: Array<{ title: string; url: string }>;
  searchQueries?: string[];
  usedSearch?: boolean;
}

export const SmartAssistantModal: React.FC<SmartAssistantModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  profile,
  invoices,
  customers,
  products,
  onNavigate,
  onNewInvoice,
}) => {
  const initialGreeting = currentLang === 'hi'
    ? `नमस्ते! मैं आपका **SmartBill Copilot** हूँ—एक सिस्टम-अवेयर AI सपोर्ट एजेंट।\n\n` +
      `मैं आपके लाइव बिजनेस डेटा (इनवॉइस, टैक्स, ग्राहक बकाया, स्टॉक) से जुड़ा हूँ और **Google Search Grounding** के ज़रिए ताज़ा GST काउंसिल निर्णयों, सरकारी नियमों और समाचारों की जानकारी दे सकता हूँ।\n\n` +
      `आप मुझसे क्या पूछना चाहते हैं?`
    : `Hello! I am your **SmartBill Copilot**—a context-aware AI support agent for your GST billing system.\n\n` +
      `I have real-time visibility into your business metrics, invoices, customers, and inventory. I am also equipped with **live Google Search grounding** to fact-check tax rules, retrieve recent GST Council decisions, and cite current statutory news.\n\n` +
      `How can I assist your business today?`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      role: 'model',
      text: initialGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enableSearch, setEnableSearch] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  // Derived business metrics for context
  const issuedInvoices = invoices.filter(i => i.status !== 'DRAFT' && i.status !== 'CANCELLED');
  const totalRevenue = issuedInvoices.reduce((sum, i) => sum + (i.totals?.grandTotal || 0), 0);
  const totalGst = issuedInvoices.reduce((sum, i) => sum + (i.totals?.totalTax || 0), 0);
  const totalCgst = issuedInvoices.reduce((sum, i) => sum + (i.totals?.cgstTotal || 0), 0);
  const totalSgst = issuedInvoices.reduce((sum, i) => sum + (i.totals?.sgstTotal || 0), 0);
  const totalIgst = issuedInvoices.reduce((sum, i) => sum + (i.totals?.igstTotal || 0), 0);
  const outstandingDues = invoices
    .filter(i => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID')
    .reduce((sum, i) => sum + (i.balanceDue !== undefined ? i.balanceDue : i.totals?.grandTotal || 0), 0);

  const unpaidInvoicesList = invoices
    .filter(i => (i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID') && (i.balanceDue === undefined || i.balanceDue > 0))
    .map(i => ({
      invoiceNumber: i.invoiceNumber,
      customerName: i.buyerDetails.name,
      totalAmount: i.totals?.grandTotal || 0,
      balanceAmount: i.balanceDue !== undefined ? i.balanceDue : i.totals?.grandTotal || 0,
      date: i.invoiceDate,
    }));

  const lowStockItems = products
    .filter(p => {
      const stock = p.currentStock ?? p.stockQuantity ?? p.stock ?? 0;
      const minStock = p.lowStockAlert ?? p.minStockAlert ?? p.minStock ?? 5;
      return stock <= minStock;
    })
    .map(p => {
      const stock = p.currentStock ?? p.stockQuantity ?? p.stock ?? 0;
      const minStock = p.lowStockAlert ?? p.minStockAlert ?? p.minStock ?? 5;
      return {
        name: p.name,
        sku: p.sku,
        stock,
        minStock,
        unit: p.unit,
        price: p.sellingPrice,
      };
    });

  const recentInvoicesList = invoices.slice(0, 5).map(i => ({
    invoiceNumber: i.invoiceNumber,
    customerName: i.buyerDetails.name,
    amount: i.totals?.grandTotal,
    status: i.status,
    date: i.invoiceDate,
  }));

  const systemContextSnapshot = {
    businessProfile: {
      businessName: profile.businessName,
      tradeName: profile.tradeName,
      gstin: profile.gstin,
      state: profile.state,
      stateCode: profile.stateCode,
      address: profile.address,
      city: profile.city,
      pincode: profile.pinCode,
      bankDetails: {
        bankName: profile.bankDetails?.bankName,
        accountNumber: profile.bankDetails?.accountNumber,
        ifsc: profile.bankDetails?.ifscCode,
        upiId: profile.upiId,
      },
    },
    metrics: {
      totalInvoices: invoices.length,
      issuedCount: issuedInvoices.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      outstandingDues: Math.round(outstandingDues * 100) / 100,
      paidCount: invoices.filter(i => i.status === 'PAID').length,
      partialCount: invoices.filter(i => i.status === 'PARTIALLY_PAID').length,
    },
    recentInvoices: recentInvoicesList,
    unpaidInvoices: unpaidInvoicesList,
    lowStockItems,
    customerCount: customers.length,
    productCount: products.length,
  };

  const quickPrompts = [
    { label: '📊 System Sales & Tax', query: 'What are my total sales, GST collected, and outstanding dues from current system data?' },
    { label: '⚠️ Unpaid Invoices', query: 'Which customers currently owe money and what are their pending balances?' },
    { label: '📦 Low Stock Alert', query: 'Are any catalog items below their minimum inventory reorder levels?' },
    { label: '🌐 Recent GST News', query: 'What are the key recent decisions, rate revisions, and news from the latest GST Council meeting?' },
    { label: '🔍 Fact-Check E-Way Bill', query: 'What is the current threshold and statutory mandatory limit for E-Way Bill generation in India?' },
    { label: '🛠️ Guide: Credit Note', query: 'Guide me step-by-step on how to issue a GST credit note when a buyer returns damaged goods.' },
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText !== undefined ? queryText : input).trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Keep up to last 10 messages for conversation context
    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    try {
      // Send conversation history with system context snapshot and search toggle
      const payload = {
        messages: updatedHistory.slice(-10).map(m => ({
          role: m.role,
          text: m.text,
        })),
        systemContext: systemContextSnapshot,
        enableSearch,
      };

      let data: any = null;
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          data = await res.json();
        } else {
          const errData = await res.json().catch(() => null);
          if (errData && errData.reply) {
            data = errData;
          }
        }
      } catch (fetchErr) {
        console.warn('Notice: Assistant fetch encountered network or connection issue, falling back to local dataset.', fetchErr);
      }

      if (data && data.reply) {
        const botMessage: ChatMessage = {
          id: `msg-${Date.now()}-b`,
          role: 'model',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: data.sources || [],
          searchQueries: data.searchQueries || [],
          usedSearch: Boolean(data.usedSearch),
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Fallback offline message using live local state
        const fallbackMessage: ChatMessage = {
          id: `msg-${Date.now()}-fallback`,
          role: 'model',
          text: `### 📊 Live System Data & Context Summary\n\n` +
            `- **Total Invoiced Revenue**: ₹${Math.round(totalRevenue).toLocaleString('en-IN')}\n` +
            `- **Total GST Collected**: ₹${Math.round(totalGst).toLocaleString('en-IN')}\n` +
            `- **Pending Receivables**: ₹${Math.round(outstandingDues).toLocaleString('en-IN')}\n` +
            `- **Unpaid Invoices**: ${unpaidInvoicesList.length}\n` +
            `- **Low Stock Items**: ${lowStockItems.length}\n\n` +
            `*Operating in local accounting intelligence mode.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          usedSearch: false,
        };
        setMessages(prev => [...prev, fallbackMessage]);
      }
    } catch (err: any) {
      console.warn('Smart assistant processing note:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `msg-${Date.now()}-reset`,
        role: 'model',
        text: currentLang === 'hi' 
          ? 'नया संवाद शुरू किया गया। आप अपने सिस्टम या लाइव GST सम्बन्धी किसी भी विषय पर पूछ सकते हैं।' 
          : 'Conversation thread refreshed. Ask me about your business numbers, GST regulations, or real-time news!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:hidden animate-in fade-in duration-150">
      <div 
        className={`bg-white rounded-2xl flex flex-col shadow-2xl border border-slate-200 transition-all duration-200 overflow-hidden ${
          isExpanded 
            ? 'w-full h-full max-w-5xl max-h-[92vh]' 
            : 'w-full max-w-2xl h-[660px] max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-xs">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                  SmartBill Copilot
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Gemini 3.8 Flash
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-300 flex items-center gap-2">
                <span>Context-Aware Assistant</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-300">
                  <Globe className="w-3 h-3" /> Live Google Search
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Live Search Toggle */}
            <button
              onClick={() => setEnableSearch(!enableSearch)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                enableSearch 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title={enableSearch ? "Google Search Grounding is ON" : "Google Search Grounding is OFF"}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
              <span className={`w-1.5 h-1.5 rounded-full ${enableSearch ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            </button>

            {/* Clear history */}
            <button
              onClick={handleClearHistory}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Reset conversation thread"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Maximize / Minimize */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition hidden sm:inline-flex"
              title={isExpanded ? "Collapse modal" : "Expand modal"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* System Context Pill / Drawer Header */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap py-0.5">
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              {profile.tradeName || profile.businessName || 'My Business'}
            </span>
            <span className="text-slate-300">•</span>
            <span>{invoices.length} Invoices</span>
            <span className="text-slate-300">•</span>
            <span className="font-medium text-emerald-700">₹{Math.round(totalRevenue).toLocaleString('en-IN')} Sales</span>
            <span className="text-slate-300">•</span>
            <span className={`font-medium ${outstandingDues > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
              ₹{Math.round(outstandingDues).toLocaleString('en-IN')} Due
            </span>
          </div>

          <button
            onClick={() => setShowContextDrawer(!showContextDrawer)}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 shrink-0 ml-2"
          >
            <span>Live System Data</span>
            {showContextDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable Live System Data Preview */}
        {showContextDrawer && (
          <div className="bg-indigo-50/70 border-b border-indigo-100 p-3 text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 animate-in slide-in-from-top-2 duration-150">
            <div className="bg-white p-2 rounded-lg border border-indigo-100 shadow-2xs">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Registered GSTIN</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5">{profile.gstin || 'Unregistered'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{profile.state} (Code: {profile.stateCode})</p>
            </div>
            <div className="bg-white p-2 rounded-lg border border-indigo-100 shadow-2xs">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Total GST Collected</p>
              <p className="font-bold text-emerald-700 mt-0.5">₹{Math.round(totalGst).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">CGST: ₹{Math.round(totalCgst).toLocaleString('en-IN')} | SGST: ₹{Math.round(totalSgst).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-2 rounded-lg border border-indigo-100 shadow-2xs">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Receivables & Dues</p>
              <p className="font-bold text-amber-700 mt-0.5">₹{Math.round(outstandingDues).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{unpaidInvoicesList.length} Pending Invoices</p>
            </div>
            <div className="bg-white p-2 rounded-lg border border-indigo-100 shadow-2xs">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Low Stock Inventory</p>
              <p className={`font-bold mt-0.5 ${lowStockItems.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {lowStockItems.length} Products
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{products.length} Total SKUs Tracked</p>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start space-x-2.5 text-xs ${
                  isUser ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble Container */}
                <div className="max-w-[85%] sm:max-w-[80%] flex flex-col space-y-1">
                  <div
                    className={`p-3.5 rounded-2xl leading-relaxed relative group ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-none shadow-xs'
                        : 'bg-white border border-slate-200/80 text-slate-800 shadow-xs rounded-tl-none'
                    }`}
                  >
                    {/* Google Search Grounding Badge */}
                    {!isUser && m.usedSearch && (
                      <div className="mb-2 pb-2 border-b border-slate-100 flex items-center justify-between text-[10px] text-emerald-700 font-medium">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Globe className="w-3 h-3 text-emerald-600" />
                          Grounded with Real-Time Google Search
                        </span>
                      </div>
                    )}

                    {/* Markdown Body */}
                    <div className={`prose prose-xs max-w-none break-words ${isUser ? 'prose-invert text-white' : 'text-slate-800'}`}>
                      <Markdown>{m.text}</Markdown>
                    </div>

                    {/* Search Queries info */}
                    {!isUser && m.searchQueries && m.searchQueries.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <Search className="w-2.5 h-2.5" /> Searches:
                        </span>
                        {m.searchQueries.map((query, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            "{query}"
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Search Sources Cards */}
                    {!isUser && m.sources && m.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified Web Sources ({m.sources.length}):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                          {m.sources.map((src, sIdx) => {
                            let hostname = '';
                            try {
                              hostname = new URL(src.url).hostname.replace('www.', '');
                            } catch {
                              hostname = 'web source';
                            }
                            return (
                              <a
                                key={sIdx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 transition text-[11px] group/src"
                              >
                                <div className="truncate pr-2">
                                  <p className="font-medium text-slate-700 group-hover/src:text-indigo-700 truncate">
                                    {src.title || hostname}
                                  </p>
                                  <p className="text-[9px] text-slate-400 truncate">
                                    {hostname}
                                  </p>
                                </div>
                                <ExternalLink className="w-3 h-3 text-slate-400 group-hover/src:text-indigo-600 shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Copy button */}
                    <button
                      onClick={() => handleCopy(m.text, m.id)}
                      className={`absolute top-2 right-2 p-1 rounded-md transition opacity-0 group-hover:opacity-100 ${
                        isUser 
                          ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Copy text"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <span className={`text-[10px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start space-x-2.5 text-xs">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-xs text-slate-600 flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                <span className="font-medium">
                  {enableSearch ? "Consulting system context & searching web..." : "Thinking with context..."}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Prompts */}
        <div className="p-2 bg-white border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto text-[11px] whitespace-nowrap shrink-0 scrollbar-none">
          <span className="text-slate-400 font-semibold px-1 flex items-center gap-1 shrink-0">
            <HelpCircle className="w-3 h-3" /> Suggested:
          </span>
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp.query)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 hover:border-indigo-200 transition shrink-0 active:scale-95"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end space-x-2"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Ask about sales, unpaid dues, stock, latest GST news, or fact-check rules..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="w-full px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none max-h-28"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Footer info & shortcuts */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 px-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Conversational Memory Active
              </span>
              <span>•</span>
              <span className="hidden sm:inline">Shift+Enter for new line</span>
            </div>

            <div className="flex items-center space-x-2">
              {onNewInvoice && (
                <button
                  onClick={() => {
                    onClose();
                    onNewInvoice();
                  }}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  + New Invoice
                </button>
              )}
              {onNavigate && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('REPORTS');
                  }}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  View Reports
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
