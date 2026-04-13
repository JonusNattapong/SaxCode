export interface ModelPricing {
  inputPrice: number;  // per 1M tokens
  outputPrice: number; // per 1M tokens
}

export const PRICING_MAP: Record<string, ModelPricing> = {
  // Anthropic
  'claude-3-5-sonnet-20241022': { inputPrice: 3.0, outputPrice: 15.0 },
  'claude-3-5-sonnet-latest': { inputPrice: 3.0, outputPrice: 15.0 },
  'claude-3-5-haiku-20241022': { inputPrice: 0.25, outputPrice: 1.25 },
  'claude-3-opus-20240229': { inputPrice: 15.0, outputPrice: 75.0 },
  
  // Default fallback for unknown cloud models
  'default-cloud': { inputPrice: 3.0, outputPrice: 15.0 },
  
  // Local models (Free!)
  'ollama': { inputPrice: 0, outputPrice: 0 },
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_MAP[model] || (model.includes('haiku') ? PRICING_MAP['claude-3-5-haiku-20241022'] : PRICING_MAP['default-cloud']);
  
  // If provider is ollama or pricing is 0, it's free
  if (pricing.inputPrice === 0) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPrice;
  
  return inputCost + outputCost;
}
