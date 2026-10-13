'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Megaphone,
  Sparkles,
  Copy,
  Check,
  Languages,
  Share2,
  Instagram,
  MessageSquare,
  Tag,
  Info,
  ShieldCheck,
  History,
  RotateCcw,
} from 'lucide-react';
import {
  ProductHealthStatus,
  BrandProfile,
  MarketingContentResult,
  BrandTone,
  MarketingCampaignObjective,
  MarketingLanguage,
  MarketingPlatform,
} from '@/lib/types';

function MarketingStudio() {
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get('productId');

  const [products, setProducts] = useState<ProductHealthStatus[]>([]);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [history, setHistory] = useState<MarketingContentResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [campaignObjective, setCampaignObjective] =
    useState<MarketingCampaignObjective>('boost_slow_moving');
  const [brandTone, setBrandTone] = useState<BrandTone>('warm_artisan');
  const [language, setLanguage] = useState<MarketingLanguage>('en');
  const [preferredPlatform, setPreferredPlatform] = useState<MarketingPlatform>('both');
  const [optionalDiscount, setOptionalDiscount] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<MarketingContentResult | null>(null);

  // Editable Outputs State
  const [editableHeadline, setEditableHeadline] = useState('');
  const [editableInstagram, setEditableInstagram] = useState('');
  const [editableWhatsApp, setEditableWhatsApp] = useState('');
  const [editableCta, setEditableCta] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [preselectedProductId]);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [prodRes, brandRes, mktRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/brand'),
        fetch('/api/marketing'),
      ]);

      if (brandRes.ok) {
        const brand = await brandRes.json();
        setBrandProfile(brand);
        setBrandTone(brand.brandTone || 'warm_artisan');
        setTargetAudience(brand.targetAudience || '');
      }

      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(pData.products || []);

        const targetId = preselectedProductId || (pData.products?.[0]?.product?.id ?? '');
        if (targetId) {
          applyProductSelection(targetId, pData.products);
        }
      }

      if (mktRes.ok) {
        const mktData = await mktRes.json();
        setHistory(mktData.history || []);
      }
    } catch (err) {
      console.error('Failed to load marketing data', err);
    } finally {
      setLoading(false);
    }
  }

  function applyProductSelection(id: string, list = products) {
    setSelectedProductId(id);
    const item = list.find((p) => p.product.id === id);
    if (item) {
      setProductName(item.product.name);
      setProductDescription(item.product.description || '');
      setSellingPrice(item.product.sellingPrice.toString());
      if (item.isExpiringSoon) {
        setCampaignObjective('clear_expiring_stock');
        setOptionalDiscount('15% off afternoon special');
      } else if (item.isLowStock) {
        setCampaignObjective('boost_slow_moving');
      }
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    const priceNum = parseFloat(sellingPrice);
    if (!productName.trim()) {
      setError('Please select or specify a product.');
      setIsGenerating(false);
      return;
    }

    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId || 'custom-prod',
          productName,
          productDescription,
          sellingPrice: isNaN(priceNum) ? 5.0 : priceNum,
          campaignObjective,
          brandTone,
          language,
          preferredPlatform,
          optionalDiscount: optionalDiscount.trim() || undefined,
          targetAudience: targetAudience.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate promotional content.');
      } else {
        setGeneratedResult(data);
        setEditableHeadline(data.headline);
        setEditableInstagram(data.instagramCaption);
        setEditableWhatsApp(data.whatsappMessage);
        setEditableCta(data.callToAction);
        setHistory((prev) => [data, ...prev.slice(0, 19)]);
      }
    } catch (err: any) {
      setError('Network connection error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Artisan Marketing Studio
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-orange-100 text-orange-800 border border-orange-200">
              Bilingual (English & Hindi)
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Generate high-converting, strictly fact-grounded Instagram captions and WhatsApp promotional broadcasts.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-start gap-3">
          <Info className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Generation Notice</p>
            <p className="text-rose-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Form on Left, Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inputs Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 shadow-subtle p-5">
          <h2 className="text-sm font-semibold text-stone-900 mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-orange-600" />
            Campaign Parameters
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4 text-xs">
            {/* Product Selector */}
            <div>
              <label className="block font-medium text-stone-700 mb-1">Select Catalog Item</label>
              <select
                value={selectedProductId}
                onChange={(e) => applyProductSelection(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              >
                {products.map((item) => (
                  <option key={item.product.id} value={item.product.id}>
                    {item.product.name} (${item.product.sellingPrice.toFixed(2)})
                    {item.isExpiringSoon ? ' [Expires Soon!]' : ''}
                    {item.isLowStock ? ' [Low Stock]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Price & Language */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Selling Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1 flex items-center gap-1">
                  <Languages className="h-3.5 w-3.5 text-stone-400" />
                  Language *
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as MarketingLanguage)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 font-medium focus:outline-none focus:border-orange-500"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>
            </div>

            {/* Campaign Objective */}
            <div>
              <label className="block font-medium text-stone-700 mb-1">Campaign Objective</label>
              <select
                value={campaignObjective}
                onChange={(e) =>
                  setCampaignObjective(e.target.value as MarketingCampaignObjective)
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              >
                <option value="boost_slow_moving">Boost Slow-Moving Inventory</option>
                <option value="clear_expiring_stock">Clear Fresh Expiring Stock</option>
                <option value="new_arrival_launch">New Seasonal Pastry Launch</option>
                <option value="weekend_special">Weekend Brunch Special</option>
                <option value="loyalty_appreciation">Customer Loyalty & VIP Appreciation</option>
              </select>
            </div>

            {/* Platform & Tone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Platform</label>
                <select
                  value={preferredPlatform}
                  onChange={(e) =>
                    setPreferredPlatform(e.target.value as MarketingPlatform)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="both">Both (Instagram + WhatsApp)</option>
                  <option value="instagram">Instagram Post</option>
                  <option value="whatsapp">WhatsApp Broadcast</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Brand Tone</label>
                <select
                  value={brandTone}
                  onChange={(e) => setBrandTone(e.target.value as BrandTone)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="warm_artisan">Warm & Artisan</option>
                  <option value="modern_chic">Modern & Minimal</option>
                  <option value="friendly_neighborhood">Friendly Neighborhood</option>
                  <option value="premium_luxury">Premium Luxury</option>
                  <option value="cozy_rustic">Cozy & Rustic</option>
                </select>
              </div>
            </div>

            {/* Optional Promotion / Discount */}
            <div>
              <label className="block font-medium text-stone-700 mb-1">
                Optional Discount or Deal Offer
              </label>
              <input
                type="text"
                placeholder="e.g., Buy 1 get 50% off second loaf after 2 PM"
                value={optionalDiscount}
                onChange={(e) => setOptionalDiscount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">
                Leave blank if full price. AI will never fabricate a discount unless specified here.
              </p>
            </div>

            {/* Product Description */}
            <div>
              <label className="block font-medium text-stone-700 mb-1">
                Factual Ingredients & Flavor Notes
              </label>
              <textarea
                rows={3}
                placeholder="e.g., 36-hour wild fermentation, French cultured butter, Maldon sea salt."
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* AI Guardrail Callout */}
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-600 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Guardrail Active:</strong> The open-weight model is strictly prohibited from inventing health benefits, organic labels, or discounts not explicitly provided.
              </span>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating Marketing Content...' : 'Generate Promotional Campaign'}
            </button>
          </form>
        </div>

        {/* Right Column: Output Previews (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {generatedResult ? (
            <div className="bg-white rounded-xl border border-stone-200 shadow-subtle p-5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    {generatedResult.language === 'hi' ? 'हिंदी (Hindi)' : 'English'} Campaign
                  </span>
                  <h3 className="text-sm font-semibold text-stone-900 mt-1">
                    Generated Content for {generatedResult.productName}
                  </h3>
                </div>
                <div className="text-[11px] text-stone-400">
                  Latency: {generatedResult.latencyMs} ms • {generatedResult.modelUsed}
                </div>
              </div>

              {/* Strategic Explanation */}
              <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200/80 text-xs">
                <span className="font-semibold text-stone-900 block mb-1">
                  Proposed Marketing Angle:
                </span>
                <p className="text-stone-600 leading-relaxed">
                  {generatedResult.strategicExplanation}
                </p>
              </div>

              {/* Headline */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-1">
                  <span>Headline Hook</span>
                  <button
                    onClick={() => copyToClipboard(editableHeadline, 'headline')}
                    className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-900"
                  >
                    {copiedKey === 'headline' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedKey === 'headline' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <input
                  type="text"
                  value={editableHeadline}
                  onChange={(e) => setEditableHeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Instagram Caption */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5 text-rose-600" />
                    Instagram Caption
                  </span>
                  <button
                    onClick={() => copyToClipboard(editableInstagram, 'instagram')}
                    className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-900"
                  >
                    {copiedKey === 'instagram' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedKey === 'instagram' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={editableInstagram}
                  onChange={(e) => setEditableInstagram(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-800 leading-relaxed focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* WhatsApp Message */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-1">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    WhatsApp Broadcast Message
                  </span>
                  <button
                    onClick={() => copyToClipboard(editableWhatsApp, 'whatsapp')}
                    className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-900"
                  >
                    {copiedKey === 'whatsapp' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedKey === 'whatsapp' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={editableWhatsApp}
                  onChange={(e) => setEditableWhatsApp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-800 leading-relaxed font-sans bg-emerald-50/20 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Call to Action */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-1">
                  <span>Call to Action (CTA)</span>
                  <button
                    onClick={() => copyToClipboard(editableCta, 'cta')}
                    className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-900"
                  >
                    {copiedKey === 'cta' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedKey === 'cta' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <input
                  type="text"
                  value={editableCta}
                  onChange={(e) => setEditableCta(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Suggested Hashtags */}
              {generatedResult.suggestedHashtags.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-stone-800 block mb-1.5">
                    Suggested Hashtags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedResult.suggestedHashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px] font-medium"
                      >
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-xs text-stone-400">
              <Megaphone className="h-8 w-8 text-stone-300 mx-auto mb-2" />
              <p className="font-semibold text-stone-700">No Content Generated Yet</p>
              <p className="text-stone-400 mt-1 max-w-sm mx-auto">
                Select an item and objective on the left, then click &quot;Generate Promotional Campaign&quot;.
              </p>
            </div>
          )}

          {/* Marketing History */}
          {history.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-subtle p-5 space-y-3">
              <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <History className="h-4 w-4 text-stone-400" />
                Previous Marketing Generations
              </h3>
              <div className="divide-y divide-stone-100 text-xs">
                {history.slice(0, 5).map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-stone-600">
                    <div>
                      <span className="font-semibold text-stone-900">{m.productName}</span>
                      <span className="text-stone-400 ml-2">
                        {m.language.toUpperCase()} • &quot;{m.headline}&quot;
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setGeneratedResult(m);
                        setEditableHeadline(m.headline);
                        setEditableInstagram(m.instagramCaption);
                        setEditableWhatsApp(m.whatsappMessage);
                        setEditableCta(m.callToAction);
                      }}
                      className="text-[11px] text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Load
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-xs text-stone-400">
          Loading Marketing Studio...
        </div>
      }
    >
      <MarketingStudio />
    </Suspense>
  );
}
