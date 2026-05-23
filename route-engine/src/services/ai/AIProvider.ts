import type { JourneyPlan } from '../../types.js';

export type NarrationResponse = {
  ok: boolean;
  provider: string;
  content?: unknown;
  error?: string;
  latency_ms?: number;
};

export interface AIProvider {
  name: string;
  generateNarration(plan: JourneyPlan, systemPrompt: string, responseSchema: unknown, options?: { timeoutMs?: number; maxRetries?: number }): Promise<NarrationResponse>;
}

export default AIProvider;
