import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import {
  generateText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai';

export const maxDuration = 30;

const QUOTA_MESSAGE =
  'All available models are currently at capacity. Please try again in a moment.';
const RATE_LIMIT_MESSAGE =
  'You are sending messages too quickly. Please wait a few seconds and try again.';
const GENERIC_ERROR_MESSAGE =
  'Something went wrong while reaching Banila AI Engine. Please try again.';
const MODEL_MISSING_MESSAGE =
  'This model requires an API key that is not configured.';

const SYSTEM_PROMPT =
  'You are Banila AI Engine, a thoughtful and concise cloud intelligence. ' +
  'Help the user explore ideas clearly and helpfully.';

// --- Providers ---------------------------------------------------------------

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

// Groq — OpenAI-compatible API. Key is read server-side only.
const groq = process.env.GROQ_API_KEY
  ? createOpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    })
  : null;

// --- Model registry ----------------------------------------------------------

type ModelFactory = () =>
  | ReturnType<typeof google>
  | ReturnType<NonNullable<typeof openrouter>>
  | ReturnType<NonNullable<typeof groq>>
  | null;

interface ModelEntry {
  label: string;
  provider: 'google' | 'groq' | 'openrouter';
  create: ModelFactory;
}

const MODEL_REGISTRY: Record<string, ModelEntry> = {
  'gemini-lite': {
    label: 'Gemini Lite',
    provider: 'google',
    create: () => google('gemini-2.5-flash-lite'),
  },
  'gemini-flash': {
    label: 'Gemini Flash',
    provider: 'google',
    create: () => google('gemini-2.5-flash'),
  },
  qwen: {
    label: 'Qwen',
    provider: 'openrouter',
    create: () => (openrouter ? openrouter('qwen/qwen-2.5-72b-instruct') : null),
  },
  llama: {
    label: 'Llama',
    provider: 'openrouter',
    create: () => (openrouter ? openrouter('meta-llama/llama-3.3-70b-instruct:free') : null),
  },
  gemma: {
    label: 'Gemma',
    provider: 'openrouter',
    create: () => (openrouter ? openrouter('google/gemma-4-31b-it:free') : null),
  },
  'groq-fast': {
    label: 'Groq Fast',
    provider: 'groq',
    create: () => (groq ? groq('llama-3.1-8b-instant') : null),
  },
  'groq-quality': {
    label: 'Groq Quality',
    provider: 'groq',
    create: () => (groq ? groq('llama-3.3-70b-versatile') : null),
  },
  'qwen-groq': {
    label: 'Qwen - Groq',
    provider: 'groq',
    create: () => (groq ? groq('qwen/qwen3-32b') : null),
  },
};

// Auto mode tries models in this priority order until one succeeds.
// Free-first: Gemini → Groq Fast → Qwen-Groq → Groq Quality → OpenRouter.
const AUTO_PRIORITY = [
  'gemini-lite',
  'gemini-flash',
  'groq-fast',
  'qwen-groq',
  'groq-quality',
  'qwen',
  'llama',
  'gemma',
];

// --- Rate limit --------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 1_000;
const lastRequestByClient = new Map<string, number>();

function getClientId(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Error classification ----------------------------------------------------

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

  const isHardLimit =
    msg.includes('per day') ||
    msg.includes('perday') ||
    msg.includes('daily') ||
    msg.includes('current quota') ||
    msg.includes('billing');

  return { isQuota, isRetryable: isQuota && !isHardLimit };
}

// --- Response helper ---------------------------------------------------------

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

// --- Model invocation with bounded retry ------------------------------------

type ModelMessages = Awaited<ReturnType<typeof convertToModelMessages>>;

async function invokeModel(
  modelId: string,
  modelMessages: ModelMessages,
  systemPrompt: string,
): Promise<{ text: string } | { error: 'quota' | 'missing' | 'generic' }> {
  const entry = MODEL_REGISTRY[modelId];
  if (!entry) return { error: 'generic' };

  const model = entry.create();
  if (!model) return { error: 'missing' };

  const retryDelays = [1500, 3000];
  let attempt = 0;

  while (true) {
    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        messages: modelMessages,
      });
      // Safe observability: provider + model id only. No keys, no user
      // messages, no request bodies, no response content.
      console.log('AI_PROVIDER_USED', entry.provider, 'MODEL_USED', modelId);
      return { text };
    } catch (err) {
      const { isQuota, isRetryable } = classifyError(err);

      if (isRetryable && attempt < retryDelays.length) {
        await sleep(retryDelays[attempt]);
        attempt += 1;
        continue;
      }

      if (isQuota) return { error: 'quota' };

      console.error(`Hirani's AI Engine ${modelId} error:`, err);
      return { error: 'generic' };
    }
  }
}

// --- Route handler -----------------------------------------------------------

export async function POST(req: Request) {
  // Read which model the client requested (defaults to auto).
  const url = new URL(req.url);
  const requestedModel = url.searchParams.get('model') ?? 'auto';

  const {
    messages,
    projectContext,
  }: { messages: UIMessage[]; projectContext?: string } = await req.json();

  // Project context (notes + text-file contents) is injected into the system
  // prompt so every chat in a project shares the same grounding. Capped client-
  // side; capped again here defensively. Never logged.
  const systemPrompt =
    typeof projectContext === 'string' && projectContext.trim()
      ? `${SYSTEM_PROMPT}\n\n${projectContext.slice(0, 24_000)}`
      : SYSTEM_PROMPT;

  // Rate limit: block rapid repeated calls from the same client.
  const clientId = getClientId(req);
  const now = Date.now();
  const last = lastRequestByClient.get(clientId);
  if (last && now - last < RATE_LIMIT_WINDOW_MS) {
    return textResponse(RATE_LIMIT_MESSAGE);
  }
  lastRequestByClient.set(clientId, now);

  // Free-tier protection: only send the last 4 messages to the model.
  const recentMessages = messages.slice(-4);
  const modelMessages = await convertToModelMessages(recentMessages);

  // Auto mode: try each model in priority order until one succeeds.
  if (requestedModel === 'auto') {
    for (const modelId of AUTO_PRIORITY) {
      const result = await invokeModel(modelId, modelMessages, systemPrompt);
      if ('text' in result) return textResponse(result.text);
      if (result.error === 'missing') continue; // key not configured, skip
    }
    return textResponse(QUOTA_MESSAGE);
  }

  // Named model mode: use exactly the requested model.
  if (!(requestedModel in MODEL_REGISTRY)) {
    return textResponse(GENERIC_ERROR_MESSAGE);
  }

  const result = await invokeModel(requestedModel, modelMessages, systemPrompt);
  if ('text' in result) return textResponse(result.text);
  if (result.error === 'quota') return textResponse(QUOTA_MESSAGE);
  if (result.error === 'missing') return textResponse(MODEL_MISSING_MESSAGE);
  return textResponse(GENERIC_ERROR_MESSAGE);
}
