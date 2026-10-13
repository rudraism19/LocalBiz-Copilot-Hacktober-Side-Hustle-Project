import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

export async function POST() {
  try {
    const storage = getStorage();
    await storage.resetToSampleData();
    return NextResponse.json({
      success: true,
      message: 'Database reset to initial artisan bakery sample data.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
