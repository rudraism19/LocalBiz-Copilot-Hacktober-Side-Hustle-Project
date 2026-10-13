import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { getAIProvider } from '@/lib/ai';
import { GenerateMarketingRequestSchema } from '@/lib/types';

export async function GET() {
  try {
    const storage = getStorage();
    const history = await storage.getMarketingHistory(20);
    return NextResponse.json({ history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = GenerateMarketingRequestSchema.parse(body);

    const storage = getStorage();
    const brandProfile = await storage.getBrandProfile();

    const aiProvider = getAIProvider();

    // Health check pre-flight: ensure service is reachable
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

    const marketingResult = await aiProvider.generateMarketingContent(
      validated,
      brandProfile
    );

    // Save to history
    await storage.saveMarketingContent(marketingResult);

    return NextResponse.json(marketingResult);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to generate marketing content' },
      { status: 500 }
    );
  }
}
