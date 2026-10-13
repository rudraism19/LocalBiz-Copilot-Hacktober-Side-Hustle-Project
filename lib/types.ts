import { z } from 'zod';

// ==========================================
// Product & Inventory Types
// ==========================================

export const ProductCategorySchema = z.enum([
  'bread',
  'pastry',
  'cake',
  'beverage',
  'savory',
  'seasonal',
  'packaged',
]);

export type ProductCategory = z.infer<typeof ProductCategorySchema>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Product name is required'),
  category: ProductCategorySchema,
  sellingPrice: z.number().positive('Selling price must be greater than 0'),
  unitCost: z.number().nonnegative('Unit cost cannot be negative').nullable().optional(),
  currentStock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative'),
  reorderThreshold: z.number().int('Reorder threshold must be an integer').nonnegative('Threshold cannot be negative'),
  expiryDate: z.string().nullable().optional(), // ISO date string: YYYY-MM-DD
  description: z.string().optional().default(''),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

export const CreateProductInputSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

// ==========================================
// Sales & Transaction Types
// ==========================================

export const SaleTransactionSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  quantitySold: z.number().int().positive('Quantity must be at least 1'),
  sellingPrice: z.number().positive('Selling price must be greater than 0'),
  discount: z.number().nonnegative('Discount cannot be negative').optional().default(0),
  totalRevenue: z.number().nonnegative(),
  unitCostSnapshot: z.number().nonnegative().nullable().optional(),
  estimatedGrossProfit: z.number().nullable().optional(), // null if unitCost is missing
  timestamp: z.string(), // ISO string
  notes: z.string().optional(),
});

export type SaleTransaction = z.infer<typeof SaleTransactionSchema>;

export const RecordSaleInputSchema = z.object({
  productId: z.string().min(1, 'Please select a product'),
  quantitySold: z.number().int().positive('Quantity must be at least 1'),
  sellingPrice: z.number().positive('Selling price must be greater than 0').optional(), // defaults to product selling price
  discount: z.number().nonnegative('Discount cannot be negative').optional().default(0),
  notes: z.string().optional(),
});

export type RecordSaleInput = z.infer<typeof RecordSaleInputSchema>;

// ==========================================
// Brand Profile Types
// ==========================================

export const BrandToneSchema = z.enum([
  'warm_artisan',
  'modern_chic',
  'friendly_neighborhood',
  'premium_luxury',
  'cozy_rustic',
]);

export type BrandTone = z.infer<typeof BrandToneSchema>;

export const BrandLanguageSchema = z.enum(['en', 'hi', 'both']);
export type BrandLanguage = z.infer<typeof BrandLanguageSchema>;

export const BrandProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  category: z.string().min(1, 'Category is required'),
  location: z.string().min(1, 'Location or service area is required'),
  preferredLanguage: BrandLanguageSchema.default('en'),
  brandTone: BrandToneSchema.default('warm_artisan'),
  targetAudience: z.string().min(1, 'Target audience description is required'),
  productsAndDifferentiators: z.string().min(1, 'Differentiators are required'),
  monthlyPromoBudget: z.number().nonnegative('Promotion budget cannot be negative').default(100),
  currency: z.string().default('USD'),
});

export type BrandProfile = z.infer<typeof BrandProfileSchema>;

// ==========================================
// Daily AI Briefing Types
// ==========================================

export const ProductAttentionItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  urgency: z.enum(['high', 'medium', 'low']),
  observedFact: z.string().describe('Concrete factual data observed from the business numbers'),
  reason: z.string().describe('Why this requires attention'),
  suggestedAction: z.string().describe('Actionable recommendation'),
});

export type ProductAttentionItem = z.infer<typeof ProductAttentionItemSchema>;

export const SuggestedActionItemSchema = z.object({
  title: z.string(),
  rationale: z.string().describe('Grounding in business numbers'),
  expectedOutcome: z.string(),
  riskOrConsideration: z.string().optional(),
});

