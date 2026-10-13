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

export class LocalTransformersProvider implements AIProvider {
  readonly name = 'local_transformers';
  readonly isLocal = true;
  readonly baseUrl: string;
  readonly modelId: string;
  readonly timeoutMs: number;
  readonly apiKey?: string;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    this.modelId = process.env.AI_MODEL_ID || 'Qwen/Qwen2.5-1.5B-Instruct';
    this.timeoutMs = Number(process.env.AI_TIMEOUT_SECONDS || '120') * 1000;
    this.apiKey = process.env.AI_SERVICE_API_KEY;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  async getStatus(): Promise<AIProviderStatus> {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
        headers: this.getHeaders(),
      });
      clearTimeout(timer);

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        return {
          ready: false,
          provider: this.name,
          modelId: this.modelId,
          isLocal: true,
          lastCheckTime: new Date().toISOString(),
          latencyMs,
          message: `Local inference service returned status ${res.status}: ${res.statusText}`,
          troubleshootingGuide: 'Verify the service is running at ' + this.baseUrl,
        };
      }

      const data = await res.json();
      return {
        ready: true,
        provider: this.name,
        modelId: data.model_id || this.modelId,
        device: data.device,
        isLocal: true,
        lastCheckTime: new Date().toISOString(),
        latencyMs,
        modelLoaded: Boolean(data.model_loaded),
        message: data.model_loaded
          ? `Local Transformers active on ${data.device} (${data.license_info})`
          : `Service online. Model (${data.model_id}) ready to load into memory.`,
        troubleshootingGuide: data.error_message
          ? `Model error: ${data.error_message}`
          : undefined,
      };
    } catch (err: any) {
      const isConnectionError =
        err.name === 'AbortError' ||
        err.cause?.code === 'ECONNREFUSED' ||
        err.message?.includes('fetch failed');

      return {
        ready: false,
        provider: this.name,
        modelId: this.modelId,
        isLocal: true,
        lastCheckTime: new Date().toISOString(),
        message: isConnectionError
          ? 'Local Python inference service is offline.'
          : `Connection error: ${err.message}`,
        troubleshootingGuide:
          'To start the local Hugging Face Transformers service:\n' +
          '1. Activate Python 3.11: `ai_service\\.venv\\Scripts\\activate`\n' +
          '2. Run: `uvicorn ai_service.main:app --host 127.0.0.1 --port 8000`\n' +
          'Or configure HF_TOKEN to switch to hosted inference mode.',
      };
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
      id: p.product.id,
      name: p.product.name,
      category: p.product.category,
      price: p.product.sellingPrice,
      unitCost: p.product.unitCost ?? 'MISSING_COST',
      stock: p.product.currentStock,
      marginPercent: p.unitMarginPercentage !== null ? `${p.unitMarginPercentage.toFixed(1)}%` : 'UNKNOWN',
    }));

    const payload = {
      business_name: brandProfile.businessName,
      brand_tone: brandProfile.brandTone,
      currency: brandProfile.currency || 'USD',
      total_revenue: financialMetrics.totalRevenue,
      gross_profit: financialMetrics.totalGrossProfit,
      has_missing_costs: financialMetrics.hasMissingCosts,
      total_units_sold: financialMetrics.totalUnitsSold,
      low_stock_items: lowStockItems,
      expiring_items: expiringItems,
      products_summary: productsSummary,
      monthly_budget: brandProfile.monthlyPromoBudget,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/briefing`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Inference service error [${res.status}]: ${errorText}`);
      }

      const data = await res.json();

      const briefing: DailyBriefing = {
        id: `briefing-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        keyObservations: data.keyObservations,
        productsNeedingAttention: data.productsNeedingAttention,
        suggestedActions: data.suggestedActions,
        marketingOpportunities: data.marketingOpportunities,
        missingInfoAndUncertainties: data.missingInfoAndUncertainties,
        generatedAt: new Date().toISOString(),
        modelUsed: data.model_id || this.modelId,
        inferenceProvider: this.name,
        latencyMs: data.latency_ms || 0,
      };

      return DailyBriefingSchema.parse(briefing);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(
          `Local inference timed out after ${this.timeoutMs / 1000} seconds. Consider using a smaller model checkpoint or increasing AI_TIMEOUT_SECONDS.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async generateMarketingContent(
    input: GenerateMarketingRequest,
    brandProfile: BrandProfile
  ): Promise<MarketingContentResult> {
    const payload = {
      product_name: input.productName,
      product_description: sanitizeUntrustedInput(input.productDescription || ''),
      selling_price: input.sellingPrice,
      campaign_objective: input.campaignObjective,
      brand_tone: input.brandTone || brandProfile.brandTone,
      language: input.language,
      preferred_platform: input.preferredPlatform,
      optional_discount: input.optionalDiscount ? sanitizeUntrustedInput(input.optionalDiscount, 100) : null,
      target_audience: input.targetAudience ? sanitizeUntrustedInput(input.targetAudience, 200) : brandProfile.targetAudience,
      business_name: brandProfile.businessName,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/marketing`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Inference service error [${res.status}]: ${errorText}`);
      }

      const data = await res.json();

      const result: MarketingContentResult = {
        id: `mkt-${Date.now()}`,
        productId: input.productId,
        productName: input.productName,
        language: input.language,
        headline: data.headline,
        instagramCaption: data.instagramCaption,
        whatsappMessage: data.whatsappMessage,
        callToAction: data.callToAction,
        suggestedHashtags: data.suggestedHashtags || [],
        strategicExplanation: data.strategicExplanation || '',
        generatedAt: new Date().toISOString(),
        modelUsed: data.model_id || this.modelId,
        latencyMs: data.latency_ms || 0,
      };

      return MarketingContentResultSchema.parse(result);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Inference timed out after ${this.timeoutMs / 1000} seconds.`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
