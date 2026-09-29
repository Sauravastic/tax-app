import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Tag, 
  AlertTriangle, 
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Download,
  CheckSquare,
  Square,
  Minus,
  Layers,
  Boxes,
  Info,
  X,
  ShieldAlert,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Product, UnitType, Language, StockAdjustmentType, InventoryLog } from '../types';
import { CURRENT_TAX_RULE } from '../services/taxRuleDatabase';
import { TRANSLATIONS } from '../locales/translations';
import { StorageService } from '../services/storage';

interface ProductManagerViewProps {
  products: Product[];
  currentLang: Language;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onBulkDeleteProducts?: (ids: string[]) => void;
  onAdjustStock?: (
    productId: string,
    quantityChange: number,
    adjustmentType: StockAdjustmentType,
    reason: string,
    notes?: string
  ) => void;
  onClearStock?: (productId: string, reason: string, notes?: string) => void;
  inventoryLogs?: InventoryLog[];
}

export const ProductManagerView: React.FC<ProductManagerViewProps> = ({
  products,
  currentLang,
  onSaveProduct,
  onDeleteProduct,
  onBulkDeleteProducts,
  onAdjustStock,
  onClearStock,
  inventoryLogs: propInventoryLogs,
}) => {
  const t = TRANSLATIONS[currentLang];

  // Active Tab
  const [activeTab, setActiveTab] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'LEDGER'>('ALL');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [gstFilter, setGstFilter] = useState<string>('ALL');

  // Multi-select for bulk product actions
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Product Add / Edit Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [hsnCode, setHsnCode] = useState('8544');
  const [unit, setUnit] = useState<UnitType>('PCS');
  const [mrp, setMrp] = useState<number>(100);
  const [sellingPrice, setSellingPrice] = useState<number>(90);
  const [gstRate, setGstRate] = useState<number>(18);
  const [cessRate, setCessRate] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(50);
  const [minStockAlert, setMinStockAlert] = useState<number>(10);

  // Inventory Add (Stock Inward) Modal State
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [stockInProduct, setStockInProduct] = useState<Product | null>(null);
  const [stockInQuantity, setStockInQuantity] = useState<number>(10);
  const [stockInReason, setStockInReason] = useState<string>('New Supplier Purchase / Consignment');
  const [stockInNotes, setStockInNotes] = useState<string>('');

  // Inventory Deduct / Delete (Stock Outward / Write-off) Modal State
  const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
  const [stockOutProduct, setStockOutProduct] = useState<Product | null>(null);
  const [stockOutMode, setStockOutMode] = useState<'DEDUCT' | 'CLEAR_ALL'>('DEDUCT');
  const [stockOutQuantity, setStockOutQuantity] = useState<number>(1);
  const [stockOutReason, setStockOutReason] = useState<string>('Damaged / Broken in transit or storage');
  const [stockOutNotes, setStockOutNotes] = useState<string>('');

  // Single Product Delete Confirmation Modal State
  const [deleteProductConfirm, setDeleteProductConfirm] = useState<Product | null>(null);

  // Bulk Delete Confirmation Modal State
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  // Fallback to storage inventory logs if not passed in props
  const inventoryLogs = propInventoryLogs || StorageService.getInventoryLogs();

  // Metrics Calculations
  const totalStockUnits = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.currentStock ?? p.stockQuantity ?? p.stock ?? 0), 0);
  }, [products]);

  const totalValuationSelling = useMemo(() => {
    return products.reduce((sum, p) => {
      const stock = p.currentStock ?? p.stockQuantity ?? p.stock ?? 0;
      return sum + (stock * p.sellingPrice);
    }, 0);
  }, [products]);

  const totalValuationMrp = useMemo(() => {
    return products.reduce((sum, p) => {
      const stock = p.currentStock ?? p.stockQuantity ?? p.stock ?? 0;
      return sum + (stock * p.mrp);
    }, 0);
  }, [products]);

  const lowStockItems = useMemo(() => {
    return products.filter(p => {
      const stock = p.currentStock ?? p.stockQuantity ?? p.stock ?? 0;
      const minStock = p.lowStockAlert ?? p.minStockAlert ?? p.minStock ?? 5;
      return stock > 0 && stock <= minStock;
    });
  }, [products]);

  const outOfStockItems = useMemo(() => {
    return products.filter(p => {
      const stock = p.currentStock ?? p.stockQuantity ?? p.stock ?? 0;
      return stock <= 0;
    });
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const stock = p.currentStock ?? p.stockQuantity ?? p.stock ?? 0;
      const minStock = p.lowStockAlert ?? p.minStockAlert ?? p.minStock ?? 5;

      // Tab filtering
      if (activeTab === 'LOW_STOCK' && (stock <= 0 || stock > minStock)) return false;
      if (activeTab === 'OUT_OF_STOCK' && stock > 0) return false;

      // GST slab filtering
      if (gstFilter !== 'ALL' && p.gstRate !== Number(gstFilter)) return false;

      // Text query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        p.hsnCode.includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });
  }, [products, activeTab, gstFilter, searchQuery]);

  // Selection handlers
  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  // Open Add Product Modal
  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setDescription('');
    setHsnCode('8544');
    setUnit('PCS');
    setMrp(100);
    setSellingPrice(85);
    setGstRate(18);
    setCessRate(0);
    setStockQuantity(50);
    setMinStockAlert(10);
    setProductModalOpen(true);
  };

  // Open Edit Product Modal
  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || '');
    setDescription(p.description || '');
    setHsnCode(p.hsnCode);
    setUnit(p.unit);
    setMrp(p.mrp);
    setSellingPrice(p.sellingPrice);
    setGstRate(p.gstRate);
    setCessRate(p.cessRate || 0);
    setStockQuantity(p.currentStock ?? p.stockQuantity ?? p.stock ?? 0);
    setMinStockAlert(p.lowStockAlert ?? p.minStockAlert ?? p.minStock ?? 10);
    setProductModalOpen(true);
  };

  // Submit Product Form
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Product name is required.');
      return;
    }

    const stockVal = Math.max(0, Number(stockQuantity) || 0);
    const alertVal = Math.max(0, Number(minStockAlert) || 5);

    const updated: Product = {
      id: editingProduct?.id || `prod_${Date.now()}`,
      businessId: editingProduct?.businessId || 'biz_default_01',
      name: name.trim(),
      sku: sku.trim() || undefined,
      description: description.trim(),
      hsnCode: hsnCode.trim(),
      unit,
      mrp: Number(mrp) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      gstRate: Number(gstRate) || 0,
      cessRate: Number(cessRate) || 0,
      currentStock: stockVal,
      stockQuantity: stockVal,
      stock: stockVal,
      lowStockAlert: alertVal,
      minStockAlert: alertVal,
      minStock: alertVal,
      isActive: true,
      createdAt: editingProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(updated);
    setProductModalOpen(false);
  };

  // Execute Single Product Deletion
  const confirmExecuteDeleteProduct = () => {
    if (!deleteProductConfirm) return;
    onDeleteProduct(deleteProductConfirm.id);
    setSelectedProductIds(prev => prev.filter(id => id !== deleteProductConfirm.id));
    setDeleteProductConfirm(null);
  };

  // Execute Bulk Product Deletion
  const confirmExecuteBulkDelete = () => {
    if (selectedProductIds.length === 0) return;
    if (onBulkDeleteProducts) {
      onBulkDeleteProducts(selectedProductIds);
    } else {
      selectedProductIds.forEach(id => onDeleteProduct(id));
    }
    setSelectedProductIds([]);
    setBulkDeleteModalOpen(false);
  };

  // Open Stock Inward Modal
  const openStockInModal = (p: Product) => {
    setStockInProduct(p);
    setStockInQuantity(10);
    setStockInReason('New Supplier Purchase / Consignment');
    setStockInNotes('');
    setStockInModalOpen(true);
  };

  // Submit Stock Inward
  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInProduct) return;
    const qty = Math.max(1, Number(stockInQuantity) || 1);

    if (onAdjustStock) {
      onAdjustStock(
        stockInProduct.id,
        qty,
        'STOCK_IN_PURCHASE',
        stockInReason,
        stockInNotes.trim() || undefined
      );
    } else {
      StorageService.adjustStock(
        stockInProduct.id,
        qty,
        'STOCK_IN_PURCHASE',
        stockInReason,
        stockInNotes.trim() || undefined
      );
    }

    setStockInModalOpen(false);
    setStockInProduct(null);
  };

  // Open Stock Outward / Deduct Modal
  const openStockOutModal = (p: Product) => {
    setStockOutProduct(p);
    setStockOutMode('DEDUCT');
    setStockOutQuantity(1);
    setStockOutReason('Damaged / Broken in transit or storage');
    setStockOutNotes('');
    setStockOutModalOpen(true);
  };

  // Submit Stock Outward / Delete Inventory
  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockOutProduct) return;
    const currentStock = stockOutProduct.currentStock ?? stockOutProduct.stockQuantity ?? 0;

    if (stockOutMode === 'CLEAR_ALL') {
      if (onClearStock) {
        onClearStock(stockOutProduct.id, stockOutReason, stockOutNotes.trim() || 'Zeroed out remaining inventory');
      } else {
        StorageService.clearProductStock(stockOutProduct.id, stockOutReason, stockOutNotes.trim() || 'Zeroed out remaining inventory');
      }
    } else {
      const qty = Math.max(1, Number(stockOutQuantity) || 1);
      const deductQty = Math.min(qty, currentStock);

      let adjType: StockAdjustmentType = 'STOCK_OUT_DAMAGE';
      if (stockOutReason.toLowerCase().includes('expire')) adjType = 'STOCK_OUT_EXPIRED';
      else if (stockOutReason.toLowerCase().includes('theft') || stockOutReason.toLowerCase().includes('lost')) adjType = 'STOCK_OUT_LOSS';
      else if (stockOutReason.toLowerCase().includes('consum')) adjType = 'STOCK_OUT_CONSUMPTION';
      else if (stockOutReason.toLowerCase().includes('audit')) adjType = 'STOCK_OUT_AUDIT';

      if (onAdjustStock) {
        onAdjustStock(
          stockOutProduct.id,
          -deductQty,
          adjType,
          stockOutReason,
          stockOutNotes.trim() || undefined
        );
      } else {
        StorageService.adjustStock(
          stockOutProduct.id,
          -deductQty,
          adjType,
          stockOutReason,
          stockOutNotes.trim() || undefined
        );
      }
    }

    setStockOutModalOpen(false);
    setStockOutProduct(null);
  };

  // Quick 1-click step stock adjustment (+1 or -1)
  const handleQuickStepStock = (p: Product, delta: number) => {
    const current = p.currentStock ?? p.stockQuantity ?? 0;
    if (delta < 0 && current <= 0) return;

    const reason = delta > 0 ? 'Quick +1 stock increment' : 'Quick -1 stock decrement';
    const adjType: StockAdjustmentType = delta > 0 ? 'STOCK_IN_ADJUSTMENT' : 'STOCK_OUT_AUDIT';

    if (onAdjustStock) {
      onAdjustStock(p.id, delta, adjType, reason);
    } else {
      StorageService.adjustStock(p.id, delta, adjType, reason);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Product Name',
      'SKU',
      'HSN/SAC Code',
      'Unit',
      'MRP (INR)',
      'Selling Price (INR)',
      'GST Rate (%)',
      'Current Stock',
      'Low Stock Alert Threshold',
      'Stock Valuation (INR)',
      'Stock Status'
    ];

    const rows = products.map(p => {
      const stock = p.currentStock ?? p.stockQuantity ?? p.stock ?? 0;
      const minStock = p.lowStockAlert ?? p.minStockAlert ?? p.minStock ?? 5;
      const status = stock <= 0 ? 'Out of Stock' : (stock <= minStock ? 'Low Stock' : 'In Stock');
      const valuation = (stock * p.sellingPrice).toFixed(2);

      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.sku || ''}"`,
        `"${p.hsnCode}"`,
        `"${p.unit}"`,
        p.mrp,
        p.sellingPrice,
        p.gstRate,
        stock,
        minStock,
        valuation,
        `"${status}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Products_Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP STATS BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Catalog Products</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{products.length} Items</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{products.filter(p => p.isActive).length} active in sales</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Stock Count</div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">{totalStockUnits.toLocaleString('en-IN')} Units</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Across all registered SKUs</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stock Valuation</div>
            <div className="text-xl font-bold text-indigo-700 mt-0.5">₹{totalValuationSelling.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">MRP: ₹{totalValuationMrp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stock Alerts</div>
            <div className="text-xl font-bold text-amber-600 mt-0.5">
              {lowStockItems.length + outOfStockItems.length} Warnings
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              <span className="text-red-500 font-semibold">{outOfStockItems.length} out</span>, {lowStockItems.length} low
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. HEADER & PRIMARY ACTIONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            <span>Product Catalog & Inventory Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Add, update, and delete products, manage live stock levels, and write-off inventory with automatic GST & audit records.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200"
            title="Download full catalog & inventory report as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            id="open-add-product-btn"
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 3. TABS & FILTERS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              id="tab-all-products"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Products ({products.length})
            </button>
            <button
              id="tab-low-stock"
              onClick={() => setActiveTab('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'LOW_STOCK'
                  ? 'bg-white text-amber-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-amber-600'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Low Stock ({lowStockItems.length})</span>
            </button>
            <button
              id="tab-out-of-stock"
              onClick={() => setActiveTab('OUT_OF_STOCK')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'OUT_OF_STOCK'
                  ? 'bg-white text-red-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-red-600'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span>Out of Stock ({outOfStockItems.length})</span>
            </button>
            <button
              id="tab-inventory-ledger"
              onClick={() => setActiveTab('LEDGER')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'LEDGER'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-500" />
              <span>Stock Movement Log ({inventoryLogs.length})</span>
            </button>
          </div>

          {/* Quick GST Slab Filter */}
          {activeTab !== 'LEDGER' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">GST Slab:</span>
              <select
                id="filter-gst-slab"
                value={gstFilter}
                onChange={e => setGstFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="ALL">All GST Rates</option>
                <option value="0">0% (Nil)</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          )}
        </div>

        {/* Search Bar & Bulk Actions Bar */}
        {activeTab !== 'LEDGER' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                id="product-search-input"
                type="text"
                placeholder="Search by product name, SKU, HSN code, or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Bulk Actions Indicator */}
            {selectedProductIds.length > 0 && (
              <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs w-full sm:w-auto justify-between sm:justify-start">
                <span className="font-semibold text-amber-900">
                  {selectedProductIds.length} {selectedProductIds.length === 1 ? 'product' : 'products'} selected
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    id="bulk-delete-btn"
                    onClick={() => setBulkDeleteModalOpen(true)}
                    className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Selected</span>
                  </button>
                  <button
                    onClick={() => setSelectedProductIds([])}
                    className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-amber-100/60 rounded-md transition"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. PRODUCTS TABLE (FOR ALL, LOW_STOCK, OUT_OF_STOCK) */}
      {activeTab !== 'LEDGER' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" id="products-catalog-table">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-slate-400 hover:text-slate-700 focus:outline-hidden"
                      title="Select all products"
                    >
                      {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Product / SKU</th>
                  <th className="py-3 px-3">HSN/SAC</th>
                  <th className="py-3 px-3 text-center">GST Slab</th>
                  <th className="py-3 px-3 text-right">Price (₹)</th>
                  <th className="py-3 px-3 text-center">Unit</th>
                  <th className="py-3 px-3 text-center">Current Stock</th>
                  <th className="py-3 px-3 text-right">Valuation</th>
                  <th className="py-3 px-3 text-center">Inventory Action</th>
                  <th className="py-3 px-3 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package className="w-8 h-8 text-slate-300" />
                        <div className="font-semibold text-slate-600 text-sm">No products found</div>
                        <p className="text-xs text-slate-400 max-w-xs">
                          {searchQuery
                            ? `No product matches "${searchQuery}". Try a different keyword or clear your filter.`
                            : activeTab === 'LOW_STOCK'
                            ? 'Great news! There are no products at or below the low stock threshold.'
                            : activeTab === 'OUT_OF_STOCK'
                            ? 'All products currently have units in stock.'
                            : 'Click "Add Product" above to create your first product.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(p => {
                    const stock = p.currentStock ?? p.stockQuantity ?? p.stock ?? 0;
                    const minStock = p.lowStockAlert ?? p.minStockAlert ?? p.minStock ?? 5;
                    const isOutOfStock = stock <= 0;
                    const isLowStock = !isOutOfStock && stock <= minStock;
                    const isSelected = selectedProductIds.includes(p.id);
                    const valuation = stock * p.sellingPrice;

                    return (
                      <tr 
                        key={p.id} 
                        id={`product-row-${p.id}`}
                        className={`transition ${
                          isSelected 
                            ? 'bg-amber-50/50' 
                            : isOutOfStock 
                            ? 'bg-red-50/20 hover:bg-red-50/40' 
                            : isLowStock 
                            ? 'bg-amber-50/20 hover:bg-amber-50/40' 
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectProduct(p.id)}
                            className="text-slate-400 hover:text-slate-700 focus:outline-hidden"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Name & SKU */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            {p.sku && (
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {p.sku}
                              </span>
                            )}
                            {p.description && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={p.description}>
                                {p.description}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* HSN Code */}
                        <td className="py-3 px-3 font-mono text-slate-700 font-semibold">
                          {p.hsnCode}
                        </td>

                        {/* GST Rate */}
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.gstRate === 0 
                              ? 'bg-slate-100 text-slate-600'
                              : p.gstRate <= 5
                              ? 'bg-blue-100 text-blue-800'
                              : p.gstRate <= 18
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {p.gstRate}%
                            {p.cessRate ? ` + ${p.cessRate}% Cess` : ''}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-mono font-bold text-slate-900">
                            ₹{p.sellingPrice.toFixed(2)}
                          </div>
                          {p.mrp > p.sellingPrice && (
                            <div className="text-[10px] font-mono text-slate-400 line-through">
                              MRP ₹{p.mrp.toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Unit */}
                        <td className="py-3 px-3 text-center text-slate-600 font-medium">
                          {p.unit}
                        </td>

                        {/* Current Stock with Visual Badge & Quick Increment / Decrement */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Quick -1 decrement */}
                            <button
                              id={`quick-dec-${p.id}`}
                              onClick={() => handleQuickStepStock(p, -1)}
                              disabled={stock <= 0}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              title="Quickly deduct 1 unit"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            {/* Stock badge */}
                            <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold inline-flex items-center gap-1 ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {isOutOfStock ? (
                                <>
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                  <span>0 {p.unit}</span>
                                </>
                              ) : isLowStock ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>{stock} {p.unit}</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>{stock} {p.unit}</span>
                                </>
                              )}
                            </span>

                            {/* Quick +1 increment */}
                            <button
                              id={`quick-inc-${p.id}`}
                              onClick={() => handleQuickStepStock(p, 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                              title="Quickly add 1 unit"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Min Alert: {minStock}
                          </div>
                        </td>

                        {/* Stock Valuation */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                          ₹{valuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Dedicated Inventory In / Out Buttons */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 space-x-0.5">
                            <button
                              id={`stock-in-btn-${p.id}`}
                              onClick={() => openStockInModal(p)}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100/70 rounded transition flex items-center space-x-1"
                              title="Add incoming inventory (Stock Inward)"
                            >
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              <span>+ Add Stock</span>
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              id={`stock-out-btn-${p.id}`}
                              onClick={() => openStockOutModal(p)}
                              disabled={stock <= 0}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100/70 rounded transition flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Deduct or delete inventory (Write-off / Damaged / Expired / Clear)"
                            >
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                              <span>- Deduct Stock</span>
                            </button>
                          </div>
                        </td>

                        {/* Edit & Delete Product */}
                        <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            id={`edit-prod-btn-${p.id}`}
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Product Details & Tax Rates"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-prod-btn-${p.id}`}
                            onClick={() => setDeleteProductConfirm(p)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Delete Product from Catalog"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 5. INVENTORY MOVEMENT LOG / LEDGER */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Inventory Audit Trail & Stock Movement Ledger</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time log of every stock addition, supplier purchase, damaged write-off, and inventory zeroing.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Total {inventoryLogs.length} Records
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" id="inventory-ledger-table">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Product Item</th>
                  <th className="py-3 px-3">Movement Type</th>
                  <th className="py-3 px-3 text-right">Quantity Change</th>
                  <th className="py-3 px-3 text-center">Stock Flow</th>
                  <th className="py-3 px-3">Reason / Details</th>
                  <th className="py-3 px-3 text-right">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <div className="font-semibold text-slate-600 text-sm">No inventory movements recorded yet</div>
                      <p className="text-xs text-slate-400">
                        Adjust stock or add products to see the audit trail here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  inventoryLogs.map(log => {
                    const isAddition = log.quantityChange > 0;
                    const isZeroed = log.adjustmentType === 'STOCK_DELETE_ALL';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-slate-500 font-mono whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{log.productName}</div>
                          {log.sku && (
                            <div className="text-[10px] font-mono text-slate-400">{log.sku}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAddition
                              ? 'bg-emerald-100 text-emerald-800'
                              : isZeroed
                              ? 'bg-rose-100 text-rose-800 font-bold'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isAddition ? 'STOCK IN' : (isZeroed ? 'STOCK CLEARED' : 'STOCK OUT')}
                          </span>
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${
                          isAddition ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {isAddition ? `+${log.quantityChange}` : log.quantityChange} {log.unit}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600">
                          {log.previousStock} ➔ <span className="font-bold text-slate-900">{log.newStock}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <div className="font-medium">{log.reason}</div>
                          {log.notes && (
                            <div className="text-[10px] text-slate-400 italic">Ref: {log.notes}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 font-medium">
                          {log.recordedBy}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD / EDIT PRODUCT MODAL                             */}
      {/* ------------------------------------------------------------- */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="mobile-dialog w-full max-w-xl space-y-4 rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <span>{editingProduct ? 'Edit Product Catalog Item' : 'Add New Product to Catalog'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up item specifications, HSN code, pricing, GST slab, and initial inventory.
                </p>
              </div>
              <button
                onClick={() => setProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Product / Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-product-name"
                    type="text"
                    required
                    placeholder="e.g. Havells 2.5 Sq mm Copper Wire 90m"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SKU / Barcode / Code
                  </label>
                  <input
                    id="input-product-sku"
                    type="text"
                    placeholder="e.g. HVL-CBL-2.5"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Product Description / Specifications
                </label>
                <textarea
                  id="input-product-desc"
                  rows={2}
                  placeholder="e.g. 1100V Grade Flame Retardant (FR) PVC insulated industrial cable"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden resize-none"
                />
              </div>

              {/* HSN, GST, Unit Row */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    HSN / SAC Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-product-hsn"
                    type="text"
                    required
                    maxLength={8}
                    placeholder="e.g. 8544"
                    value={hsnCode}
                    onChange={e => setHsnCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">2 to 8 digits</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    GST Rate Slab
                  </label>
                  <select
                    id="input-product-gst"
                    value={gstRate}
                    onChange={e => setGstRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                  >
                    {CURRENT_TAX_RULE.rates.map(r => (
                      <option key={r} value={r}>
                        {r}% {r === 0 ? '(Nil/Exempt)' : 'GST'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit of Measure
                  </label>
                  <select
                    id="input-product-unit"
                    value={unit}
                    onChange={e => setUnit(e.target.value as UnitType)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                  >
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="BOX">Box (BOX)</option>
                    <option value="MTR">Meters (MTR)</option>
                    <option value="KGS">Kilograms (KGS)</option>
                    <option value="GMS">Grams (GMS)</option>
                    <option value="LTR">Liters (LTR)</option>
                    <option value="SET">Set (SET)</option>
                    <option value="PAIR">Pair (PAIR)</option>
                    <option value="DOZ">Dozen (DOZ)</option>
                    <option value="NOS">Numbers (NOS)</option>
                  </select>
                </div>
              </div>

              {/* Pricing Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    MRP (Maximum Retail Price) ₹
                  </label>
                  <input
                    id="input-product-mrp"
                    type="number"
                    min="0"
                    step="0.01"
                    value={mrp}
                    onChange={e => setMrp(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Selling / Billing Price ₹ <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-product-selling-price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold text-emerald-800"
                  />
                  {mrp > sellingPrice && (
                    <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                      Save ₹{(mrp - sellingPrice).toFixed(2)} ({Math.round(((mrp - sellingPrice) / mrp) * 100)}% off MRP)
                    </span>
                  )}
                </div>
              </div>

              {/* Inventory Stock Row */}
              <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    {editingProduct ? 'Current Stock Quantity' : 'Initial Stock Quantity (Opening)'}
                  </label>
                  <input
                    id="input-product-stock-qty"
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Available inventory units in warehouse
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Low Stock Alert Level
                  </label>
                  <input
                    id="input-product-min-stock"
                    type="number"
                    min="1"
                    value={minStockAlert}
                    onChange={e => setMinStockAlert(parseInt(e.target.value, 10) || 5)}
                    className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Triggers warning when stock drops to or below this
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  id="save-product-submit-btn"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ADD INVENTORY (STOCK INWARD)                         */}
      {/* ------------------------------------------------------------- */}
      {stockInModalOpen && stockInProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="mobile-dialog w-full max-w-md space-y-4 rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  <span>Add Inventory (Stock Inward)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record new incoming stock from suppliers or customer returns.
                </p>
              </div>
              <button
                onClick={() => setStockInModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary Card */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">{stockInProduct.name}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                <span>SKU: <strong className="font-mono text-slate-700">{stockInProduct.sku || 'N/A'}</strong></span>
                <span>Current Stock: <strong className="font-mono text-slate-900 font-bold">{stockInProduct.currentStock ?? stockInProduct.stockQuantity ?? 0} {stockInProduct.unit}</strong></span>
              </div>
            </div>

            <form onSubmit={handleStockInSubmit} className="space-y-4 text-xs">
              {/* Quantity to Add with Quick Presets */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity to Add ({stockInProduct.unit}) <span className="text-red-500">*</span>
                </label>
                <input
                  id="stock-in-qty-input"
                  type="number"
                  min="1"
                  required
                  value={stockInQuantity}
                  onChange={e => setStockInQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold text-emerald-800"
                />

                {/* Quick Add Presets */}
                <div className="flex items-center space-x-1.5 mt-2">
                  <span className="text-[11px] text-slate-400">Presets:</span>
                  {[5, 10, 25, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setStockInQuantity(amt)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition ${
                        stockInQuantity === amt
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inward Reason */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason / Source of Inflow
                </label>
                <select
                  id="stock-in-reason-select"
                  value={stockInReason}
                  onChange={e => setStockInReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium bg-white"
                >
                  <option value="New Supplier Purchase / Consignment">New Supplier Purchase / Consignment</option>
                  <option value="Customer Return / Exchange Restock">Customer Return / Exchange Restock</option>
                  <option value="Physical Stock Audit (Found Surplus)">Physical Stock Audit (Found Surplus)</option>
                  <option value="Opening Stock Inflow">Opening Stock Inflow</option>
                  <option value="Inter-Warehouse Transfer In">Inter-Warehouse Transfer In</option>
                  <option value="Other Inward Adjustment">Other Inward Adjustment</option>
                </select>
              </div>

              {/* Reference Note */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference Note / PO / Challan (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-2026-441 / Havells Bill #9928"
                  value={stockInNotes}
                  onChange={e => setStockInNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-500 text-[11px] block">Current</span>
                  <span className="font-bold text-slate-800">{stockInProduct.currentStock ?? 0}</span>
                </div>
                <div className="text-emerald-700 font-bold">+</div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Adding</span>
                  <span className="font-bold text-emerald-700">+{stockInQuantity}</span>
                </div>
                <div className="text-slate-400">=</div>
                <div>
                  <span className="text-slate-500 text-[11px] block font-sans">New Total</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    {(stockInProduct.currentStock ?? 0) + stockInQuantity} {stockInProduct.unit}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStockInModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  id="confirm-stock-in-btn"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center space-x-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Confirm Stock Inward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: DEDUCT / DELETE INVENTORY (STOCK OUTWARD)             */}
      {/* ------------------------------------------------------------- */}
      {stockOutModalOpen && stockOutProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="mobile-dialog w-full max-w-md space-y-4 rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-rose-600" />
                  <span>Deduct or Delete Inventory</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Write off damaged, expired, lost items, or clear out remaining stock.
                </p>
              </div>
              <button
                onClick={() => setStockOutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary Card */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">{stockOutProduct.name}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                <span>SKU: <strong className="font-mono text-slate-700">{stockOutProduct.sku || 'N/A'}</strong></span>
                <span>Current Stock: <strong className="font-mono text-slate-900 font-bold">{stockOutProduct.currentStock ?? stockOutProduct.stockQuantity ?? 0} {stockOutProduct.unit}</strong></span>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                id="stock-out-mode-deduct"
                onClick={() => setStockOutMode('DEDUCT')}
                className={`py-1.5 rounded-md transition ${
                  stockOutMode === 'DEDUCT'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Deduct Quantity
              </button>
              <button
                type="button"
                id="stock-out-mode-clear-all"
                onClick={() => setStockOutMode('CLEAR_ALL')}
                className={`py-1.5 rounded-md transition ${
                  stockOutMode === 'CLEAR_ALL'
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                Delete / Clear All Stock
              </button>
            </div>

            <form onSubmit={handleStockOutSubmit} className="space-y-4 text-xs">
              {stockOutMode === 'DEDUCT' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quantity to Deduct ({stockOutProduct.unit}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="stock-out-qty-input"
                    type="number"
                    min="1"
                    max={stockOutProduct.currentStock ?? stockOutProduct.stockQuantity ?? 1}
                    required
                    value={stockOutQuantity}
                    onChange={e => setStockOutQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 text-sm border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden font-mono font-bold text-rose-800"
                  />

                  {/* Presets */}
                  <div className="flex items-center space-x-1.5 mt-2">
                    <span className="text-[11px] text-slate-400">Presets:</span>
                    {[1, 2, 5, 10].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setStockOutQuantity(amt)}
                        disabled={(stockOutProduct.currentStock ?? 0) < amt}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition disabled:opacity-30 disabled:cursor-not-allowed ${
                          stockOutQuantity === amt
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        -{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setStockOutQuantity(stockOutProduct.currentStock ?? 1)}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold border bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      All ({stockOutProduct.currentStock ?? 0})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Zero Out Entire Stock</span>
                  </div>
                  <p className="text-xs text-rose-700 mt-1">
                    This will delete all <strong>{stockOutProduct.currentStock ?? 0} {stockOutProduct.unit}</strong> from inventory and set the product stock level to 0.
                  </p>
                </div>
              )}

              {/* Outward Reason */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Deduction / Deletion <span className="text-red-500">*</span>
                </label>
                <select
                  id="stock-out-reason-select"
                  value={stockOutReason}
                  onChange={e => setStockOutReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden font-medium bg-white"
                >
                  <option value="Damaged / Broken in transit or storage">Damaged / Broken in transit or storage</option>
                  <option value="Expired / Beyond Shelf Life">Expired / Beyond Shelf Life</option>
                  <option value="Internal Office / Workshop Consumption">Internal Office / Workshop Consumption</option>
                  <option value="Theft / Lost / Missing in Transit">Theft / Lost / Missing in Transit</option>
                  <option value="Sample / Customer Demonstration">Sample / Customer Demonstration</option>
                  <option value="Physical Stock Audit (Deficit Correction)">Physical Stock Audit (Deficit Correction)</option>
                  <option value="Scrapped / Obsolete Stock Write-Off">Scrapped / Obsolete Stock Write-Off</option>
                </select>
              </div>

              {/* Reference Note */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Disposal Note / Approver Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Broken packaging / Water damage in basement"
                  value={stockOutNotes}
                  onChange={e => setStockOutNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-500 text-[11px] block">Current</span>
                  <span className="font-bold text-slate-800">{stockOutProduct.currentStock ?? 0}</span>
                </div>
                <div className="text-rose-700 font-bold">-</div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Deducting</span>
                  <span className="font-bold text-rose-700">
                    -{stockOutMode === 'CLEAR_ALL' ? (stockOutProduct.currentStock ?? 0) : stockOutQuantity}
                  </span>
                </div>
                <div className="text-slate-400">=</div>
                <div>
                  <span className="text-slate-500 text-[11px] block font-sans">New Total</span>
                  <span className="font-bold text-rose-900 text-sm">
                    {stockOutMode === 'CLEAR_ALL' 
                      ? `0 ${stockOutProduct.unit}` 
                      : `${Math.max(0, (stockOutProduct.currentStock ?? 0) - stockOutQuantity)} ${stockOutProduct.unit}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStockOutModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  id="confirm-stock-out-btn"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs flex items-center space-x-1.5"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>{stockOutMode === 'CLEAR_ALL' ? 'Clear All Stock' : 'Confirm Stock Deduction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: DELETE PRODUCT CONFIRMATION MODAL                    */}
      {/* ------------------------------------------------------------- */}
      {deleteProductConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="mobile-dialog w-full max-w-md space-y-4 rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-slate-900 text-base">
                Delete Product &quot;{deleteProductConfirm.name}&quot;?
              </h3>
              <p className="text-xs text-slate-500">
                This will permanently remove this item from your sales catalog and HSN registry.
              </p>
            </div>

            {/* Inventory Warning */}
            {(deleteProductConfirm.currentStock ?? deleteProductConfirm.stockQuantity ?? 0) > 0 ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Active Inventory Warning</span>
                </div>
                <p className="mt-1">
                  This product currently has <strong className="font-bold font-mono text-amber-900">{deleteProductConfirm.currentStock ?? deleteProductConfirm.stockQuantity} {deleteProductConfirm.unit}</strong> in stock (Valued at ₹{((deleteProductConfirm.currentStock ?? 0) * deleteProductConfirm.sellingPrice).toFixed(2)}).
                  Deleting this product will write off and clear this remaining inventory.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs">
                This item currently has 0 units in stock. Existing historical invoices referencing this product will not be affected.
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteProductConfirm(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-product-btn"
                type="button"
                onClick={confirmExecuteDeleteProduct}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete Product</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: BULK DELETE PRODUCTS CONFIRMATION MODAL              */}
      {/* ------------------------------------------------------------- */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="mobile-dialog w-full max-w-md space-y-4 rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-slate-900 text-base">
                Delete {selectedProductIds.length} Selected Products?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete all {selectedProductIds.length} selected items from your catalog? This action will write off their current inventory and cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                id="confirm-bulk-delete-btn"
                type="button"
                onClick={confirmExecuteBulkDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete All Selected ({selectedProductIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
