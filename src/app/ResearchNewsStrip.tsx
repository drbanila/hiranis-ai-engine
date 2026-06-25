'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

type ResearchNewsItem = {
  headline: string;
  summary: string;
  topic: string;
  source: string;
};

type Payload = {
  items: ResearchNewsItem[];
  updatedAt: string;
  providers: string[];
};

function formatUpdated(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return 'Today';
  }
}

export default function ResearchNewsStrip() {
  const [data, setData] = useState<Payload | null>(null);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/research-news')
      .then((r) => r.json())
      .then((json: Payload) => {
        if (!cancelled && json?.items?.length) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const count = data?.items.length ?? 0;

  const go = useCallback(
    (dir: 1 | -1) => {
      if (count <= 1) return;
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + dir + count) % count);
        setFade(true);
      }, 180);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => go(1), 7000);
    return () => clearInterval(id);
  }, [count, go]);

  const item = data?.items[index];
  const providerLabel =
    data?.providers?.length ? data.providers.join(' · ') : 'PubMed · Gemini · Groq';

  return (
    <div className="mt-7 w-full max-w-xl px-1 sm:px-0">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/95 p-px shadow-[0_4px_28px_rgba(15,15,15,0.06)] backdrop-blur-md">
        <div className="rounded-[15px] bg-white/90 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100">
                <BookOpen className="h-3.5 w-3.5 text-[#9d4a6a]" />
              </div>
              <span
                className="text-[13px] font-semibold tracking-wide text-[#2a2226]"
                style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
              >
                Latest Research &amp; News
              </span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b76e8a] opacity-40" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#9d4a6a]" />
              </span>
            </div>
            {data && (
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                Updated {formatUpdated(data.updatedAt)}
              </span>
            )}
          </div>

          <div className="min-h-[4.5rem]">
            {!item ? (
              <div className="flex items-center gap-2 py-2 text-[13px] text-[#a8949c]">
                <Sparkles className="h-4 w-4 animate-pulse text-[#e878a8]" />
                Loading today&apos;s research highlights…
              </div>
            ) : (
              <div
                className={`transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                    {item.topic}
                  </span>
                  <span className="text-[10px] text-[#c4b4bc]">{item.source}</span>
                </div>
                <p
                  className="text-left text-[14px] font-semibold leading-snug break-words text-[#3a2228] sm:text-[15px]"
                  style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
                >
                  {item.headline}
                </p>
                <p className="mt-1.5 text-left text-[12.5px] leading-relaxed text-[#8a6672]">
                  {item.summary}
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2.5">
            <p className="text-[10px] leading-snug text-neutral-400">
              Curated daily from{' '}
              <span className="font-medium text-[#9d4a6a]">{providerLabel}</span>
            </p>
            {count > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous research item"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#c97898] transition-colors hover:bg-[#fce4ef] hover:text-[#a8436e]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <div className="flex gap-1">
                  {data!.items.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Show item ${i + 1}`}
                      onClick={() => {
                        setFade(false);
                        setTimeout(() => {
                          setIndex(i);
                          setFade(true);
                        }, 180);
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        i === index ? 'w-4 bg-[#c74b7a]' : 'w-1.5 bg-[#f0b8cc] hover:bg-[#e878a8]'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next research item"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#c97898] transition-colors hover:bg-[#fce4ef] hover:text-[#a8436e]"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
