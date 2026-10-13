import { AIProvider, BriefingInputContext } from './types';
import {
  DailyBriefing,
  GenerateMarketingRequest,
  MarketingContentResult,
  AIProviderStatus,
  BrandProfile,
  DailyBriefingSchema,
  MarketingContentResultSchema,
} from '../types';
import { sanitizeUntrustedInput } from '../calculations';

export class HuggingFaceInferenceProvider implements AIProvider {
  readonly name = 'huggingface_inference';
  readonly isLocal = false;
  readonly modelId: string;
  readonly hfToken?: string;
  readonly timeoutMs: number;

  constructor() {
    this.modelId = process.env.AI_MODEL_ID || 'Qwen/Qwen2.5-1.5B-Instruct';
    this.hfToken = process.env.HF_TOKEN;
    this.timeoutMs = Number(process.env.AI_TIMEOUT_SECONDS || '90') * 1000;
  }

  isConfigured(): boolean {
    return Boolean(this.hfToken && this.hfToken.startsWith('hf_'));
  }

  async getStatus(): Promise<AIProviderStatus> {
    const startTime = performance.now();

    if (!this.isConfigured()) {
      return {
        ready: false,
        provider: this.name,
        modelId: this.modelId,
        isLocal: false,
        lastCheckTime: new Date().toISOString(),
        message: 'HF_TOKEN environment variable is not configured.',
        troubleshootingGuide:
          'To use Hugging Face Inference Providers, set HF_TOKEN=hf_... in your .env.local file.',
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      // Probe model endpoint
      const res = await fetch(`https://api-inference.huggingface.co/status/${this.modelId}`, {
        headers: {
          Authorization: `Bearer ${this.hfToken}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      const latencyMs = Math.round(performance.now() - startTime);

      if (res.status === 401 || res.status === 403) {
        return {
          ready: false,
          provider: this.name,
          modelId: this.modelId,
          isLocal: false,
          lastCheckTime: new Date().toISOString(),
          latencyMs,
          message: 'Invalid HF_TOKEN or access permission denied for model ' + this.modelId,
          troubleshootingGuide: 'Ensure your Hugging Face token has read permissions and you have accepted model terms if gated.',
        };
      }

      return {
        ready: true,
        provider: this.name,
        modelId: this.modelId,
        isLocal: false,
        lastCheckTime: new Date().toISOString(),
        latencyMs,
        message: `Connected to Hugging Face Inference API for ${this.modelId}. Cloud inference mode active.`,
        troubleshootingGuide: 'Hosted inference transmits input data to Hugging Face cloud servers.',
      };
    } catch (err: any) {
      return {
        ready: false,
        provider: this.name,
        modelId: this.modelId,
        isLocal: false,
        lastCheckTime: new Date().toISOString(),
        message: `Hugging Face connection check failed: ${err.message}`,
        troubleshootingGuide: 'Check internet connectivity or configure local inference instead.',
      };
    }
  }

  private extractJson(text: string): any {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {}
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {}
    }
    return JSON.parse(text.trim());
  }

  private async callHfApi(prompt: string): Promise<{ text: string; latencyMs: number }> {
    if (!this.isConfigured()) {
      throw new Error('HF_TOKEN is missing. Provide a valid Hugging Face token in server environment.');
    }

    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const endpoint = `https://api-inference.huggingface.co/models/${this.modelId}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.3,
            return_full_text: false,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 503) {
          throw new Error(`Model ${this.modelId} is currently loading on Hugging Face. Please retry shortly.`);
        }
        throw new Error(`Hugging Face API returned ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const latencyMs = Math.round(performance.now() - startTime);

      let generatedText = '';
      if (Array.isArray(data) && data[0]?.generated_text) {
        generatedText = data[0].generated_text;
      } else if (typeof data === 'object' && data.generated_text) {
        generatedText = data.generated_text;
      } else {
        generatedText = JSON.stringify(data);
      }

      return { text: generatedText, latencyMs };
    } finally {
      clearTimeout(timer);
    }
  }

  async generateDailyBriefing(context: BriefingInputContext): Promise<DailyBriefing> {
    const { brandProfile, financialMetrics, productsHealth } = context;

    const lowStockItems = productsHealth
      .filter((p) => p.isLowStock)
      .map((p) => ({
        id: p.product.id,
        name: p.product.name,
        stock: p.product.currentStock,
        threshold: p.product.reorderThreshold,
      }));

    const expiringItems = productsHealth
      .filter((p) => p.isExpiringSoon)
      .map((p) => ({
        id: p.product.id,
        name: p.product.name,
        stock: p.product.currentStock,
        expiryDate: p.product.expiryDate,
        daysUntilExpiry: p.daysUntilExpiry,
      }));

    const productsSummary = productsHealth.map((p) => ({
      name: p.product.name,
      category: p.product.category,
      price: p.product.sellingPrice,
      unitCost: p.product.unitCost ?? 'MISSING_COST',
      stock: p.product.currentStock,
    }));

    const prompt = (
      `<|im_start|>system\n` +
      `You are LocalBiz Copilot, an AI business assistant for bakeries and cafés.\n` +
      `Ground all claims strictly in the business numbers provided. Do not hallucinate sales figures or ingredients.\n` +
      `If cost information is missing, document it in missingInfoAndUncertainties.\n` +
      `Respond ONLY with a valid JSON object matching the requested schema.\n<|im_end|>\n` +
      `<|im_start|>user\n` +
      `Analyze this business data:\n` +
      JSON.stringify(
        {
          business_name: brandProfile.businessName,
          brand_tone: brandProfile.brandTone,
          currency: brandProfile.currency || 'USD',
          total_revenue: financialMetrics.totalRevenue,
          gross_profit: financialMetrics.totalGrossProfit,
          has_missing_costs: financialMetrics.hasMissingCosts,
          low_stock_items: lowStockItems,
          expiring_items: expiringItems,
          products_summary: productsSummary,
        },
        null,
        2
      ) +
      `\n\nGenerate JSON with keys: keyObservations, productsNeedingAttention (with productId, productName, urgency, observedFact, reason, suggestedAction), suggestedActions (with title, rationale, expectedOutcome), marketingOpportunities (with angle, targetItem, channel), missingInfoAndUncertainties.<|im_end|>\n` +
      `<|im_start|>assistant\n`
    );

    const { text, latencyMs } = await this.callHfApi(prompt);
    const parsed = this.extractJson(text);

    const briefing: DailyBriefing = {
      id: `briefing-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      keyObservations: parsed.keyObservations || ['Observation generated from sales records.'],
      productsNeedingAttention: parsed.productsNeedingAttention || [],
      suggestedActions: parsed.suggestedActions || [],
      marketingOpportunities: parsed.marketingOpportunities || [],
      missingInfoAndUncertainties: parsed.missingInfoAndUncertainties || [],
      generatedAt: new Date().toISOString(),
      modelUsed: this.modelId,
      inferenceProvider: this.name,
      latencyMs,
    };

    return DailyBriefingSchema.parse(briefing);
  }

  async generateMarketingContent(
    input: GenerateMarketingRequest,
    brandProfile: BrandProfile
  ): Promise<MarketingContentResult> {
    const isHindi = input.language === 'hi';
    const langDesc = isHindi
      ? 'natural, inviting Hindi (Devanagari script with popular café terms)'
      : 'warm, artisan English';

    const prompt = (
      `<|im_start|>system\n` +
      `You are LocalBiz Copilot marketing copywriter for ${brandProfile.businessName}.\n` +
      `Language: ${langDesc}.\n` +
      `Never invent ingredients or promotions not provided in product context.\n` +
      `Respond ONLY with a JSON object containing keys: headline, instagramCaption, whatsappMessage, callToAction, suggestedHashtags, strategicExplanation.\n<|im_end|>\n` +
      `<|im_start|>user\n` +
      `Product: ${input.productName}\n` +
      `Price: $${input.sellingPrice}\n` +
      `Description: ${sanitizeUntrustedInput(input.productDescription || '')}\n` +
      `Objective: ${input.campaignObjective}\n` +
      `Tone: ${input.brandTone}\n` +
      `Discount: ${input.optionalDiscount || 'None'}\n<|im_end|>\n` +
      `<|im_start|>assistant\n`
    );

    const { text, latencyMs } = await this.callHfApi(prompt);
    const parsed = this.extractJson(text);

    const result: MarketingContentResult = {
      id: `mkt-${Date.now()}`,
      productId: input.productId,
      productName: input.productName,
      language: input.language,
      headline: parsed.headline || `Fresh ${input.productName}`,
      instagramCaption: parsed.instagramCaption || '',
      whatsappMessage: parsed.whatsappMessage || '',
      callToAction: parsed.callToAction || 'Visit us today!',
      suggestedHashtags: parsed.suggestedHashtags || [],
      strategicExplanation: parsed.strategicExplanation || '',
      generatedAt: new Date().toISOString(),
      modelUsed: this.modelId,
      latencyMs,
    };

    return MarketingContentResultSchema.parse(result);
  }
}
