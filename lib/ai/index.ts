import { AIProvider } from './types';
import { LocalTransformersProvider } from './local-provider';
import { HuggingFaceInferenceProvider } from './huggingface-provider';

let aiProviderInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (aiProviderInstance) {
    return aiProviderInstance;
  }

  const selectedProvider = (process.env.AI_PROVIDER || 'local_transformers').toLowerCase();

  if (selectedProvider === 'huggingface_inference' || selectedProvider === 'hf') {
    aiProviderInstance = new HuggingFaceInferenceProvider();
  } else {
    aiProviderInstance = new LocalTransformersProvider();
  }

  return aiProviderInstance;
}

export function resetAIProvider(): void {
  aiProviderInstance = null;
}

export * from './types';
export * from './local-provider';
export * from './huggingface-provider';
