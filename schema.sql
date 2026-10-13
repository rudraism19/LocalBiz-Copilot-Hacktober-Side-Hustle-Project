-- ============================================================
-- LocalBiz Copilot — Database Schema (Supabase / PostgreSQL)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('bread', 'pastry', 'cake', 'beverage', 'savory', 'seasonal', 'packaged')),
    selling_price NUMERIC(10, 2) NOT NULL CHECK (selling_price > 0),
    unit_cost NUMERIC(10, 2) NULL CHECK (unit_cost IS NULL OR unit_cost >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reorder_threshold INTEGER NOT NULL DEFAULT 5 CHECK (reorder_threshold >= 0),
    expiry_date DATE NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(current_stock);
CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date);

-- 2. Sales Transactions Table
CREATE TABLE IF NOT EXISTS sale_transactions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity_sold INTEGER NOT NULL CHECK (quantity_sold > 0),
    selling_price NUMERIC(10, 2) NOT NULL CHECK (selling_price > 0),
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total_revenue NUMERIC(10, 2) NOT NULL,
    unit_cost_snapshot NUMERIC(10, 2) NULL,
    estimated_gross_profit NUMERIC(10, 2) NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON sale_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON sale_transactions(timestamp DESC);

-- 3. Brand Profiles Table
CREATE TABLE IF NOT EXISTS brand_profiles (
    id TEXT PRIMARY KEY DEFAULT 'default',
    business_name TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'both')),
    brand_tone TEXT NOT NULL DEFAULT 'warm_artisan' CHECK (brand_tone IN ('warm_artisan', 'modern_chic', 'friendly_neighborhood', 'premium_luxury', 'cozy_rustic')),
    target_audience TEXT NOT NULL,
    products_and_differentiators TEXT NOT NULL,
    monthly_promo_budget NUMERIC(10, 2) NOT NULL DEFAULT 100.00 CHECK (monthly_promo_budget >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Daily Briefings Table
CREATE TABLE IF NOT EXISTS daily_briefings (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    key_observations JSONB NOT NULL DEFAULT '[]'::jsonb,
    products_needing_attention JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    marketing_opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_info_and_uncertainties JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    model_used TEXT NOT NULL,
    inference_provider TEXT NOT NULL,
    latency_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_briefings_date ON daily_briefings(date DESC);

-- 5. Marketing History Table
CREATE TABLE IF NOT EXISTS marketing_history (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('en', 'hi')),
    headline TEXT NOT NULL,
    instagram_caption TEXT NOT NULL,
    whatsapp_message TEXT NOT NULL,
    call_to_action TEXT NOT NULL,
    suggested_hashtags JSONB NOT NULL DEFAULT '[]'::jsonb,
    strategic_explanation TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    model_used TEXT NOT NULL,
    latency_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_marketing_product_id ON marketing_history(product_id);
CREATE INDEX IF NOT EXISTS idx_marketing_generated_at ON marketing_history(generated_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_history ENABLE ROW LEVEL SECURITY;

-- Basic authenticated access policy (adjust per user id when multi-tenant)
CREATE POLICY "Allow authenticated read products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert/update products" ON products FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read transactions" ON sale_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert transactions" ON sale_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read brand profile" ON brand_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update brand profile" ON brand_profiles FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read briefings" ON daily_briefings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated save briefings" ON daily_briefings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read marketing" ON marketing_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated save marketing" ON marketing_history FOR INSERT TO authenticated WITH CHECK (true);
