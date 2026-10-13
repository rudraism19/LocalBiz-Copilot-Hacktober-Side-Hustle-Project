'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  Trash2,
  Edit2,
  DollarSign,
  Info,
  CheckCircle2,
  X,
  Megaphone,
} from 'lucide-react';
import { Product, ProductHealthStatus, ProductCategory } from '@/lib/types';

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductHealthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'expiring'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('pastry');
  const [sellingPrice, setSellingPrice] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [reorderThreshold, setReorderThreshold] = useState('5');
  const [expiryDate, setExpiryDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingProduct(null);
    setName('');
    setCategory('pastry');
    setSellingPrice('');
    setUnitCost('');
    setCurrentStock('10');
    setReorderThreshold('5');
    setExpiryDate('');
    setDescription('');
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(prod: Product) {
    setEditingProduct(prod);
    setName(prod.name);
    setCategory(prod.category);
    setSellingPrice(prod.sellingPrice.toString());
    setUnitCost(prod.unitCost !== null && prod.unitCost !== undefined ? prod.unitCost.toString() : '');
    setCurrentStock(prod.currentStock.toString());
    setReorderThreshold(prod.reorderThreshold.toString());
    setExpiryDate(prod.expiryDate || '');
    setDescription(prod.description || '');
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const priceNum = parseFloat(sellingPrice);
    const stockNum = parseInt(currentStock, 10);
    const reorderNum = parseInt(reorderThreshold, 10);
    const costNum = unitCost.trim() ? parseFloat(unitCost) : null;

    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Selling price must be a positive number.');
      return;
    }
    if (costNum !== null && (isNaN(costNum) || costNum < 0)) {
      setFormError('Unit cost cannot be negative.');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setFormError('Current stock must be a non-negative integer.');
      return;
    }
    if (isNaN(reorderNum) || reorderNum < 0) {
      setFormError('Reorder threshold must be a non-negative integer.');
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      sellingPrice: priceNum,
      unitCost: costNum,
      currentStock: stockNum,
      reorderThreshold: reorderNum,
      expiryDate: expiryDate ? expiryDate : null,
      description: description.trim(),
    };

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        // Update
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to update product');
        }
      } else {
        // Create
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to create product');
        }
      }

      setIsModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving the product.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string, prodName: string) {
    if (!confirm(`Are you sure you want to delete "${prodName}"?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadProducts();
      } else {
        alert('Failed to delete product');
      }
    } catch (err) {
      alert('Error deleting product');
    }
  }

  // Filtered Products
  const filteredProducts = products.filter((item) => {
    const matchesSearch =
      item.product.name.toLowerCase().includes(search.toLowerCase()) ||
      item.product.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.product.category === categoryFilter;

    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = item.isLowStock;
    else if (stockFilter === 'expiring') matchesStock = item.isExpiringSoon;

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Inventory & Catalog Management
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage your bakery recipes, shelf batches, unit costs, and reorder levels. Margins are calculated deterministically.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add New Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search items, ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Categories</option>
            <option value="bread">Breads</option>
            <option value="pastry">Pastries</option>
            <option value="cake">Cakes</option>
            <option value="beverage">Beverages</option>
            <option value="savory">Savory</option>
            <option value="seasonal">Seasonal</option>
          </select>

          {/* Quick Stock Filters */}
          <div className="flex rounded-lg border border-stone-200 bg-stone-50/80 p-0.5 text-xs">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                stockFilter === 'all' ? 'bg-white shadow-subtle text-stone-900' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                stockFilter === 'low' ? 'bg-white shadow-subtle text-amber-700 font-semibold' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockFilter('expiring')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                stockFilter === 'expiring' ? 'bg-white shadow-subtle text-rose-700 font-semibold' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Expiring Soon
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Product Name & Category</th>
                <th className="py-3 px-4">Retail Price</th>
                <th className="py-3 px-4">Unit Cost</th>
                <th className="py-3 px-4">Est. Margin</th>
                <th className="py-3 px-4">Stock Level</th>
                <th className="py-3 px-4">Expiry Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    Loading inventory records...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    No products matched your criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => {
                  const p = item.product;
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* Name & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{p.name}</div>
                        <div className="text-[11px] text-stone-400 capitalize">
                          {p.category} {p.description ? `• ${p.description.slice(0, 45)}...` : ''}
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 font-medium text-stone-900">
                        ${p.sellingPrice.toFixed(2)}
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3.5 px-4">
                        {p.unitCost !== null && p.unitCost !== undefined ? (
                          <span className="text-stone-700">${p.unitCost.toFixed(2)}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Info className="h-3 w-3" /> Cost Unrecorded
                          </span>
                        )}
                      </td>

                      {/* Margin */}
                      <td className="py-3.5 px-4">
                        {item.unitMarginPercentage !== null ? (
                          <div>
                            <span className="font-medium text-emerald-700">
                              {item.unitMarginPercentage.toFixed(1)}%
                            </span>
                            <div className="text-[10px] text-stone-400">
                              +${item.unitMargin?.toFixed(2)} / unit
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[11px]">Cannot Calculate</span>
                        )}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">{p.currentStock}</span>
                          <span className="text-stone-400 text-[11px]">/ min {p.reorderThreshold}</span>
                          {item.isLowStock && (
                            <span className="p-1 rounded bg-amber-100 text-amber-800" title="Low stock alert">
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Expiry Status */}
                      <td className="py-3.5 px-4">
                        {p.expiryDate ? (
                          item.isExpiringSoon ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <Clock className="h-3 w-3" />
                              {item.daysUntilExpiry! <= 0 ? 'Expired' : `${item.daysUntilExpiry}d left`}
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-600">{p.expiryDate}</span>
                          )
                        ) : (
                          <span className="text-stone-400 text-[11px]">No shelf-life date</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/marketing?productId=${p.id}`}
                            title="Generate promotional campaign"
                            className="p-1.5 text-stone-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                          >
                            <Megaphone className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit product"
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            title="Delete product"
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
              <h2 className="text-base font-semibold text-stone-900">
                {editingProduct ? 'Edit Bakery Product' : 'Add New Bakery Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-medium text-stone-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Rosemary Sourdough Focaccia"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="bread">Bread</option>
                    <option value="pastry">Pastry</option>
                    <option value="cake">Cake</option>
                    <option value="beverage">Beverage</option>
                    <option value="savory">Savory</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="packaged">Packaged</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g., 5.50"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Unit Cost ($)
                    <span className="text-stone-400 font-normal"> (optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 1.50"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Current Stock *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="Units"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Reorder Level *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="Min"
                    value={reorderThreshold}
                    onChange={(e) => setReorderThreshold(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Expiry Date <span className="text-stone-400 font-normal">(optional shelf life)</span>
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Product Description & Ingredients
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., 36-hour sourdough with organic rye and toasted sunflower seeds."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  AI Guardrail: Model uses this description only for factual context and will not invent ingredients not listed.
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