export type SuggestedActionItem = z.infer<typeof SuggestedActionItemSchema>;

export const MarketingOpportunityItemSchema = z.object({
  angle: z.string(),
  targetItem: z.string(),
  channel: z.enum(['instagram', 'whatsapp', 'both']),
  suggestedTiming: z.string().optional(),
});

export type MarketingOpportunityItem = z.infer<typeof MarketingOpportunityItemSchema>;

export const DailyBriefingSchema = z.object({
  id: z.string(),
  date: z.string(),
  keyObservations: z.array(z.string()).min(1),
  productsNeedingAttention: z.array(ProductAttentionItemSchema),
  suggestedActions: z.array(SuggestedActionItemSchema),
  marketingOpportunities: z.array(MarketingOpportunityItemSchema),
  missingInfoAndUncertainties: z.array(z.string()),
  generatedAt: z.string(),
  modelUsed: z.string(),
  inferenceProvider: z.string(),
  latencyMs: z.number().nonnegative(),
});

export type DailyBriefing = z.infer<typeof DailyBriefingSchema>;

// ==========================================
// Marketing Content Types
// ==========================================

export const MarketingLanguageSchema = z.enum(['en', 'hi']);
export type MarketingLanguage = z.infer<typeof MarketingLanguageSchema>;

export const MarketingPlatformSchema = z.enum(['instagram', 'whatsapp', 'both']);
export type MarketingPlatform = z.infer<typeof MarketingPlatformSchema>;

export const MarketingCampaignObjectiveSchema = z.enum([
  'boost_slow_moving',
  'clear_expiring_stock',
  'new_arrival_launch',
  'weekend_special',
  'loyalty_appreciation',
]);
export type MarketingCampaignObjective = z.infer<typeof MarketingCampaignObjectiveSchema>;

export const GenerateMarketingRequestSchema = z.object({
  productId: z.string().min(1, 'Please select a product'),
  productName: z.string().min(1),
  productDescription: z.string().default(''),
  sellingPrice: z.number().positive(),
  campaignObjective: MarketingCampaignObjectiveSchema.default('boost_slow_moving'),
  brandTone: BrandToneSchema.default('warm_artisan'),
  language: MarketingLanguageSchema.default('en'),
  preferredPlatform: MarketingPlatformSchema.default('both'),
  targetAudience: z.string().optional(),
  optionalDiscount: z.string().optional(), // e.g. "15% off before 2 PM" or "$1 off"
  customNotes: z.string().optional(),
});

export type GenerateMarketingRequest = z.infer<typeof GenerateMarketingRequestSchema>;

export const MarketingContentResultSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  language: MarketingLanguageSchema,
  headline: z.string(),
  instagramCaption: z.string(),
  whatsappMessage: z.string(),
  callToAction: z.string(),
  suggestedHashtags: z.array(z.string()),
  strategicExplanation: z.string().describe('Short explanation of the marketing angle grounded in provided facts'),
  generatedAt: z.string(),
  modelUsed: z.string(),
  latencyMs: z.number().nonnegative(),
});

export type MarketingContentResult = z.infer<typeof MarketingContentResultSchema>;

// ==========================================
// AI Settings & Diagnostics Types
// ==========================================

export const AIProviderStatusSchema = z.object({
  ready: z.boolean(),
  provider: z.string(),
  modelId: z.string(),
  device: z.string().optional(),
  latencyMs: z.number().optional(),
  lastCheckTime: z.string(),
  message: z.string(),
  isLocal: z.boolean(),
  modelLoaded: z.boolean().optional(),
  troubleshootingGuide: z.string().optional(),
});

export type AIProviderStatus = z.infer<typeof AIProviderStatusSchema>;

// Re-export metrics and health status from calculations
export type { ProductHealthStatus, InventoryMetrics, FinancialMetrics } from './calculations';
