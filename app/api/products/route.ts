import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { CreateProductInputSchema } from '@/lib/types';
import { evaluateProductHealth, calculateInventoryMetrics } from '@/lib/calculations';

export async function GET() {
  try {
    const storage = getStorage();
    const products = await storage.getProducts();
    const refDate = new Date();

    const enriched = products.map((product) => evaluateProductHealth(product, refDate));
    const metrics = calculateInventoryMetrics(products, refDate);

    return NextResponse.json({
      products: enriched,
      metrics,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateProductInputSchema.parse(body);

    const storage = getStorage();
    const created = await storage.createProduct(validated);

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
