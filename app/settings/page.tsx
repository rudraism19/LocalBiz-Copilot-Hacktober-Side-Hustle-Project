'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Cloud,
  FileCode,
  Terminal,
  Lock,
  Layers,
  ArrowRight,
  ExternalLink,
  Play,
  Zap,
} from 'lucide-react';
import { AIProviderStatus } from '@/lib/types';

interface HealthData {
  status: string;
  ai: AIProviderStatus;
  storage: {
    mode: string;
    isLocal: boolean;
    description: string;
  };
  environment: {
    nodeEnv: string;
    configuredModel: string;
    configuredProvider: string;
  };
}

export default function SettingsPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [checking, setChecking] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelMessage, setModelMessage] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('Qwen/Qwen2.5-0.5B-Instruct');

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    setChecking(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
        if (data.ai?.modelId) {
          setSelectedModel(data.ai.modelId);
        }
      }
    } catch (err) {
      console.error('Health check failed', err);
    } finally {
      setChecking(false);
    }
  }

  async function handleLoadModel(targetModelId?: string) {
    const modelToLoad = targetModelId || selectedModel;
    setLoadingModel(true);
    setModelMessage(null);
    setModelError(null);

    try {
      const res = await fetch('/api/model/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelToLoad }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModelError(data.error || 'Failed to load model.');
      } else {
        setModelMessage(data.message || `Model '${modelToLoad}' loaded successfully!`);
        await checkHealth();
      }
    } catch (err: any) {
      setModelError('Failed to communicate with model loader: ' + err.message);
    } finally {
      setLoadingModel(false);
    }
  }

  const ai = healthData?.ai;
  const storage = healthData?.storage;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-stone-200/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              AI Transparency & Runtime Settings
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-orange-100 text-orange-800 border border-orange-200">
              Open-Weight Auditing
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Verify active model checkpoints, hardware compute devices, local vs hosted boundaries, and permissive open licenses.
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={checking || loadingModel}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg shadow-subtle hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin text-orange-600' : 'text-stone-500'}`} />
          {checking ? 'Probing Runtime...' : 'Re-check Connection'}
        </button>
      </div>

      {/* Notifications */}
      {modelMessage && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{modelMessage}</span>
        </div>
      )}

      {modelError && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{modelError}</span>
        </div>
      )}

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Active Model & Inference Backend */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-subtle p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-orange-600" />
              <h2 className="text-sm font-semibold text-stone-900">Inference Engine</h2>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                ai?.isLocal
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              {ai?.isLocal ? 'On-Premise (Local)' : 'Cloud Hosted'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-stone-400 block mb-0.5">Active Model Checkpoint</span>
              <span className="font-bold text-stone-900 font-mono text-[13px]">
                {ai?.modelId || healthData?.environment.configuredModel || 'Qwen/Qwen2.5-0.5B-Instruct'}
              </span>
            </div>

            <div>
              <span className="text-stone-400 block mb-0.5">Inference Provider Architecture</span>
              <span className="font-semibold text-stone-800">
                {ai?.provider === 'local_transformers'
                  ? 'LocalTransformersProvider (Python 3.11 + FastAPI + PyTorch)'
                  : 'HuggingFaceInferenceProvider (Server-side Token Adapter)'}
              </span>
            </div>

            <div>
              <span className="text-stone-400 block mb-0.5">Hardware Device</span>
              <span className="font-medium text-stone-800">
                {ai?.device ? ai.device.toUpperCase() : 'CPU / Auto-selected'}
              </span>
            </div>

            <div>
              <span className="text-stone-400 block mb-1">Connection & Memory Status</span>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {ai?.ready ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      FastAPI Service Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      Service Offline
                    </span>
                  )}
                  {ai?.latencyMs !== undefined && (
                    <span className="text-stone-400 text-[11px]">({ai.latencyMs} ms ping)</span>
                  )}
                </div>

                <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        ai?.modelLoaded ? 'bg-emerald-500' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-[11px] font-medium text-stone-700">
                      {ai?.modelLoaded ? 'Weights Loaded in RAM' : 'Weights on Standby'}
                    </span>
                  </div>

                  {ai?.ready && (
                    <button
                      onClick={() => handleLoadModel()}
                      disabled={loadingModel}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <Zap className={`h-3 w-3 ${loadingModel ? 'animate-spin' : ''}`} />
                      {loadingModel ? 'Loading...' : ai?.modelLoaded ? 'Reload' : 'Load Into RAM'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 leading-relaxed text-[11px]">
              {ai?.message || 'No connection message available.'}
            </div>
          </div>
        </div>

        {/* Card 2: Persistence & Storage Privacy */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-subtle p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-stone-700" />
              <h2 className="text-sm font-semibold text-stone-900">Data Persistence & Storage</h2>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                storage?.isLocal
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              {storage?.mode === 'local_json' ? 'Local JSON' : 'Supabase PostgreSQL'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-stone-400 block mb-0.5">Active Storage Driver</span>
              <span className="font-semibold text-stone-800">
                {storage?.mode === 'local_json'
                  ? 'LocalStorageAdapter (data/local-biz-store.json)'
                  : 'SupabaseStorageAdapter (Cloud PostgreSQL with RLS)'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 leading-relaxed text-[11px]">
              {storage?.description}
            </div>

            <div className="border-t border-stone-100 pt-3">
              <h3 className="font-semibold text-stone-900 mb-1 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-stone-500" />
                Data Privacy Guarantee
              </h3>
              <p className="text-stone-500 text-[11px] leading-relaxed">
                When running in Local mode, business recipes, product margins, and customer sales are never transmitted over the internet or sent to third-party proprietary APIs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selection & Instant Switcher */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-subtle p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-600" />
            Switch Active Open-Weight Checkpoint
          </h2>
          <span className="text-stone-400 text-[11px]">Instant on-demand swapping</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Qwen 2.5 0.5B (Fastest) */}
          <div
            onClick={() => setSelectedModel('Qwen/Qwen2.5-0.5B-Instruct')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedModel === 'Qwen/Qwen2.5-0.5B-Instruct'
                ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-stone-900">Qwen 2.5 0.5B</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                Fastest CPU
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-normal mb-2">
              ~900MB memory footprint. Loads in seconds and generates briefings in ~500ms on standard CPUs. Apache 2.0.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadModel('Qwen/Qwen2.5-0.5B-Instruct');
              }}
              disabled={loadingModel}
              className="w-full py-1 text-[11px] font-semibold rounded bg-stone-900 text-white hover:bg-black transition-colors"
            >
              {ai?.modelId === 'Qwen/Qwen2.5-0.5B-Instruct' && ai?.modelLoaded ? 'Active in RAM' : 'Activate 0.5B'}
            </button>
          </div>

          {/* Option 2: Qwen 2.5 1.5B (Standard) */}
          <div
            onClick={() => setSelectedModel('Qwen/Qwen2.5-1.5B-Instruct')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedModel === 'Qwen/Qwen2.5-1.5B-Instruct'
                ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-stone-900">Qwen 2.5 1.5B</span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                High Precision
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-normal mb-2">
              ~3GB memory footprint. Higher reasoning and extended bilingual depth. Apache 2.0 verified.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadModel('Qwen/Qwen2.5-1.5B-Instruct');
              }}
              disabled={loadingModel}
              className="w-full py-1 text-[11px] font-semibold rounded bg-stone-900 text-white hover:bg-black transition-colors"
            >
              {ai?.modelId === 'Qwen/Qwen2.5-1.5B-Instruct' && ai?.modelLoaded ? 'Active in RAM' : 'Activate 1.5B'}
            </button>
          </div>

          {/* Option 3: Google Gemma 4 E4B (Gated) */}
          <div
            onClick={() => setSelectedModel('google/gemma-4-E4B-it')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedModel === 'google/gemma-4-E4B-it'
                ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-stone-900">Gemma 4 E4B</span>
              <span className="text-[10px] font-bold text-stone-700 bg-stone-200 px-1.5 py-0.5 rounded">
                Gemma Terms
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-normal mb-2">
              Google&apos;s effective 4B edge model with thinking modes. Requires Hugging Face token with accepted terms.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadModel('google/gemma-4-E4B-it');
              }}
              disabled={loadingModel}
              className="w-full py-1 text-[11px] font-semibold rounded bg-stone-200 text-stone-800 hover:bg-stone-300 transition-colors"
            >
              {ai?.modelId === 'google/gemma-4-E4B-it' && ai?.modelLoaded ? 'Active in RAM' : 'Activate Gemma'}
            </button>
          </div>
        </div>
      </div>

      {/* Developer Setup Guide */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-subtle p-6 space-y-4 text-xs">
        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-stone-700" />
          Terminal Commands
        </h2>

        <div className="space-y-3 text-stone-600">
          <p>
            <strong>To Start the Python Inference Microservice:</strong>
          </p>
          <pre className="p-3 rounded-lg bg-stone-900 text-amber-300 font-mono text-[11px] overflow-x-auto">
            {`# Windows:
.\\ai_service\\.venv\\Scripts\\uvicorn.exe ai_service.main:app --host 127.0.0.1 --port 8000

# macOS / Linux:
source ai_service/.venv/bin/activate
uvicorn ai_service.main:app --host 127.0.0.1 --port 8000`}
          </pre>
        </div>
      </div>
    </div>
  );
}
