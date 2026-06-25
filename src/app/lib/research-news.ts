/**
 * Fetches and curates latest gynaecology / women's health research headlines.
 * Sources: PubMed RSS (real papers) + Gemini / Groq / Grok curation.
 * Cached for 24 hours so the feed refreshes daily.
 */

import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export type ResearchNewsItem = {
  headline: string;
  summary: string;
  topic: string;
  source: string;
};

export type ResearchNewsPayload = {
  items: ResearchNewsItem[];
  updatedAt: string;
  providers: string[];
};

const PUBMED_SEARCH_TERMS = [
  '(gynecology[MeSH] OR obstetrics[MeSH] OR endometriosis OR menopause OR "cervical cancer" OR PCOS)',
  '(robotic surgery[Title] AND gynecology[Title])',
  '("women\'s health" OR gynaecology) AND (clinical trial[Filter] OR randomized controlled trial[Filter])',
];

const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

const groq = process.env.GROQ_API_KEY
  ? createOpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    })
  : null;

const openrouter = process.env.OPENROUTER_API_KEY
  ? createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        'HTTP-Referer': 'https://hiranis-ai-engine.vercel.app',
        'X-Title': "Banu's AI Engine",
      },
    })
  : null;

let dailyCache: { day: string; payload: ResearchNewsPayload } | null = null;

const PLACEHOLDER_HEADLINE = 'Research feed refreshing…';

function isPlaceholder(payload: ResearchNewsPayload): boolean {
  return payload.items.length === 1 && payload.items[0].headline === PLACEHOLDER_HEADLINE;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

async function ncbiFetch(path: string, params: Record<string, string>): Promise<Response> {
  const q = new URLSearchParams(params);
  if (process.env.NCBI_API_KEY) q.set('api_key', process.env.NCBI_API_KEY);
  return fetch(`${NCBI_BASE}/${path}?${q}`, {
    next: { revalidate: 86_400 },
    headers: {
      Accept: 'application/json',
      'User-Agent': "Banu's AI Engine/1.0 (clinical research feed)",
    },
  });
}

async function fetchIdsForTerm(term: string, retmax: string): Promise<string[]> {
  const res = await ncbiFetch('esearch.fcgi', {
    db: 'pubmed',
    term,
    sort: 'date',
    retmax,
    retmode: 'json',
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { esearchresult?: { idlist?: string[] } };
  return json.esearchresult?.idlist ?? [];
}

async function fetchTitlesForIds(ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const res = await ncbiFetch('esummary.fcgi', {
    db: 'pubmed',
    id: ids.join(','),
    retmode: 'json',
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: Record<string, { title?: string }> & { uids?: string[] };
  };
  const uids = json.result?.uids ?? [];
  return uids
    .filter((id) => id !== 'uids')
    .map((id) => decodeXml(json.result?.[id]?.title ?? ''))
    .filter(Boolean);
}

async function fetchPubMedHeadlines(): Promise<string[]> {
  const seen = new Set<string>();
  const all: string[] = [];

  const idBatches = await Promise.all([
    fetchIdsForTerm(PUBMED_SEARCH_TERMS[0], '10'),
    fetchIdsForTerm(PUBMED_SEARCH_TERMS[1], '6'),
    fetchIdsForTerm(PUBMED_SEARCH_TERMS[2], '6'),
  ]);

  const uniqueIds = [...new Set(idBatches.flat())].slice(0, 20);
  const titles = await fetchTitlesForIds(uniqueIds);

  for (const t of titles) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      all.push(t);
    }
  }

  return all.slice(0, 18);
}

function parseAiJson(text: string): ResearchNewsItem[] | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      items?: Array<{ headline?: string; summary?: string; topic?: string; source?: string }>;
    };
    if (!Array.isArray(parsed.items)) return null;
    return parsed.items
      .filter((i) => i.headline?.trim() && i.summary?.trim())
      .slice(0, 5)
      .map((i) => ({
        headline: i.headline!.trim().slice(0, 120),
        summary: i.summary!.trim().slice(0, 220),
        topic: (i.topic ?? 'Research').trim().slice(0, 40),
        source: (i.source ?? 'PubMed').trim().slice(0, 40),
      }));
  } catch {
    return null;
  }
}

