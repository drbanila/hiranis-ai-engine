import { google } from '@ai-sdk/google';
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

  // 2. Free-tier protection: only send the last 4 messages to Gemini.
  const recentMessages = messages.slice(-4);
  const modelMessages = await convertToModelMessages(recentMessages);

  // 3 + 4. Generate with safe, bounded retry on transient 429s only.
  const retryDelays = [1500, 3000]; // retry once after 1.5s, again after 3s, then stop
  let attempt = 0;

  while (true) {
    try {
      const { text } = await generateText({
        model: google('gemini-2.5-flash-lite'),
        system:
          "You are Hirani's AI Engine, a thoughtful and concise cloud intelligence. " +
          'Help the user explore ideas clearly and helpfully.',
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
        return textResponse(QUOTA_MESSAGE);
      }

      console.error("Hirani's AI Engine chat error:", err);
      return textResponse(GENERIC_ERROR_MESSAGE);
    }
  }
}
