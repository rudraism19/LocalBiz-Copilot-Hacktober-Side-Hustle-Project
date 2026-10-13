'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Boxes,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Megaphone,
  CheckCircle2,
  Info,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ProductHealthStatus, DailyBriefing } from '@/lib/types';
import { InventoryMetrics, FinancialMetrics } from '@/lib/calculations';

const CHART_COLORS = ['#EA580C', '#D97706', '#0284C7', '#10B981', '#8B5CF6', '#F43F5E'];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productsHealth, setProductsHealth] = useState<ProductHealthStatus[]>([]);
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryMetrics | null>(null);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [latestBriefing, setLatestBriefing] = useState<DailyBriefing | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, salesRes, briefingRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/sales'),
        fetch('/api/briefing'),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProductsHealth(prodData.products || []);
        setInventoryMetrics(prodData.metrics || null);
      }

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setFinancialMetrics(salesData.metrics || null);
      }

      if (briefingRes.ok) {
        const briefingData = await briefingRes.json();
        setLatestBriefing(briefingData.latest || null);
      }
    } catch (err: any) {
      setError('Failed to load business records. Please check local server.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBriefing() {
    setIsGeneratingBriefing(true);
    setBriefingError(null);
    try {
      const res = await fetch('/api/briefing', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setBriefingError(
          data.error || 'Failed to generate briefing. Ensure inference service is running.'
        );
      } else {
        setLatestBriefing(data);
      }
    } catch (err: any) {
      setBriefingError('Network error connecting to inference service: ' + err.message);
    } finally {
      setIsGeneratingBriefing(false);
    }
  }

  // Attention-needed products: Low stock or expiring soon
  const attentionItems = productsHealth.filter((p) => p.isLowStock || p.isExpiringSoon);

  // Chart data: Stock distribution by category
  const categoryStockData = React.useMemo(() => {
    const map: Record<string, number> = {};
    productsHealth.forEach((p) => {
      const cat = p.product.category;
      map[cat] = (map[cat] || 0) + p.product.currentStock;
    });
    return Object.entries(map).map(([name, units]) => ({ name, units }));
  }, [productsHealth]);

  // Chart data: Top products by retail inventory value
  const productValueData = React.useMemo(() => {
    return productsHealth
      .map((p) => ({
        name: p.product.name.length > 18 ? p.product.name.slice(0, 18) + '...' : p.product.name,
        value: Number((p.product.currentStock * p.product.sellingPrice).toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [productsHealth]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Bakery Overview & Health
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100/70 text-amber-800 border border-amber-200">
              Active Store Records
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Real-time inventory levels, deterministic margin calculations, and open-weight AI daily recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/marketing"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg shadow-subtle hover:bg-stone-50 transition-colors"
          >
            <Megaphone className="h-4 w-4 text-orange-600" />
            Marketing Studio
          </Link>
          <button
            onClick={handleGenerateBriefing}
            disabled={isGeneratingBriefing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${isGeneratingBriefing ? 'animate-spin' : ''}`} />
            {isGeneratingBriefing ? 'Analyzing Data...' : 'Generate Daily Briefing'}
          </button>
        </div>
      </div>

      {/* Briefing Error Toast / Alert */}
      {briefingError && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">AI Briefing Generation Unavailable</p>
            <p className="text-amber-800 leading-relaxed">{briefingError}</p>
            <p className="text-[11px] text-amber-700">
              Visit <Link href="/settings" className="underline font-semibold">AI Settings</Link> to inspect your local Transformers service status or configure Hugging Face credentials.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Total Products */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-medium">Catalog</span>
            <Package className="h-4 w-4 text-stone-400" />
          </div>
          <div className="text-xl font-bold text-stone-900">
            {inventoryMetrics?.totalProducts ?? 0}
          </div>
          <span className="text-[11px] text-stone-400">Total registered items</span>
        </div>

        {/* Metric 2: Total Units in Stock */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-medium">Inventory</span>
            <Boxes className="h-4 w-4 text-stone-400" />
          </div>
          <div className="text-xl font-bold text-stone-900">
            {inventoryMetrics?.totalUnitsInStock ?? 0}
          </div>
          <span className="text-[11px] text-stone-400">Available batch units</span>
        </div>

        {/* Metric 3: Low Stock Alerts */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-medium">Low Stock</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600">
            {inventoryMetrics?.lowStockCount ?? 0}
          </div>
          <span className="text-[11px] text-stone-400">At or below reorder</span>
        </div>

        {/* Metric 4: Expiry Alerts */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-medium">Expiring</span>
            <Clock className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600">
            {inventoryMetrics?.expiringSoonCount ?? 0}
          </div>
          <span className="text-[11px] text-stone-400">Within next 3 days</span>
        </div>

        {/* Metric 5: Recorded Sales Revenue */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-medium">Sales Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-stone-900">
            ${financialMetrics?.totalRevenue.toFixed(2) ?? '0.00'}
          </div>
          <span className="text-[11px] text-stone-400">
            {financialMetrics?.transactionCount ?? 0} recorded orders
          </span>
        </div>

        {/* Metric 6: Gross Profit & Margin with Missing Cost Notice */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-medium">Est. Gross Margin</span>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </div>
          {financialMetrics?.hasMissingCosts ? (
            <div>
              <div className="text-sm font-semibold text-amber-700 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Unrecorded Costs
              </div>
              <span className="text-[10px] text-stone-400">
                {financialMetrics.transactionsWithMissingCost} item(s) lack cost data
              </span>
            </div>
          ) : (
            <div>
              <div className="text-xl font-bold text-stone-900">
                {financialMetrics?.overallGrossMarginPercentage !== null
                  ? `${financialMetrics?.overallGrossMarginPercentage}%`
                  : 'N/A'}
              </div>
              <span className="text-[11px] text-stone-400">
                Profit: ${financialMetrics?.totalGrossProfit?.toFixed(2) ?? '0.00'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Daily Briefing + Products Needing Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): AI Daily Briefing Widget */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 shadow-subtle p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Daily Business Briefing</h2>
                  <p className="text-[11px] text-stone-400">
                    Generated by {latestBriefing?.modelUsed || 'Open-Weight Model'}
                  </p>
                </div>
              </div>
              <Link
                href="/briefing"
                className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                View Full Briefing <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {latestBriefing ? (
              <div className="space-y-3.5 text-xs text-stone-700">
                <div>
                  <h3 className="font-semibold text-stone-900 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Key Observations
                  </h3>
                  <ul className="space-y-1.5 text-stone-600 pl-5 list-disc">
                    {latestBriefing.keyObservations.slice(0, 3).map((obs, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {obs}
                      </li>
                    ))}
                  </ul>
                </div>

                {latestBriefing.suggestedActions.length > 0 && (
                  <div className="pt-2 border-t border-stone-100">
                    <h3 className="font-semibold text-stone-900 mb-1.5">Top Action Recommended:</h3>
                    <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/70">
                      <p className="font-medium text-stone-900">
                        {latestBriefing.suggestedActions[0].title}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5 leading-normal">
                        {latestBriefing.suggestedActions[0].rationale}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-stone-700">No Daily Briefing Generated Yet</p>
                <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1 mb-3">
                  Click the button below to have the open-weight model inspect inventory, sales, and costs to produce actionable recommendations.
                </p>
                <button
                  onClick={handleGenerateBriefing}
                  disabled={isGeneratingBriefing}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-sm"
                >
                  Generate Briefing Now
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
            <span>Date: {latestBriefing?.date || new Date().toISOString().split('T')[0]}</span>
            <span>Latency: {latestBriefing?.latencyMs ? `${latestBriefing.latencyMs} ms` : 'N/A'}</span>
          </div>
        </div>

        {/* Right Column (5 cols): Attention Required Products */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 shadow-subtle p-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-stone-900">Products Requiring Attention</h2>
            </div>
            <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
              {attentionItems.length}
            </span>
          </div>

          {attentionItems.length > 0 ? (
            <div className="divide-y divide-stone-100 max-h-[300px] overflow-y-auto pr-1">
              {attentionItems.map((item) => (
                <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-stone-900">{item.product.name}</span>
                      {item.isLowStock && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Stock: {item.product.currentStock}/{item.product.reorderThreshold}
                        </span>
                      )}
                      {item.isExpiringSoon && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          Expires in {item.daysUntilExpiry}d
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      ${item.product.sellingPrice.toFixed(2)} • {item.product.category}
                    </p>
                  </div>

                  <Link
                    href={`/marketing?productId=${item.product.id}`}
                    className="shrink-0 text-[11px] font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded transition-colors"
                  >
                    Promote
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-stone-400 text-xs">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
              All products are currently well-stocked and within safe shelf-life windows.
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-stone-100">
            <Link
              href="/inventory"
              className="text-xs text-stone-600 hover:text-stone-900 font-medium flex items-center justify-between"
            >
              <span>Manage all inventory records</span>
              <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Section: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Stock by Category */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-stone-900">Inventory Distribution by Category</h3>
            <span className="text-[11px] text-stone-400">Total units available</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716C' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E7E5E4',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="units" fill="#EA580C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Products by Inventory Retail Value */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-stone-900">Top Inventory Value on Shelves</h3>
            <span className="text-[11px] text-stone-400">Retail Value ($)</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={productValueData}
                margin={{ top: 10, right: 20, left: 30, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: '#78716C' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#78716C' }} />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Retail Value']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E7E5E4',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill="#946542" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
