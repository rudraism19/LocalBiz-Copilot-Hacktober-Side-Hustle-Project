import { describe, it, expect, beforeEach } from 'vitest';
import { getAIProvider, resetAIProvider } from '../lib/ai';
import { LocalTransformersProvider } from '../lib/ai/local-provider';
import { HuggingFaceInferenceProvider } from '../lib/ai/huggingface-provider';
import { DailyBriefingSchema, MarketingContentResultSchema } from '../lib/types';

describe('AI Provider Abstraction Layer', () => {
  beforeEach(() => {
    resetAIProvider();
    delete process.env.AI_PROVIDER;
    delete process.env.HF_TOKEN;
  });

  it('defaults to LocalTransformersProvider when AI_PROVIDER is unset', () => {
    const provider = getAIProvider();
    expect(provider.name).toBe('local_transformers');
    expect(provider.isLocal).toBe(true);
  });

  it('selects HuggingFaceInferenceProvider when AI_PROVIDER is huggingface_inference', () => {
    process.env.AI_PROVIDER = 'huggingface_inference';
    const provider = getAIProvider();
    expect(provider.name).toBe('huggingface_inference');
    expect(provider.isLocal).toBe(false);
  });

  it('handles offline local inference service gracefully in getStatus()', async () => {
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:9999'; // Non-existent port
    const provider = new LocalTransformersProvider();
    const status = await provider.getStatus();

    expect(status.ready).toBe(false);
    expect(status.isLocal).toBe(true);
    expect(status.message).toContain('offline');
    expect(status.troubleshootingGuide).toBeDefined();
    expect(status.troubleshootingGuide).toContain('uvicorn');
  });

  it('handles missing HF_TOKEN gracefully in HuggingFaceInferenceProvider', async () => {
    delete process.env.HF_TOKEN;
    const provider = new HuggingFaceInferenceProvider();
    const status = await provider.getStatus();

    expect(status.ready).toBe(false);
    expect(status.isLocal).toBe(false);
    expect(status.message).toContain('HF_TOKEN');
  });

  it('validates structured daily briefing against Zod schema', () => {
    const validBriefing = {
      id: 'briefing-test',
      date: '2026-10-13',
      keyObservations: ['Sales steady at $150'],
      productsNeedingAttention: [
        {
          productId: 'prod-1',
          productName: 'Croissant',
          urgency: 'high',
          observedFact: '2 units left in stock',
          reason: 'Impending stockout',
          suggestedAction: 'Bake a fresh afternoon batch',
        },
      ],
      suggestedActions: [
        {
          title: 'Afternoon bake',
          rationale: 'High demand items low in stock',
          expectedOutcome: 'Retain afternoon tea sales',
        },
      ],
      marketingOpportunities: [
        {
          angle: 'Fresh warm croissants at 3 PM',
          targetItem: 'Croissant',
          channel: 'instagram',
        },
      ],
      missingInfoAndUncertainties: ['Weather forecast unconfirmed'],
      generatedAt: new Date().toISOString(),
      modelUsed: 'Qwen/Qwen2.5-1.5B-Instruct',
      inferenceProvider: 'local_transformers',
      latencyMs: 1200,
    };

    const parsed = DailyBriefingSchema.safeParse(validBriefing);
    expect(parsed.success).toBe(true);
  });

  it('validates marketing content result against Zod schema', () => {
    const validMarketing = {
      id: 'mkt-test',
      productId: 'prod-1',
      productName: 'Country Sourdough',
      language: 'en',
      headline: 'Freshly Baked Crust That Speaks For Itself',
      instagramCaption: 'Golden, blistered crust, airy crumb. Freshly pulled from our stone deck oven this morning.',
      whatsappMessage: '*WarmCrust Alert:* Fresh Sourdough loaves are hot on the racks! Reserve yours before 2 PM.',
      callToAction: 'Drop by Downtown Market Square or reply to reserve.',
      suggestedHashtags: ['#SourdoughLovers', '#ArtisanBakery', '#FreshBakes'],
      strategicExplanation: 'Highlights sensory baking attributes and creates limited-quantity urgency without fake scarcity.',
      generatedAt: new Date().toISOString(),
      modelUsed: 'Qwen/Qwen2.5-1.5B-Instruct',
      latencyMs: 850,
    };

    const parsed = MarketingContentResultSchema.safeParse(validMarketing);
    expect(parsed.success).toBe(true);
  });
});
