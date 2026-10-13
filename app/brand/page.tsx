'use client';

import React, { useState, useEffect } from 'react';
import {
  Store,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  DollarSign,
  Languages,
} from 'lucide-react';
import { BrandProfile, BrandTone, BrandLanguage } from '@/lib/types';

export default function BrandProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<BrandLanguage>('en');
  const [brandTone, setBrandTone] = useState<BrandTone>('warm_artisan');
  const [targetAudience, setTargetAudience] = useState('');
  const [differentiators, setDifferentiators] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('150');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    loadBrandProfile();
  }, []);

  async function loadBrandProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/brand');
      if (res.ok) {
        const data: BrandProfile = await res.json();
        setBusinessName(data.businessName || '');
        setCategory(data.category || '');
        setLocation(data.location || '');
        setPreferredLanguage(data.preferredLanguage || 'en');
        setBrandTone(data.brandTone || 'warm_artisan');
        setTargetAudience(data.targetAudience || '');
        setDifferentiators(data.productsAndDifferentiators || '');
        setMonthlyBudget(data.monthlyPromoBudget ? data.monthlyPromoBudget.toString() : '150');
        setCurrency(data.currency || 'USD');
      }
    } catch (err) {
      console.error('Failed to load brand profile', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const budgetNum = parseFloat(monthlyBudget);
    if (isNaN(budgetNum) || budgetNum < 0) {
      setErrorMessage('Monthly promotion budget must be a positive number.');
      setSaving(false);
      return;
    }

    const payload = {
      businessName: businessName.trim(),
      category: category.trim(),
      location: location.trim(),
      preferredLanguage,
      brandTone,
      targetAudience: targetAudience.trim(),
      productsAndDifferentiators: differentiators.trim(),
      monthlyPromoBudget: budgetNum,
      currency: currency.trim() || 'USD',
    };

    try {
      const res = await fetch('/api/brand', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update brand profile');
      }

      setSuccessMessage('Brand profile successfully saved! AI context updated.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-stone-200/80 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Bakery Brand Profile
          </h1>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
            Structured AI Context
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Configure your bakery&apos;s identity, culinary philosophy, and tone. This data is injected into every open-weight prompt to maintain brand consistency.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-stone-200 shadow-subtle p-6 space-y-6 text-xs">
        {/* Core Identity */}
        <div>
          <h2 className="text-sm font-semibold text-stone-900 mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
            <Store className="h-4 w-4 text-orange-600" />
            1. Core Business Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Bakery / Café Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., WarmCrust Artisan Bakery & Café"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-medium text-stone-700 mb-1">Business Category *</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Artisan Sourdough Bakery & Specialty Coffee"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-medium text-stone-700 mb-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-stone-400" />
                Location & Service Area *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Downtown Market Square, Sector 4"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-medium text-stone-700 mb-1 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-stone-400" />
                Monthly Promotion Budget ($) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Guardrail: Briefing will check that proposed discounts stay within this budget.
              </p>
            </div>
          </div>
        </div>

        {/* Tone and Audience */}
        <div>
          <h2 className="text-sm font-semibold text-stone-900 mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-600" />
            2. Tone & Communication Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Brand Voice & Tone</label>
              <select
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value as BrandTone)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              >
                <option value="warm_artisan">Warm & Artisan (Handcrafted, authentic, crust-focused)</option>
                <option value="modern_chic">Modern & Minimal (Clean, sleek, contemporary)</option>
                <option value="friendly_neighborhood">Friendly Neighborhood (Welcoming, casual, community)</option>
                <option value="premium_luxury">Premium Luxury (Exclusive, single-origin, indulgent)</option>
                <option value="cozy_rustic">Cozy & Rustic (Homestyle, comfort, heritage)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-stone-700 mb-1 flex items-center gap-1">
                <Languages className="h-3.5 w-3.5 text-stone-400" />
                Preferred Default Language
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as BrandLanguage)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="both">Bilingual English + Hindi</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-stone-700 mb-1">
                Target Customer Profile *
              </label>
              <textarea
                rows={2}
                required
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Local neighborhood families, weekend sourdough enthusiasts, remote workers seeking quality pour-overs."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-stone-700 mb-1">
                Signature Products & Key Differentiators *
              </label>
              <textarea
                rows={3}
                required
                value={differentiators}
                onChange={(e) => setDifferentiators(e.target.value)}
                placeholder="e.g., 36-hour cold-fermented wild sourdough with organic stoneground flours, double-baked almond croissants with French cultured butter, zero commercial yeast additives."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-orange-500"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                AI uses these authentic differentiators in headlines and WhatsApp broadcasts.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving Profile...' : 'Save Brand Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
