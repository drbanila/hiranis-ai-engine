import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import {
  generateText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai';

// Allow responses up to 30 seconds.
export const maxDuration = 30;

const QUOTA_MESSAGE =
  'Gemini free-tier quota reached. Please wait and try again later.';
const RATE_LIMIT_MESSAGE =
  'You are sending messages too quickly. Please wait a few seconds and try again.';
const GENERIC_ERROR_MESSAGE =
  "Something went wrong while reaching Hirani's AI Engine. Please try again.";

const SYSTEM_PROMPT =
  "You are Hirani's AI Engine, a thoughtful and concise cloud intelligence. " +
  'Help the user explore ideas clearly and helpfully.';

// --- Backend model registry --------------------------------------------------
// Gemini 2.5 Flash-Lite is the primary/default model. Qwen via OpenRouter is an
// OPTIONAL backup that is only used when Gemini's free-tier quota is exhausted,
// and only when OPENROUTER_API_KEY is configured. If the key is absent the app
// keeps its current behaviour (friendly quota message).
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const OPENROUTER_MODEL = 'qwen/qwen-2.5-72b-instruct';

// OpenRouter is OpenAI-compatible — reuse the OpenAI provider with its base URL.
const openrouter = process.env.OPENROUTER_API_KEY
  ? createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        'HTTP-Referer': 'https://hiranis-ai-engine.vercel.app',
        'X-Title': 'Hirani AI Engine',
      },
    })
  : null;

const MODEL_REGISTRY = {
  default: { label: 'Gemini 2.5 Flash-Lite', create: () => google(GEMINI_MODEL) },
  fallback: {
    label: 'Qwen (OpenRouter)',
    create: () => (openrouter ? openrouter(OPENROUTER_MODEL) : null),
  },
} as const;

// --- Simple in-memory rate limit (best-effort, per server instance) ---------
// Prevents rapid repeated calls from the same IP within a short window.
const RATE_LIMIT_WINDOW_MS = 10_000;
const lastRequestByClient = new Map<string, number>();

function getClientId(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Classify a model error for quota handling and retry decisions. */
function classifyError(err: unknown): { isQuota: boolean; isRetryable: boolean } {
  const e = err as { statusCode?: number; status?: number; message?: string };
  const status = e?.statusCode ?? e?.status;
  const msg = `${e?.message ?? ''} ${(() => {
    try {
      return JSON.stringify(err);
    } catch {
      return '';
    }
  })()}`.toLowerCase();

  const isQuota =
    status === 429 ||
    msg.includes('resource_exhausted') ||
    msg.includes('too many requests') ||
    msg.includes('quota');

  // Do NOT retry hard/daily/billing quota — only transient rate limits.
  const isHardLimit =
    msg.includes('per day') ||
    msg.includes('perday') ||
    msg.includes('daily') ||
    msg.includes('current quota') ||
    msg.includes('billing');

  return { isQuota, isRetryable: isQuota && !isHardLimit };
}

/** Emit a single assistant text message as a UI message stream response. */
function textResponse(text: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = 'msg-' + Date.now();
      writer.write({ type: 'text-start', id });
      writer.write({ type: 'text-delta', id, delta: text });
      writer.write({ type: 'text-end', id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // 1. Rate limit: block rapid repeated calls from the same client.
  const clientId = getClientId(req);
  const now = Date.now();
  const last = lastRequestByClient.get(clientId);
  if (last && now - last < RATE_LIMIT_WINDOW_MS) {
    return textResponse(RATE_LIMIT_MESSAGE);
  }
  lastRequestByClient.set(clientId, now);

  // 2. Free-tier protection: only send the last 4 messages to the model.
  const recentMessages = messages.slice(-4);
  const modelMessages = await convertToModelMessages(recentMessages);

  // 3 + 4. Primary: Gemini, with safe bounded retry on transient 429s only.
  const retryDelays = [1500, 3000]; // retry once after 1.5s, again after 3s, then stop
  let attempt = 0;

  while (true) {
    try {
      const { text } = await generateText({
        model: MODEL_REGISTRY.default.create(),
        system: SYSTEM_PROMPT,
        messages: modelMessages,
      });
      return textResponse(text);
    } catch (err) {
      const { isQuota, isRetryable } = classifyError(err);

      if (isRetryable && attempt < retryDelays.length) {
        await sleep(retryDelays[attempt]);
        attempt += 1;
        continue;
      }

      if (isQuota) {
        // 4 + 5. Gemini quota exhausted (429 / RESOURCE_EXHAUSTED / quota /
        // daily / billing). Fall back to Qwen via OpenRouter if configured;
        // otherwise keep the current friendly quota message.
        const fallbackModel = MODEL_REGISTRY.fallback.create();
        if (fallbackModel) {
          try {
            const { text } = await generateText({
              model: fallbackModel,
              system: SYSTEM_PROMPT,
              messages: modelMessages,
            });
            return textResponse(text);
          } catch (fallbackErr) {
            console.error(
              "Hirani's AI Engine OpenRouter fallback error:",
              fallbackErr,
            );
          }
        }
        return textResponse(QUOTA_MESSAGE);
      }

      console.error("Hirani's AI Engine chat error:", err);
      return textResponse(GENERIC_ERROR_MESSAGE);
    }
  }
}