async function curateWithGemini(rawHeadlines: string[]): Promise<ResearchNewsItem[] | null> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null;
  const list = rawHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n');

  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system:
        'You curate latest gynaecology and women\'s health research for a senior consultant gynaecologist. ' +
        'Return ONLY valid JSON, no markdown.',
      prompt:
        `From these real PubMed headlines, pick the 4 most clinically significant for today.\n` +
        `Return JSON: {"items":[{"headline":"...","summary":"one elegant sentence","topic":"e.g. Endometriosis","source":"PubMed"}]}\n` +
        `Use British English. Headlines ≤ 90 chars. Summaries ≤ 160 chars.\n\n${list}`,
    });
    return parseAiJson(text);
  } catch {
    return null;
  }
}

async function curateWithGroq(rawHeadlines: string[]): Promise<ResearchNewsItem[] | null> {
  if (!groq) return null;
  const list = rawHeadlines.slice(0, 14).map((h, i) => `${i + 1}. ${h}`).join('\n');

  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: 'Return ONLY valid JSON. Curate gynaecology research headlines for a doctor.',
      prompt:
        `Pick 4 top items. JSON: {"items":[{"headline","summary","topic","source":"PubMed"}]}\n\n${list}`,
    });
    return parseAiJson(text);
  } catch {
    return null;
  }
}

async function curateWithGrok(rawHeadlines: string[]): Promise<ResearchNewsItem[] | null> {
  if (!openrouter) return null;
  const list = rawHeadlines.slice(0, 12).map((h, i) => `${i + 1}. ${h}`).join('\n');

  try {
    const { text } = await generateText({
      model: openrouter('x-ai/grok-2-1212'),
      prompt:
        `Curate 4 latest gynaecology research headlines as JSON only: ` +
        `{"items":[{"headline","summary","topic","source":"PubMed"}]}\n\n${list}`,
    });
    return parseAiJson(text);
  } catch {
    return null;
  }
}

function fallbackFromRaw(rawHeadlines: string[]): ResearchNewsItem[] {
  return rawHeadlines.slice(0, 4).map((title) => {
    const topicMatch = title.match(
      /\b(endometriosis|PCOS|fibroid|cervical|ovarian|menopause|IVF|pregnancy|robotic|laparoscopic)\b/i,
    );
    return {
      headline: title.length > 95 ? `${title.slice(0, 92)}…` : title,
      summary: 'Recently indexed on PubMed — explore further with Banu\'s AI Engine.',
      topic: topicMatch ? topicMatch[1] : 'Women\'s health',
      source: 'PubMed',
    };
  });
}

export async function getResearchNews(): Promise<ResearchNewsPayload> {
  const day = todayUtc();
  if (dailyCache?.day === day && !isPlaceholder(dailyCache.payload)) {
    return dailyCache.payload;
  }

  const rawHeadlines = await fetchPubMedHeadlines();
  const providers: string[] = ['PubMed'];

  let items: ResearchNewsItem[] | null = null;

  if (rawHeadlines.length > 0) {
    items = await curateWithGemini(rawHeadlines);
    if (items?.length) providers.push('Gemini');

    if (!items?.length) {
      items = await curateWithGroq(rawHeadlines);
      if (items?.length) providers.push('Groq');
    }

    if (!items?.length) {
      items = await curateWithGrok(rawHeadlines);
      if (items?.length) providers.push('Grok');
    }
  }

  if (!items?.length) {
    items =
      rawHeadlines.length > 0
        ? fallbackFromRaw(rawHeadlines)
        : [
            {
              headline: PLACEHOLDER_HEADLINE,
              summary: 'Latest gynaecology papers will appear here once PubMed and AI sources sync.',
              topic: 'Updates daily',
              source: 'Banu\'s AI Engine',
            },
          ];
  }

  const payload: ResearchNewsPayload = {
    items,
    updatedAt: new Date().toISOString(),
    providers,
  };

  if (rawHeadlines.length > 0) {
    dailyCache = { day, payload };
  }

  return payload;
}
