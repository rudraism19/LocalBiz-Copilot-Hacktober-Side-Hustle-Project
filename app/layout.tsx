import './globals.css';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import Link from 'next/link';
import { ShieldCheck, Cpu, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'LocalBiz Copilot — AI Assistant for Independent Bakeries & Cafés',
  description:
    'Turn structured bakery inventory and sales data into actionable daily briefings, margin insights, and bilingual Instagram/WhatsApp marketing content using open-weight AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#FDFBF7] text-stone-900 selection:bg-orange-100 selection:text-orange-900">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-stone-200 bg-white/80 py-6 text-xs text-stone-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-700">LocalBiz Copilot</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-stone-600">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Zero-Telemetry Local Storage Option Active
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-stone-600">
                <Cpu className="h-3.5 w-3.5 text-orange-600" />
                Powered by Open-Weight Transformers (Apache 2.0 / Gemma Terms)
              </span>
              <span>•</span>
              <Link href="/settings" className="hover:text-stone-900 underline underline-offset-2">
                Model Transparency
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
