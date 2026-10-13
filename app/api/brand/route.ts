import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { BrandProfileSchema } from '@/lib/types';

export async function GET() {
  try {
    const storage = getStorage();
    const profile = await storage.getBrandProfile();
    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = BrandProfileSchema.partial().parse(body);

    const storage = getStorage();
    const updated = await storage.updateBrandProfile(validated);

    return NextResponse.json(updated);
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
