'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  TrendingUp,
  ShoppingBag,
  Info,
  Calendar,
  AlertTriangle,
  X,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { SaleTransaction, ProductHealthStatus } from '@/lib/types';
import { FinancialMetrics } from '@/lib/calculations';

export default function SalesPage() {
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [products, setProducts] = useState<ProductHealthStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [customPrice, setCustomPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [salesRes, prodRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/products'),
      ]);

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setTransactions(salesData.transactions || []);
        setMetrics(salesData.metrics || null);
      }

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
        if (prodData.products && prodData.products.length > 0) {
          const first = prodData.products[0].product;
          setSelectedProductId(first.id);
          setCustomPrice(first.sellingPrice.toString());
        }
      }
    } catch (err) {
      console.error('Failed to load sales data', err);
    } finally {
      setLoading(false);
    }
  }

  function handleProductSelect(id: string) {
    setSelectedProductId(id);
    const prod = products.find((p) => p.product.id === id);
    if (prod) {
      setCustomPrice(prod.product.sellingPrice.toString());
    }
  }

  async function handleRecordSale(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const qtyNum = parseInt(quantity, 10);
    const priceNum = parseFloat(customPrice);
    const discNum = discount.trim() ? parseFloat(discount) : 0;

    if (!selectedProductId) {
      setFormError('Please select a product.');
      return;
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setFormError('Quantity sold must be at least 1.');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Selling price must be a positive number.');
      return;
    }
    if (isNaN(discNum) || discNum < 0) {
      setFormError('Discount cannot be negative.');
      return;
    }

    const targetProd = products.find((p) => p.product.id === selectedProductId);
    if (targetProd && targetProd.product.currentStock < qtyNum) {
      if (
        !confirm(
          `Current stock is only ${targetProd.product.currentStock} units. Record sale anyway? (Stock will reach 0)`
        )
      ) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          quantitySold: qtyNum,
          sellingPrice: priceNum,
          discount: discNum,
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to record sale');
      }

      setIsModalOpen(false);
      setQuantity('1');
      setDiscount('0');
      setNotes('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error recording sale transaction.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Aggregate Sales by Product for Chart
  const salesByProductData = React.useMemo(() => {
    const map: Record<string, { revenue: number; units: number }> = {};
    transactions.forEach((tx) => {
      const name = tx.productName.length > 15 ? tx.productName.slice(0, 15) + '...' : tx.productName;
      if (!map[name]) {
        map[name] = { revenue: 0, units: 0 };
      }
      map[name].revenue += tx.totalRevenue;
      map[name].units += tx.quantitySold;
    });

    return Object.entries(map)
      .map(([name, val]) => ({
        name,
        revenue: Number(val.revenue.toFixed(2)),
        units: val.units,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Sales & Revenue Analytics
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Deterministic revenue tracking with strict cost-of-goods accounting. We never assume profitability on unrecorded recipe costs.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record Sale Transaction
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Recorded Net Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            ${metrics?.totalRevenue.toFixed(2) ?? '0.00'}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Calculated from {metrics?.transactionCount ?? 0} customer orders
          </p>
        </div>

        {/* Metric 2: Estimated Gross Profit */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Est. Gross Profit</span>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </div>
          {metrics?.hasMissingCosts ? (
            <div>
              <div className="text-lg font-bold text-amber-700 flex items-center gap-1.5">
                <Info className="h-4 w-4 shrink-0" />
                Unrecorded Costs
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                {metrics.transactionsWithMissingCost} order(s) include items with unrecorded cost
              </p>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-stone-900">
                ${metrics?.totalGrossProfit?.toFixed(2) ?? '0.00'}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Margin: {metrics?.overallGrossMarginPercentage}%
              </p>
            </div>
          )}
        </div>

        {/* Metric 3: Units Sold */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Total Volume Sold</span>
            <ShoppingBag className="h-4 w-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {metrics?.totalUnitsSold ?? 0} units
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Avg order size: {metrics?.transactionCount ? (metrics.totalUnitsSold / metrics.transactionCount).toFixed(1) : 0} items
          </p>
        </div>

        {/* Metric 4: Average Order Value */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Average Order Value (AOV)</span>
            <Tag className="h-4 w-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            ${metrics?.averageOrderValue.toFixed(2) ?? '0.00'}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Net revenue per customer transaction
          </p>
        </div>
      </div>

      {/* Chart: Sales Revenue by Product */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Top Performing Products by Net Revenue</h3>
            <p className="text-[11px] text-stone-400">Total recorded sales dollars and unit volumes</p>
          </div>
        </div>
        <div className="h-64 w-full">
          {salesByProductData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByProductData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716C' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    name === 'revenue' ? `$${Number(val).toFixed(2)}` : `${val} units`,
                    name === 'revenue' ? 'Revenue' : 'Units Sold',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E7E5E4',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="revenue" fill="#EA580C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-stone-400">
              No sales transactions recorded yet. Click &quot;Record Sale Transaction&quot; to begin.
            </div>
          )}
        </div>
      </div>

      {/* Transactions History Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">Recorded Transactions Log</h2>
          <span className="text-xs text-stone-500 font-medium">
            {transactions.length} entries recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Item Sold</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Net Total</th>
                <th className="py-3 px-4">Est. Profit</th>
                <th className="py-3 px-4">Order Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50/50">
                    <td className="py-3 px-4 text-stone-500">
                      {new Date(tx.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-900">{tx.productName}</td>
                    <td className="py-3 px-4 font-medium">{tx.quantitySold}</td>
                    <td className="py-3 px-4">${tx.sellingPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-stone-500">
                      {tx.discount > 0 ? `-$${tx.discount.toFixed(2)}` : '$0.00'}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">
                      ${tx.totalRevenue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      {tx.estimatedGrossProfit !== null && tx.estimatedGrossProfit !== undefined ? (
                        <span className="font-semibold text-emerald-700">
                          +${tx.estimatedGrossProfit.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Cost Missing
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-400 text-[11px]">
                      {tx.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
              <h2 className="text-base font-semibold text-stone-900">Record Bakery Sale</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSale} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-medium text-stone-700 mb-1">Select Product *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                >
                  {products.map((item) => (
                    <option key={item.product.id} value={item.product.id}>
                      {item.product.name} — ${item.product.sellingPrice.toFixed(2)} (Stock: {item.product.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Quantity Sold *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Price per Unit ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Discount Applied ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Order Notes / Customer</label>
                <input
                  type="text"
                  placeholder="e.g., Morning regular, student discount, loyalty perk"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Real-time Order Total Preview */}
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between font-semibold">
                <span className="text-stone-700">Calculated Revenue:</span>
                <span className="text-sm text-stone-900">
                  $
                  {Math.max(
                    0,
                    (parseInt(quantity || '0', 10) * parseFloat(customPrice || '0') -
                      parseFloat(discount || '0'))
                  ).toFixed(2)}
                </span>
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
                  {isSubmitting ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
