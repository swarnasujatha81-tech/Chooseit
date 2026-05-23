import type { AIProvider, NarrationResponse } from './AIProvider.js';
import type { JourneyPlan } from '../../types.js';

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private apiKey: string | undefined;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5';
  }

  async generateNarration(plan: JourneyPlan, systemPrompt: string, responseSchema: unknown, options?: { timeoutMs?: number; maxRetries?: number }): Promise<NarrationResponse> {
    if (!this.apiKey) return { ok: false, provider: this.name, error: 'GEMINI_API_KEY not configured' };
    const timeoutMs = options?.timeoutMs ?? 8000;
    const maxRetries = options?.maxRetries ?? 1;

    let attempt = 0;
    const start = Date.now();
    while (attempt <= maxRetries) {
      attempt += 1;
      try {
        // Simple HTTP call using fetch. The exact endpoint and payload may need adjustment
        // depending on the Gemini/Google Cloud API version and authentication method.
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const payload = {
          // Minimal payload: provide system prompt + user JSON plan
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify({ task: 'Narrate this already-calculated TSRTC journey. Do not change it.', plan }) },
          ],
          model: this.model,
          temperature: 0.2,
        };

        const resp = await fetch(process.env.GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1/models/' + encodeURIComponent(this.model) + ':generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(id);

        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(`Gemini API error: ${resp.status} ${text}`);
        }

        const json = await resp.json();
        const latency_ms = Date.now() - start;
        // attempt to find text content; provider-specific parsing
        const content = json?.candidates?.[0]?.content || json?.output || json;
        return { ok: true, provider: this.name, content, latency_ms };
      } catch (err: unknown) {
        const isLast = attempt > maxRetries;
        const errMsg = (err as Error)?.message || String(err);
        if (isLast) return { ok: false, provider: this.name, error: errMsg, latency_ms: Date.now() - start };
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }

    return { ok: false, provider: this.name, error: 'unknown failure' };
  }
}

export default GeminiProvider;
