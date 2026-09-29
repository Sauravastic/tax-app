import React, { useState, useEffect } from 'react';
import { 
  Navbar 
} from './components/Navbar';
import { 
  Sidebar, 
  ActiveView 
} from './components/Sidebar';
import { 
  DashboardView 
} from './components/DashboardView';
import { 
  InvoiceBuilder 
} from './components/InvoiceBuilder';
import { 
  InvoicePreviewModal 
} from './components/InvoicePreviewModal';
import { 
  InvoiceHistoryView 
} from './components/InvoiceHistoryView';
import { 
  CustomerManagerView 
} from './components/CustomerManagerView';
import { 
  ProductManagerView 
} from './components/ProductManagerView';
import { 
  PaymentsView 
} from './components/PaymentsView';
import { 
  GSTReportView 
} from './components/GSTReportView';
import { 
  BusinessSettingsView 
} from './components/BusinessSettingsView';
import { 
  AuditLogView 
} from './components/AuditLogView';
import { 
  SmartAssistantModal 
} from './components/SmartAssistantModal';
import { 
  CopilotFloatingLauncher 
} from './components/CopilotFloatingLauncher';
import { LoginView } from './components/LoginView';

import { 
  Invoice, 
  Customer, 
  Product, 
  BusinessProfile, 
  Payment, 
  AuditLog, 
  Language,
  StockAdjustmentType,
  InventoryLog 
} from './types';
import { StorageService, UserSession } from './services/storage';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // 1. Language state
  const [currentLang, setCurrentLang] = useState<Language>('en');

  // 2. Navigation & Sidebar state
  const [activeView, setActiveView] = useState<ActiveView>('DASHBOARD');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 3. Application Data State
  const [profile, setProfile] = useState<BusinessProfile>(StorageService.getBusinessProfile());
  const [invoices, setInvoices] = useState<Invoice[]>(StorageService.getInvoices());
  const [customers, setCustomers] = useState<Customer[]>(StorageService.getCustomers());
  const [products, setProducts] = useState<Product[]>(StorageService.getProducts());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(StorageService.getAuditLogs());

  // 4. Modal States
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);

  // Refresh data from storage
  const refreshAllData = () => {
    setProfile(StorageService.getBusinessProfile());
    setInvoices(StorageService.getInvoices());
    setCustomers(StorageService.getCustomers());
    setProducts(StorageService.getProducts());
    setAuditLogs(StorageService.getAuditLogs());
  };

  useEffect(() => {
    fetch('/api/auth/session')
      .then(response => response.ok ? response.json() : { user: null })
      .then(result => setUser(result.user as UserSession | null))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  // Keep customer balance & invoice records in sync
  useEffect(() => {
    if (!user) return;
    StorageService.syncAllCustomerBalances();
    refreshAllData();

    fetch('/api/customers')
      .then(response => {
        if (!response.ok) throw new Error(`Customer load failed (${response.status})`);
        return response.json() as Promise<Customer[]>;
      })
      .then(remoteCustomers => {
        if (remoteCustomers.length > 0) {
          localStorage.setItem('gst_smartbill_customers', JSON.stringify(remoteCustomers));
          setCustomers(remoteCustomers);
        }
      })
      .catch(error => console.error('Customer database load failed', error));
  }, [user]);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">Loading secure session...</div>;
  }

  if (!user) {
    return <LoginView onLogin={setUser} />;
  }

  // Invoice Handlers
  const handleSaveDraft = (draftInvoice: Invoice) => {
    draftInvoice.status = 'DRAFT';
    StorageService.saveInvoice(draftInvoice);
    StorageService.addAuditLog({
      action: 'INVOICE_SAVED_AS_DRAFT',
      entityType: 'INVOICE',
      entityId: draftInvoice.id,
      details: `Saved draft invoice ${draftInvoice.invoiceNumber} for ${draftInvoice.buyerDetails.name} (₹${draftInvoice.totals.grandTotal})`,
      performedBy: 'User / Owner',
    });
    refreshAllData();
    setActiveView('INVOICES');
  };

  const handlePreviewAndIssue = (invoice: Invoice) => {
    // Temporarily set as selected invoice for inspection & confirmation
    setSelectedInvoice(invoice);
    setPreviewModalOpen(true);
  };

  const handleIssueInvoice = (invoiceId: string) => {
    let inv = invoices.find(i => i.id === invoiceId);
    if (!inv && selectedInvoice?.id === invoiceId) {
      inv = selectedInvoice;
    }
    if (!inv) return;

    inv.status = 'ISSUED';
    inv.updatedAt = new Date().toISOString();

    StorageService.saveInvoice(inv);
    StorageService.addAuditLog({
      action: 'INVOICE_ISSUED',
      entityType: 'INVOICE',
      entityId: inv.id,
      details: `Officially issued GST Tax Invoice ${inv.invoiceNumber} to ${inv.buyerDetails.name} for ₹${inv.totals.grandTotal} (Tax: ₹${inv.totals.totalTax})`,
      performedBy: 'User / Owner',
    });

    StorageService.syncAllCustomerBalances();
    refreshAllData();
    setSelectedInvoice({ ...inv });
  };

  const handleCancelInvoice = (invoiceId: string, reason: string) => {
    const updated = StorageService.cancelInvoice(invoiceId, reason);
    if (updated) {
      refreshAllData();
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(updated);
      }
    }
  };

  // Payment Handlers
  const handleRecordPayment = (payment: Payment) => {
    StorageService.savePayment(payment);
    refreshAllData();
    // Update active invoice preview if open
    if (selectedInvoice && selectedInvoice.id === payment.invoiceId) {
      const refreshed = StorageService.getInvoices().find(i => i.id === selectedInvoice.id);
      if (refreshed) setSelectedInvoice(refreshed);
    }
  };

  const handleOpenPaymentForInvoice = (invoice: Invoice) => {
    setActiveView('PAYMENTS');
  };

  // Customer & Product Handlers
  const handleSaveCustomer = (cust: Customer) => {
    StorageService.saveCustomer(cust);
    refreshAllData();
  };

  const handleDeleteCustomer = (id: string) => {
    StorageService.deleteCustomer(id);
    refreshAllData();
  };

  const handleSaveProduct = (prod: Product) => {
    StorageService.saveProduct(prod);
    refreshAllData();
  };

  const handleDeleteProduct = (id: string) => {
    StorageService.deleteProduct(id);
    refreshAllData();
  };

  const handleBulkDeleteProducts = (ids: string[]) => {
    StorageService.bulkDeleteProducts(ids);
    refreshAllData();
  };

  const handleAdjustStock = (
    productId: string,
    quantityChange: number,
    adjustmentType: StockAdjustmentType,
    reason: string,
    notes?: string
  ) => {
    StorageService.adjustStock(productId, quantityChange, adjustmentType, reason, notes);
    refreshAllData();
  };

  const handleClearStock = (productId: string, reason: string, notes?: string) => {
    StorageService.clearProductStock(productId, reason, notes);
    refreshAllData();
  };

  const handleSaveProfile = (newProfile: BusinessProfile) => {
    StorageService.saveBusinessProfile(newProfile);
    refreshAllData();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        profile={profile}
        onNewInvoice={() => {
          setInvoiceToEdit(null);
          setActiveView('CREATE_INVOICE');
        }}
        onQuickBill={() => {
          setInvoiceToEdit(null);
          setActiveView('QUICK_BILL');
        }}
        onOpenAssistant={() => setAssistantModalOpen(true)}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        user={user}
        onLogout={() => {
          void fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
            StorageService.logout();
            setUser(null);
          });
        }}
      />

      {/* Main Body with Sidebar + Content View */}
      <div className="flex-1 flex min-h-0">
        {/* Navigation Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={view => {
            setActiveView(view);
          }}
          currentLang={currentLang}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          invoiceCount={invoices.length}
          customerCount={customers.length}
          productCount={products.length}
          onOpenAssistant={() => setAssistantModalOpen(true)}
        />

        {/* Dynamic Main View Area */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8">
          {activeView === 'DASHBOARD' && (
            <DashboardView
              invoices={invoices}
              customers={customers}
              products={products}
              currentLang={currentLang}
              onNewInvoice={() => {
                setInvoiceToEdit(null);
                setActiveView('CREATE_INVOICE');
              }}
              onQuickBill={() => {
                setInvoiceToEdit(null);
                setActiveView('QUICK_BILL');
              }}
              onAddCustomer={() => setActiveView('CUSTOMERS')}
              onAddProduct={() => setActiveView('PRODUCTS')}
              onViewInvoices={() => setActiveView('INVOICES')}
              onViewReports={() => setActiveView('REPORTS')}
              onSelectInvoice={inv => {
                setSelectedInvoice(inv);
                setPreviewModalOpen(true);
              }}
              onRecordPayment={handleOpenPaymentForInvoice}
            />
          )}

          {activeView === 'CREATE_INVOICE' && (
            <InvoiceBuilder
              initialInvoice={invoiceToEdit}
              profile={profile}
              customers={customers}
              products={products}
              currentLang={currentLang}
              existingInvoices={invoices}
              isQuickBillMode={false}
              onSaveDraft={handleSaveDraft}
              onPreviewAndIssue={handlePreviewAndIssue}
              onCancel={() => setActiveView('INVOICES')}
            />
          )}

          {activeView === 'QUICK_BILL' && (
            <InvoiceBuilder
              initialInvoice={null}
              profile={profile}
              customers={customers}
              products={products}
              currentLang={currentLang}
              existingInvoices={invoices}
              isQuickBillMode={true}
              onSaveDraft={handleSaveDraft}
              onPreviewAndIssue={handlePreviewAndIssue}
              onCancel={() => setActiveView('DASHBOARD')}
            />
          )}

          {activeView === 'INVOICES' && (
            <InvoiceHistoryView
              invoices={invoices}
              currentLang={currentLang}
              onSelectInvoice={inv => {
                setSelectedInvoice(inv);
                setPreviewModalOpen(true);
              }}
              onNewInvoice={() => {
                setInvoiceToEdit(null);
                setActiveView('CREATE_INVOICE');
              }}
              onRecordPayment={handleOpenPaymentForInvoice}
            />
          )}

          {activeView === 'CUSTOMERS' && (
            <CustomerManagerView
              customers={customers}
              currentLang={currentLang}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeView === 'PRODUCTS' && (
            <ProductManagerView
              products={products}
              currentLang={currentLang}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onBulkDeleteProducts={handleBulkDeleteProducts}
              onAdjustStock={handleAdjustStock}
              onClearStock={handleClearStock}
              inventoryLogs={StorageService.getInventoryLogs()}
            />
          )}

          {activeView === 'PAYMENTS' && (
            <PaymentsView
              invoices={invoices}
              currentLang={currentLang}
              onRecordPayment={handleRecordPayment}
            />
          )}

          {activeView === 'REPORTS' && (
            <GSTReportView
              invoices={invoices}
              currentLang={currentLang}
            />
          )}

          {activeView === 'SETTINGS' && (
            <BusinessSettingsView
              profile={profile}
              currentLang={currentLang}
              onSaveProfile={handleSaveProfile}
            />
          )}

          {activeView === 'AUDIT_LOG' && (
            <AuditLogView
              logs={auditLogs}
              currentLang={currentLang}
            />
          )}
        </main>
      </div>

      {/* Tax Invoice Preview & Print Modal */}
      {selectedInvoice && (
        <InvoicePreviewModal
          invoice={selectedInvoice}
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          onIssueInvoice={handleIssueInvoice}
          onRecordPayment={handleOpenPaymentForInvoice}
          onCancelInvoice={handleCancelInvoice}
        />
      )}

      {/* Advisory & Context-Aware Gemini Copilot with Google Search Grounding */}
      <SmartAssistantModal
        isOpen={assistantModalOpen}
        onClose={() => setAssistantModalOpen(false)}
        currentLang={currentLang}
        profile={profile}
        invoices={invoices}
        customers={customers}
        products={products}
        onNavigate={view => setActiveView(view)}
        onNewInvoice={() => {
          setInvoiceToEdit(null);
          setActiveView('CREATE_INVOICE');
        }}
      />

      {/* Floating Gemini Copilot Launcher */}
      <CopilotFloatingLauncher
        onOpen={() => setAssistantModalOpen(true)}
        outstandingCount={invoices.filter(i => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID').length}
        lowStockCount={products.filter(p => (p.currentStock ?? p.stockQuantity ?? p.stock ?? 0) <= (p.lowStockAlert ?? p.minStockAlert ?? p.minStock ?? 5)).length}
      />
    </div>
  );
}
