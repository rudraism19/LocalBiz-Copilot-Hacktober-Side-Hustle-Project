import {
  DailyBriefing,
  GenerateMarketingRequest,
  MarketingContentResult,
  AIProviderStatus,
  Product,
  BrandProfile,
  FinancialMetrics,
  ProductHealthStatus,
} from '../types';

export interface BriefingInputContext {
  brandProfile: BrandProfile;
  financialMetrics: FinancialMetrics;
  productsHealth: ProductHealthStatus[];
  recentTransactionsCount: number;
}

export interface AIProvider {
  readonly name: string;
  readonly modelId: string;
  readonly isLocal: boolean;

  getStatus(): Promise<AIProviderStatus>;
  generateDailyBriefing(context: BriefingInputContext): Promise<DailyBriefing>;
  generateMarketingContent(
    input: GenerateMarketingRequest,
    brandProfile: BrandProfile
  ): Promise<MarketingContentResult>;
}
