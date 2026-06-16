'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect, useMemo } from 'react';
import WelcomeSection from './WelcomeSection';
import DiveInLogo from './DiveInLogo';
import {
  Plus,
  MessageSquare,
  ArrowUp,
  Sparkles,
  Settings,
  PanelLeft,
  User,
  Compass,
  Paperclip,
  Focus,
  Search,
  type LucideIcon,
} from 'lucide-react';

const API_ENDPOINT = '/api/chat';

type Suggestion = { label: string; Icon: LucideIcon };

const SUGGESTIONS: Suggestion[] = [
  { label: 'Explain a hard concept simply', Icon: Sparkles },
  { label: 'Brainstorm ideas for a project', Icon: Compass },
  { label: 'Draft an email for me', Icon: MessageSquare },
  { label: 'Help me plan my week', Icon: Focus },
];

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: API_ENDPOINT }),
    [],
  );
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const isBusy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput('');
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white font-sans text-zinc-900 antialiased selection:bg-zinc-200">
      {/* Sidebar — light surface */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } shrink-0 overflow-hidden border-r border-zinc-200 bg-[#f9f9f9] transition-all duration-300 ease-out`}
      >
        <div className="flex h-full w-72 flex-col">
          <div className="flex items-center gap-2.5 px-4 py-4">
            <DiveInLogo size={34} busy={isBusy} />
            <span className="text-[15px] font-semibold tracking-tight">Hirani&apos;s AI Engine</span>
          </div>

          <div className="px-3">
            <button className="group flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900">
              <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
              New chat
            </button>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto px-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              History
            </p>
            <ul className="space-y-0.5">
              {['Welcome conversation', 'Project brainstorm', 'Weekly planning'].map(
                (label) => (
                  <li key={label}>
                    <button className="flex w-full items-center gap-2.5 truncate rounded-lg px-2.5 py-2 text-left text-sm text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900">
                      <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                      <span className="truncate tracking-tight">{label}</span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="border-t border-zinc-200 p-3">
            <button className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-700 transition-all duration-200 hover:bg-zinc-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 ring-1 ring-black/5">
                <User className="h-4 w-4 text-zinc-600" />
              </div>
              <span className="flex-1 text-left tracking-tight">Your workspace</span>
              <Settings className="h-4 w-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-md">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[15px] font-semibold tracking-tight text-zinc-900">Hirani&apos;s AI Engine</h1>
          <div className="ml-2 flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium tracking-tight text-zinc-500">
              Core Intelligence Active
            </span>
          </div>
        </header>

        {/* Messages / welcome */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <WelcomeSection />
              <div className="mt-9 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => sendMessage({ text: s.label })}
                    className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm tracking-tight text-zinc-600 shadow-sm transition-all duration-200 hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    <s.Icon className="h-4 w-4 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-600" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl px-4 py-8">
              {messages.map((message) => {
                const isUser = message.role === 'user';
                const text = message.parts
                  .map((p) => (p.type === 'text' ? p.text : ''))
                  .join('');
                return (
                  <div
                    key={message.id}
                    className={`mb-7 flex gap-3.5 ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {isUser ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 ring-1 ring-black/5">
                        <User className="h-4 w-4 text-zinc-600" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                        <DiveInLogo size={32} busy={isBusy} />
                      </div>
                    )}
                    {isUser ? (
                      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-zinc-100 px-4 py-2.5 text-[15px] leading-relaxed tracking-tight text-zinc-900">
                        {text}
                      </div>
                    ) : (
                      <div className="max-w-[80%] whitespace-pre-wrap pt-1 text-[15px] leading-[1.75] tracking-[-0.01em] text-zinc-800">
                        {text || (
                          <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating capsule input */}
        <div className="pointer-events-none sticky bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent px-4 pb-6 pt-4">
          <form
            onSubmit={handleSubmit}
            className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-2 py-2 shadow-lg shadow-black/5 transition-all duration-300 focus-within:border-zinc-400 focus-within:shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
          >
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Attach file"
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="System focus"
            >
              <Focus className="h-[18px] w-[18px]" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Hirani&apos;s AI Engine anything…"
              className="flex-1 bg-transparent px-2 py-1.5 text-[15px] tracking-tight text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isBusy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-all duration-200 enabled:hover:scale-105 enabled:hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
              aria-label="Send message"
            >
              <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </button>
          </form>
          <p className="pointer-events-none mt-2.5 text-center text-[11px] tracking-tight text-zinc-400">
            Hirani&apos;s AI Engine can make mistakes. Verify important information.
          </p>
        </div>
      </main>
    </div>
  );
}
