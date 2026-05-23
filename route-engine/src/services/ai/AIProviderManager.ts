import { OpenAIProvider } from './OpenAIProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import type { AIProvider, NarrationResponse } from './AIProvider.js';
import type { JourneyPlan } from '../../types.js';
import { TtlCache } from '../cache.js';

type ProviderName = string;

export class AIProviderManager {
  private providers: AIProvider[] = [];
  private cache = new TtlCache<NarrationResponse>(1000 * 60 * 30, 2000);

  constructor(priority?: string) {
    const order = (priority || process.env.AI_PROVIDER_PRIORITY || 'openai,gemini').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    for (const name of order) {
      if (name === 'openai') this.providers.push(new OpenAIProvider());
      else if (name === 'gemini') this.providers.push(new GeminiProvider());
    }
    // Always include both as fallback even if not in priority list
    if (!this.providers.find((p) => p.name === 'openai')) this.providers.push(new OpenAIProvider());
    if (!this.providers.find((p) => p.name === 'gemini')) this.providers.push(new GeminiProvider());
  }

  private cacheKey(plan: JourneyPlan) {
    // Stable key: from_to_steps
    const key = `${plan.from}::${plan.to}::${plan.steps.map((s) => s.route + '-' + s.from + '-' + s.to).join('|')}`;
    return key;
  }

  async generateNarration(plan: JourneyPlan, systemPrompt: string, responseSchema: unknown, options?: { timeoutMs?: number; maxRetries?: number }) {
    const key = this.cacheKey(plan);
    const cached = this.cache.get(key);
    if (cached) return cached;

    let fallbackCount = 0;
    for (const provider of this.providers) {
      try {
        const resp = await provider.generateNarration(plan, systemPrompt, responseSchema, options);
        this.logEvent('provider_attempt', { provider: provider.name, ok: resp.ok });
        if (resp.ok && resp.content) {
          this.cache.set(key, resp);
          return resp;
        }
        fallbackCount += 1;
      } catch (err: unknown) {
        fallbackCount += 1;
        this.logEvent('provider_error', { provider: provider.name, error: (err as Error)?.message || String(err) });
      }
    }

    // All providers failed — return deterministic local narration
    const local = this.localNarration(plan);
    const resp: NarrationResponse = { ok: true, provider: 'local', content: local, latency_ms: 0 };
    this.cache.set(key, resp);
    this.logEvent('fallback_local', { fallbackCount });
    return resp;
  }

  private localNarration(plan: JourneyPlan) {
    if (plan.type === 'not_found') {
      return {
        summary: { duration: 'Unavailable', fare: 'Unavailable' },
        instructions: ['No connected TSRTC route was found for these stops. Try a nearby interchange stop.'],
        last_mile: 'Select a nearby known bus stop and retry.',
        travel_tip: 'Choose major interchanges like Secunderabad, Koti, Ameerpet, Uppal, LB Nagar, or Mehdipatnam.',
      };
    }

    const instructions = plan.steps.map((step) => `Board route ${step.route} from ${step.from} to ${step.to}.`);
    return {
      summary: { duration: plan.duration, fare: `Rs ${plan.fare}` },
      instructions,
      last_mile: `Get down at ${plan.to} and walk or take a short local ride.`,
      travel_tip: plan.interchange ? `Change buses at ${plan.interchange}.` : 'Check live bus status before boarding.',
    };
  }

  private logEvent(event: string, data: Record<string, unknown>) {
    // Minimal observability via console; can be replaced with structured logger
    console.info(`[ai-manager] ${event}`, JSON.stringify(data));
  }
}

export default AIProviderManager;
