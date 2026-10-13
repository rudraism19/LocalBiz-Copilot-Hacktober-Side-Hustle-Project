'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  Sparkles,
  Megaphone,
  Store,
  Cpu,
  RefreshCw,
  Menu,
  X,
  AlertCircle,
  CheckCircle2,
  Coffee,
} from 'lucide-react';

interface AIStatus {
  ready: boolean;
  modelId: string;
  provider: string;
  isLocal: boolean;
  message: string;
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setAiStatus(data.ai);
        }
      } catch (err) {
        setAiStatus({
          ready: false,
          modelId: 'Unavailable',
          provider: 'unknown',
          isLocal: true,
          message: 'Offline',
        });
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/inventory', label: 'Inventory', icon: Boxes },
    { href: '/sales', label: 'Sales & Profit', icon: TrendingUp },
    { href: '/briefing', label: 'Daily Briefing', icon: Sparkles },
    { href: '/marketing', label: 'Marketing Studio', icon: Megaphone },
    { href: '/brand', label: 'Brand Profile', icon: Store },
    { href: '/settings', label: 'AI Transparency', icon: Cpu },
  ];

  async function handleResetData() {
    if (!confirm('Reset business records to initial artisan bakery sample data?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Failed to reset demo data');
      }
    } catch (err) {
      alert('Error resetting demo data');
    } finally {
      setIsResetting(false);
    }
  }

  const modelShortName = aiStatus?.modelId
    ? aiStatus.modelId.split('/').pop() || aiStatus.modelId
    : 'Qwen2.5-1.5B';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-[#FDFBF7]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white shadow-sm">
              <Coffee className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight text-stone-900 text-base leading-none">
                LocalBiz Copilot
              </span>
              <span className="text-[11px] font-medium text-stone-500 tracking-wide">
                Bakery & Café Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-orange-50 text-orange-700 font-semibold border border-orange-200/60'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-orange-600' : 'text-stone-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side status & action buttons */}
        <div className="flex items-center gap-3">
          {/* AI Model Status Badge */}
          <Link
            href="/settings"
            title={aiStatus?.message || 'Check AI Model Status'}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-stone-200 bg-white text-[11px] text-stone-600 shadow-subtle hover:border-orange-300 transition-colors"
          >
            <span className="flex h-2 w-2 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  aiStatus?.ready ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  aiStatus?.ready ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="font-medium text-stone-700">
              {aiStatus?.isLocal ? 'Local:' : 'Cloud:'} {modelShortName}
            </span>
            {aiStatus?.ready ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            ) : (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </Link>

          {/* Reset Demo Data */}
          <button
            onClick={handleResetData}
            disabled={isResetting}
            title="Reset to realistic bakery sample data"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 rounded-md bg-stone-50 hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-stone-500 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Reset Demo</span>
          </button>

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-stone-200 bg-[#FDFBF7] px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 font-semibold'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-orange-600' : 'text-stone-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
