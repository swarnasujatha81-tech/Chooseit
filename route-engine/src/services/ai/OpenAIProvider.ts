import OpenAI from 'openai';
import type { AIProvider, NarrationResponse } from './AIProvider.js';
import type { JourneyPlan } from '../../types.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private apiKey: string | undefined;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  }

  async generateNarration(plan: JourneyPlan, systemPrompt: string, responseSchema: unknown, options?: { timeoutMs?: number; maxRetries?: number }): Promise<NarrationResponse> {
    if (!this.apiKey) return { ok: false, provider: this.name, error: 'OPENAI_API_KEY not configured' };
    const timeoutMs = options?.timeoutMs ?? 8000;
    const maxRetries = options?.maxRetries ?? 1;

    const client = new OpenAI({ apiKey: this.apiKey });

    let attempt = 0;
    const start = Date.now();
    while (attempt <= maxRetries) {
      attempt += 1;
      try {
        const completion = await client.chat.completions.create({
          model: this.model,
          temperature: 0.2,
          max_tokens: 420,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify({ task: 'Narrate this already-calculated TSRTC journey. Do not change it.', plan }) },
          ],
          // Keep response handling simple: provider returns raw content
        });

        const contentRaw = completion.choices?.[0]?.message?.content || '';
        const latency_ms = Date.now() - start;
        let parsed: unknown = contentRaw;
        try { parsed = JSON.parse(String(contentRaw)); } catch (_) { /* leave raw */ }

        return { ok: true, provider: this.name, content: parsed, latency_ms };
      } catch (err: unknown) {
        const isLast = attempt > maxRetries;
        const errMsg = (err as Error)?.message || String(err);
        if (isLast) return { ok: false, provider: this.name, error: errMsg, latency_ms: Date.now() - start };
        // small backoff
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }

    return { ok: false, provider: this.name, error: 'unknown failure' };
  }
}

export default OpenAIProvider;
