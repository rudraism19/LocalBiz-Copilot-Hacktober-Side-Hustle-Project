import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { RecordSaleInputSchema, Product } from '@/lib/types';
import { calculateFinancialMetrics } from '@/lib/calculations';

export async function GET() {
  try {
    const storage = getStorage();
    const [transactions, products] = await Promise.all([
      storage.getTransactions(),
      storage.getProducts(),
    ]);

    const productsMap = new Map<string, Product>();
    products.forEach((p) => productsMap.set(p.id, p));

    const metrics = calculateFinancialMetrics(transactions, productsMap);

    return NextResponse.json({
      transactions,
      metrics,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RecordSaleInputSchema.parse(body);

    const storage = getStorage();
    const transaction = await storage.recordTransaction(validated);

    return NextResponse.json(transaction, { status: 201 });
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
