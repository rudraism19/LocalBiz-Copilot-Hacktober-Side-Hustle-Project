import { NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai';
import { getStorageMode } from '@/lib/storage';

export async function GET() {
  const aiProvider = getAIProvider();
  const aiStatus = await aiProvider.getStatus();
  const storageInfo = getStorageMode();

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai: aiStatus,
    storage: storageInfo,
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      configuredModel: process.env.AI_MODEL_ID || 'Qwen/Qwen2.5-1.5B-Instruct',
      configuredProvider: process.env.AI_PROVIDER || 'local_transformers',
    },
  });
}
