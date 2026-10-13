import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { getAIProvider } from '@/lib/ai';
import { calculateFinancialMetrics, evaluateProductHealth } from '@/lib/calculations';
import { Product } from '@/lib/types';

export async function GET() {
  try {
    const storage = getStorage();
    const [briefings, latest] = await Promise.all([
      storage.getBriefings(10),
      storage.getLatestBriefing(),
    ]);

    return NextResponse.json({
      latest,
      history: briefings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const storage = getStorage();
    const [products, transactions, brandProfile] = await Promise.all([
      storage.getProducts(),
      storage.getTransactions(),
      storage.getBrandProfile(),
    ]);

    const refDate = new Date();
    const productsHealth = products.map((p) => evaluateProductHealth(p, refDate));

    const productsMap = new Map<string, Product>();
    products.forEach((p) => productsMap.set(p.id, p));

    const financialMetrics = calculateFinancialMetrics(transactions, productsMap);

    const aiProvider = getAIProvider();

    // Check status first to fail fast with a helpful troubleshooting message if service is offline
    const status = await aiProvider.getStatus();
    if (!status.ready) {
      return NextResponse.json(
        {
          error: status.message,
          troubleshooting: status.troubleshootingGuide,
          provider: aiProvider.name,
          modelId: aiProvider.modelId,
          isLocal: aiProvider.isLocal,
        },
        { status: 503 }
      );
    }

    const briefing = await aiProvider.generateDailyBriefing({
      brandProfile,
      financialMetrics,
      productsHealth,
      recentTransactionsCount: transactions.length,
    });

    // Save to storage
    await storage.saveBriefing(briefing);

    return NextResponse.json(briefing);
  } catch (error: any) {
    console.error('Error generating daily briefing:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate briefing.',
        details: 'Ensure your inference service is running or check model configuration.',
      },
      { status: 500 }
    );
  }
}
