'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Megaphone,
  History,
  ShieldAlert,
  Info,
  Layers,
  Cpu,
} from 'lucide-react';
import { DailyBriefing } from '@/lib/types';

export default function DailyBriefingPage() {
  const [latestBriefing, setLatestBriefing] = useState<DailyBriefing | null>(null);
  const [history, setHistory] = useState<DailyBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBriefings();
  }, []);

  async function loadBriefings() {
    setLoading(true);
    try {
      const res = await fetch('/api/briefing');
      if (res.ok) {
        const data = await res.json();
        setLatestBriefing(data.latest || null);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load briefings', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/briefing', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate briefing. Ensure inference service is running.');
      } else {
        setLatestBriefing(data);
        await loadBriefings();
      }
    } catch (err: any) {
      setError('Connection failure: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Daily AI Business Briefing
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-orange-100 text-orange-800 border border-orange-200">
              Open-Weight Intelligence
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Synthesizes current stock, batch shelf-life, and recorded sales into grounded morning recommendations.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating Structured Briefing...' : 'Generate New Briefing'}
        </button>
      </div>

      {/* Error / Diagnostic Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-900">Inference Service Response</p>
            <p className="text-rose-800 leading-relaxed">{error}</p>
            <p className="text-[11px] text-rose-700">
              Make sure your FastAPI server is started via `uvicorn ai_service.main:app` or check your{' '}
              <Link href="/settings" className="underline font-semibold">
                AI Transparency settings
              </Link>.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-xs text-stone-400">
          Loading business briefing records...
        </div>
      ) : latestBriefing ? (
        <div className="space-y-6">
          {/* Metadata pill bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-100/70 p-3.5 rounded-xl border border-stone-200 text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-900">Briefing Date:</span>
              <span>{latestBriefing.date}</span>
              <span>•</span>
              <span className="font-medium text-stone-900">Generated:</span>
              <span>{new Date(latestBriefing.generatedAt).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-medium text-stone-800">
                <Cpu className="h-3.5 w-3.5 text-orange-600" />
                Model: {latestBriefing.modelUsed}
              </span>
              <span>•</span>
              <span className="text-stone-500">Latency: {latestBriefing.latencyMs} ms</span>
            </div>
          </div>

          {/* Section 1: Key Observations */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-subtle space-y-3">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              1. Key Business Observations
            </h2>
            <p className="text-xs text-stone-500">
              Deterministic facts derived directly from your current inventory stock and recorded sales transactions.
            </p>
            <ul className="space-y-2 text-xs text-stone-700 pl-5 list-disc">
              {latestBriefing.keyObservations.map((obs, idx) => (
                <li key={idx} className="leading-relaxed">
                  {obs}
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2: Products Needing Attention (Facts vs Suggestions) */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-subtle space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                2. Products Requiring Immediate Attention
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Every item clearly separates the observed factual metric from the AI&apos;s proposed tactical suggestion.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestBriefing.productsNeedingAttention.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-col justify-between text-xs space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-stone-900 text-sm">{item.productName}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          item.urgency === 'high'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : item.urgency === 'medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-stone-200 text-stone-800'
                        }`}
                      >
                        {item.urgency} Urgency
                      </span>
                    </div>

                    {/* Observed Fact */}
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 mb-2">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">
                        Observed Fact
                      </span>
                      <p className="text-stone-700 leading-normal">{item.observedFact}</p>
                    </div>

                    {/* Root Cause / Reason */}
                    <div className="text-stone-600 text-[11px] mb-2">
                      <span className="font-semibold text-stone-800">Business Rationale: </span>
                      {item.reason}
                    </div>

                    {/* Suggested Action */}
                    <div className="bg-orange-50/80 p-2.5 rounded-lg border border-orange-200/70">
                      <span className="text-[10px] uppercase font-bold text-orange-800 block mb-0.5">
                        Suggested Recommendation
                      </span>
                      <p className="text-orange-950 font-medium leading-normal">
                        {item.suggestedAction}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200 flex justify-end">
                    <Link
                      href={`/marketing?productId=${item.productId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
                    >
                      <Megaphone className="h-3.5 w-3.5" />
                      Create Marketing Promotion
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Strategic Suggested Actions */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-subtle space-y-4">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              3. Operational & Commercial Action Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestBriefing.suggestedActions.map((act, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-stone-200 bg-white text-xs space-y-2">
                  <h3 className="font-semibold text-stone-900 text-sm">{act.title}</h3>
                  <p className="text-stone-600 leading-relaxed">
                    <span className="font-medium text-stone-800">Rationale: </span>
                    {act.rationale}
                  </p>
                  <p className="text-emerald-700 bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/60">
                    <span className="font-semibold">Expected Outcome: </span>
                    {act.expectedOutcome}
                  </p>
                  {act.riskOrConsideration && (
                    <p className="text-amber-800 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 text-[11px]">
                      <span className="font-semibold">Owner Risk Consideration: </span>
                      {act.riskOrConsideration}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Marketing Opportunities */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-subtle space-y-4">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-orange-600" />
              4. Suggested Marketing Campaigns
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {latestBriefing.marketingOpportunities.map((mkt, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900">{mkt.targetItem}</span>
                    <span className="text-[10px] uppercase font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                      {mkt.channel}
                    </span>
                  </div>
                  <p className="text-stone-600 text-[11px] leading-relaxed">{mkt.angle}</p>
                  {mkt.suggestedTiming && (
                    <p className="text-stone-400 text-[10px] flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Best window: {mkt.suggestedTiming}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Missing Information & Uncertainties */}
          <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-5 space-y-2 text-xs text-amber-900">
            <h3 className="font-semibold text-amber-950 flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-amber-700" />
              5. Identified Uncertainties & Missing Information
            </h3>
            <p className="text-amber-800 text-[11px]">
              The model explicitly reports missing data points to prevent false financial precision or unsupported assumptions.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-amber-900">
              {latestBriefing.missingInfoAndUncertainties.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-xs text-stone-500">
          No briefings generated yet. Click &quot;Generate New Briefing&quot; above to begin.
        </div>
      )}

      {/* Briefings Archive / History */}
      {history.length > 1 && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-subtle p-5 space-y-3">
          <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <History className="h-4 w-4 text-stone-400" />
            Previous Briefings History
          </h2>
          <div className="divide-y divide-stone-100 text-xs">
            {history.slice(1).map((b) => (
              <div key={b.id} className="py-2.5 flex items-center justify-between text-stone-600">
                <div>
                  <span className="font-semibold text-stone-900">{b.date}</span>
                  <span className="text-stone-400 ml-2">
                    {b.keyObservations.length} observations • {b.productsNeedingAttention.length} attention items
                  </span>
                </div>
                <span className="text-[11px] text-stone-400">{b.modelUsed}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
