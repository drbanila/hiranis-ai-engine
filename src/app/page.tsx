'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import WelcomeSection from './WelcomeSection';
import HiraniLogo from './HiraniLogo';
import AssistantMarkdown from './AssistantMarkdown';
import {
  loadSessions,
  saveSessions,
  deriveTitle,
  newId,
  type ChatSession,
} from './lib/sessions';
import {
  loadProjects,
  saveProjects,
  newProjectId,
  fileToProjectFile,
  buildProjectContext,
  type Project,
} from './lib/projects';
import {
  Plus,
  MessageSquare,
  ArrowUp,
  Sparkles,
  Lightbulb,
  Mail,
  CalendarDays,
  PanelLeft,
  User,
  Shield,
  ChevronRight,
  ChevronDown,
  Check,
  MoreHorizontal,
  Paperclip,
  Mic,
  MicOff,
  X,
  FileText,
  Volume2,
  Square,
  Folder,
  FolderPlus,
  Settings2,
  Pin,
  PinOff,
  Trash2,
  FolderInput,
  CornerUpLeft,
  Upload,
  type LucideIcon,
} from 'lucide-react';

// --- Model selector ----------------------------------------------------------

const MODEL_STORAGE_KEY = 'hae_model';

interface ModelOption {
  id: string;
  label: string;
  badge: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  { id: 'auto',          label: 'Auto',          badge: 'Smart routing' },
  { id: 'gemini-lite',   label: 'Gemini Lite',   badge: 'Fast & free'   },
  { id: 'gemini-flash',  label: 'Gemini Flash',  badge: 'Balanced'      },
  { id: 'qwen',          label: 'Qwen',          badge: 'OpenRouter'    },
  { id: 'llama',         label: 'Llama',         badge: 'OpenRouter'    },
  { id: 'gemma',         label: 'Gemma',         badge: 'OpenRouter'    },
  { id: 'groq-fast',     label: 'Groq Fast',     badge: 'Fast Groq'     },
  { id: 'groq-quality',  label: 'Groq Quality',  badge: 'Better Groq'   },
  { id: 'qwen-groq',     label: 'Qwen - Groq',   badge: 'Fast free Qwen' },
];

const BASE_ENDPOINT = '/api/chat';

// Strip markdown so read-aloud sounds natural (no **, #, `, tables, links).
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')          // code fences
    .replace(/`([^`]+)`/g, '$1')              // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')    // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')  // links → text
    .replace(/^#{1,6}\s+/gm, '')              // headings
    .replace(/(\*\*|__)(.*?)\1/g, '$2')       // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')          // italic
    .replace(/~~(.*?)~~/g, '$1')              // strikethrough
    .replace(/^\s*>+\s?/gm, '')               // blockquotes
    .replace(/^\s*[-*+]\s+/gm, '')            // bullet lists
    .replace(/^\s*\d+\.\s+/gm, '')            // numbered lists
    .replace(/^[\s|:-]*\|[\s|:-]*$/gm, ' ')   // table separator rows
    .replace(/\|/g, ' ')                      // table pipes
    .replace(/\n{2,}/g, '. ')                 // paragraph breaks → pause
    .replace(/\s+/g, ' ')
    .trim();
}

type Suggestion = {
  label: string;
  desc: string;
  Icon: LucideIcon;
  tile: string;
  ink: string;
};

const SUGGESTIONS: Suggestion[] = [
  {
    label: 'Explain a hard concept simply',
    desc: 'Make complex topics easy to understand',
    Icon: Sparkles,
    tile: 'bg-[#efeefb]',
    ink: 'text-[#6d5ce0]',
  },
  {
    label: 'Brainstorm ideas for a project',
    desc: 'Generate creative ideas and angles',
    Icon: Lightbulb,
    tile: 'bg-[#e9eefb]',
    ink: 'text-[#3b63c4]',
  },
  {
    label: 'Draft an email for me',
    desc: 'Professional, clear, and effective',
    Icon: Mail,
    tile: 'bg-[#e8f6ee]',
    ink: 'text-[#2d8a5e]',
  },
  {
    label: 'Help me plan my week',
    desc: 'Organize tasks and priorities',
    Icon: CalendarDays,
    tile: 'bg-[#fbf3e4]',
    ink: 'text-[#c08a2d]',
  },
];

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Collapse the sidebar by default on small screens.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);
  // Model selector state — persisted to localStorage, hydrated after mount.
  const [selectedModel, setSelectedModelRaw] = useState('auto');
  const [modelDropOpen, setModelDropOpen] = useState(false);
  const modelDropRef = useRef<HTMLDivElement>(null);

  function setSelectedModel(id: string) {
    setSelectedModelRaw(id);
    try { localStorage.setItem(MODEL_STORAGE_KEY, id); } catch {}
    setModelDropOpen(false);
  }

  // Close dropdown on outside click.
  useEffect(() => {
    if (!modelDropOpen) return;
    function handler(e: MouseEvent) {
      if (modelDropRef.current && !modelDropRef.current.contains(e.target as Node)) {
        setModelDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelDropOpen]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${BASE_ENDPOINT}?model=${selectedModel}`,
        // Inject the current chat's project context (notes + text files) into
        // the request body so the model is grounded on the project. Read from a
        // ref so we always send the latest without recreating the transport.
        prepareSendMessagesRequest: ({ id, messages, trigger, messageId, body }) => ({
          body: {
            ...body,
            id,
            messages,
            trigger,
            messageId,
            projectContext: projectContextRef.current || undefined,
          },
        }),
      }),
    [selectedModel],
  );
  const { messages, sendMessage, status, setMessages, error } = useChat({ transport });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll anchoring — bring the TOP of each new assistant answer into view,
  // once per answer. We do NOT auto-scroll to the bottom.
  const assistantRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingAnchorRef = useRef(false);

  // Read-aloud (browser text-to-speech) for assistant answers.
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Projects (folders)
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [drawerProjectId, setDrawerProjectId] = useState<string | null>(null);
  // Which project a brand-new (unsaved) chat will belong to once it gets messages.
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  // Open "..." chat menu + its "Move to project" submenu.
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  // Latest project context, read by the transport's prepareSendMessagesRequest.
  const projectContextRef = useRef('');

  const isBusy = status === 'submitted' || status === 'streaming';

  // Voice input via Web Speech API (Chrome/Edge + Safari via webkit prefix)
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceBaseRef = useRef('');

  // Detect support after mount (avoids SSR window access).
  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  // Auto-dismiss any voice error after a few seconds.
  useEffect(() => {
    if (!voiceError) return;
    const t = setTimeout(() => setVoiceError(null), 4000);
    return () => clearTimeout(t);
  }, [voiceError]);

  function handleVoice() {
    // Already listening → stop and tear down.
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch {}
      return;
    }

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      setVoiceError('Voice input is not supported in this browser. Try Chrome, Edge, or Safari 14.1+.');
      return;
    }

    // Safari can throw if a previous instance is still active — clean up first.
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = 'en-US';

    // Preserve any text the user already typed; append speech to it.
    voiceBaseRef.current = input ? input.replace(/\s*$/, '') + ' ' : '';

    rec.onstart = () => {
      setVoiceError(null);
      setIsListening(true);
    };

    rec.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setInput(voiceBaseRef.current + transcript);
    };

    rec.onerror = (e: any) => {
      setIsListening(false);
      switch (e?.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          setVoiceError('Microphone access was blocked. Allow it in Safari → Settings → Websites → Microphone.');
          break;
        case 'no-speech':
          setVoiceError("Didn't catch that — please try speaking again.");
          break;
        case 'audio-capture':
          setVoiceError('No microphone found. Check your device and try again.');
          break;
        case 'aborted':
          // User-initiated stop; no message needed.
          break;
        default:
          setVoiceError('Voice input failed. Please try again.');
      }
    };

    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      // Safari throws InvalidStateError if start() races a prior session.
      setIsListening(false);
      setVoiceError('Voice input is busy — please tap the mic again.');
    }
  }

  // File attachments
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => { filePreviews.forEach((u) => { if (u) URL.revokeObjectURL(u); }); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).slice(0, 5 - attachedFiles.length);
    e.target.value = '';
    if (!picked.length) return;
    const oversized = picked.filter((f) => f.size > 4 * 1024 * 1024);
    if (oversized.length) { alert(`File too large (max 4 MB): ${oversized.map((f) => f.name).join(', ')}`); return; }
    setAttachedFiles((prev) => [...prev, ...picked]);
    setFilePreviews((prev) => [
      ...prev,
      ...picked.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : '')),
    ]);
  }

  function removeAttachment(i: number) {
    if (filePreviews[i]) URL.revokeObjectURL(filePreviews[i]);
    setAttachedFiles((prev) => prev.filter((_, j) => j !== i));
    setFilePreviews((prev) => prev.filter((_, j) => j !== i));
  }

  function fmtBytes(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Live "thinking" seconds counter — runs while the assistant is working.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isBusy) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    setElapsed(0);
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [isBusy]);

  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    if (loaded.length > 0) {
      const recent = [...loaded].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setActiveId(recent.id);
      setMessages(recent.messages);
    }
    try {
      const saved = localStorage.getItem(MODEL_STORAGE_KEY);
      if (saved && MODEL_OPTIONS.some((m) => m.id === saved)) setSelectedModelRaw(saved);
    } catch {}
    setProjects(loadProjects());
    setHydrated(true);
  }, [setMessages]);

  // Persist projects whenever they change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    saveProjects(projects);
  }, [projects, hydrated]);

  // Close the chat "..." menu on outside click.
  useEffect(() => {
    if (!chatMenuId) return;
    function handler(e: MouseEvent) {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setChatMenuId(null);
        setMoveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [chatMenuId]);

  useEffect(() => {
    if (!hydrated || messages.length === 0) return;
    const id = activeId ?? newId();
    if (!activeId) setActiveId(id);
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === id);
      const session: ChatSession = {
        id,
        title: deriveTitle(messages),
        updatedAt: Date.now(),
        messages,
        // Preserve folder + pin on updates; assign the pending project on create.
        projectId: existing ? existing.projectId ?? null : pendingProjectId,
        pinned: existing ? existing.pinned ?? false : false,
      };
      const next = existing
        ? prev.map((s) => (s.id === id ? session : s))
        : [session, ...prev];
      saveSessions(next);
      return next;
    });
  }, [messages, hydrated, activeId, pendingProjectId]);

  // ChatGPT-style anchoring: when a freshly-sent answer arrives, bring the
  // start of that assistant message to the top — once. No bottom-snapping,
  // no fighting the user's manual scroll, and no anchoring on history load
  // (pendingAnchorRef is only set when the user actually sends a message).
  useEffect(() => {
    if (!pendingAnchorRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    // Wait until the answer actually has text — only then is there enough
    // content below it to bring its first line to the top of the viewport.
    const hasText = last.parts?.some(
      (p) => p.type === 'text' && p.text.trim().length > 0,
    );
    if (!hasText) return;
    const el = assistantRefs.current.get(last.id);
    if (el) {
      pendingAnchorRef.current = false;
      // Defer one frame so layout is flushed before we scroll.
      requestAnimationFrame(() =>
        el.scrollIntoView({ block: 'start', behavior: 'smooth' }),
      );
    }
  }, [messages]);

  // Detect speech-synthesis support after mount (avoids SSR window access).
  useEffect(() => {
    setSpeechSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  // Auto-dismiss the speech error toast.
  useEffect(() => {
    if (!speechError) return;
    const t = setTimeout(() => setSpeechError(null), 4000);
    return () => clearTimeout(t);
  }, [speechError]);

  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeakingId(null);
  }, []);

  // Stop any read-aloud when the model changes, and on unmount.
  useEffect(() => {
    stopSpeaking();
    return () => { try { window.speechSynthesis?.cancel(); } catch {} };
  }, [selectedModel, stopSpeaking]);

  const toggleSpeak = useCallback(
    (id: string, raw: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setSpeechSupported(false);
        setSpeechError('Speech playback is not supported in this browser.');
        return;
      }
      // Clicking the active button stops it.
      if (speakingId === id) {
        stopSpeaking();
        return;
      }
      // Starting a new answer cancels any in-progress speech.
      window.speechSynthesis.cancel();
      const text = stripMarkdown(raw);
      if (!text) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const enVoice =
        voices.find((v) => /^en[-_]/i.test(v.lang)) ||
        voices.find((v) => /en/i.test(v.lang));
      if (enVoice) utter.voice = enVoice;
      utter.lang = enVoice?.lang || 'en-US';
      utter.onend = () => setSpeakingId(null);
      utter.onerror = () => setSpeakingId(null);
      setSpeakingId(id);
      window.speechSynthesis.speak(utter);
    },
    [speakingId, stopSpeaking],
  );

  const closeOnMobile = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    stopSpeaking();
    setPendingProjectId(null);
    setActiveId(null);
    setMessages([]);
    setInput('');
    closeOnMobile();
  }, [setMessages, closeOnMobile, stopSpeaking]);

  const handleSelectSession = useCallback(
    (id: string) => {
      if (isBusy) return;
      const session = sessions.find((s) => s.id === id);
      if (!session) return;
      stopSpeaking();
      setPendingProjectId(null);
      setActiveId(id);
      setMessages(session.messages);
      setChatMenuId(null);
      setMoveMenuId(null);
      closeOnMobile();
    },
    [sessions, setMessages, isBusy, closeOnMobile, stopSpeaking],
  );

  // ── Project handlers ──────────────────────────────────────────────
  const createProject = useCallback(() => {
    const name = (typeof window !== 'undefined'
      ? window.prompt('Project name', 'New project')
      : 'New project')?.trim();
    if (!name) return;
    const now = Date.now();
    const project: Project = {
      id: newProjectId(),
      name,
      notes: '',
      files: [],
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [project, ...prev]);
    setExpandedProjects((prev) => ({ ...prev, [project.id]: true }));
  }, []);

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
      );
    },
    [],
  );

  const deleteProject = useCallback(
    (id: string) => {
      // Move the project's chats back to the main list — never delete them.
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.projectId === id ? { ...s, projectId: null } : s,
        );
        saveSessions(next);
        return next;
      });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDrawerProjectId((d) => (d === id ? null : d));
      if (pendingProjectId === id) setPendingProjectId(null);
    },
    [pendingProjectId],
  );

  const addProjectFiles = useCallback(
    async (id: string, files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      const oversized = list.filter((f) => f.size > 4 * 1024 * 1024);
      if (oversized.length) {
        alert(`File too large (max 4 MB): ${oversized.map((f) => f.name).join(', ')}`);
      }
      const ok = list.filter((f) => f.size <= 4 * 1024 * 1024);
      const parsed = await Promise.all(ok.map((f) => fileToProjectFile(f)));
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, files: [...p.files, ...parsed], updatedAt: Date.now() } : p,
        ),
      );
    },
    [],
  );

  const removeProjectFile = useCallback(
    (projectId: string, fileId: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, files: p.files.filter((f) => f.id !== fileId), updatedAt: Date.now() }
            : p,
        ),
      );
    },
    [],
  );

  const newChatInProject = useCallback(
    (projectId: string) => {
      stopSpeaking();
      setPendingProjectId(projectId);
      setActiveId(null);
      setMessages([]);
      setInput('');
      setExpandedProjects((prev) => ({ ...prev, [projectId]: true }));
      setDrawerProjectId(null);
      closeOnMobile();
    },
    [setMessages, closeOnMobile, stopSpeaking],
  );

  const moveChatToProject = useCallback(
    (chatId: string, projectId: string | null) => {
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === chatId ? { ...s, projectId, updatedAt: Date.now() } : s,
        );
        saveSessions(next);
        return next;
      });
      if (chatId === activeId) setPendingProjectId(null);
      if (projectId) setExpandedProjects((prev) => ({ ...prev, [projectId]: true }));
      setChatMenuId(null);
      setMoveMenuId(null);
    },
    [activeId],
  );

  const togglePin = useCallback((chatId: string) => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === chatId ? { ...s, pinned: !s.pinned, updatedAt: Date.now() } : s,
      );
      saveSessions(next);
      return next;
    });
    setChatMenuId(null);
  }, []);

  const handleDeleteSession = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        saveSessions(next);
        return next;
      });
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      setChatMenuId(null);
      setMoveMenuId(null);
    },
    [activeId, setMessages],
  );

  // ── Derived ───────────────────────────────────────────────────────
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );
  // The project this chat is in (existing session's project, or the pending one
  // for a brand-new chat started from inside a project).
  const currentProjectId = activeSession?.projectId ?? pendingProjectId ?? null;
  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId) ?? null,
    [projects, currentProjectId],
  );

  // Keep the transport's project-context ref in sync with the current chat.
  useEffect(() => {
    projectContextRef.current = currentProject ? buildProjectContext(currentProject) : '';
  }, [currentProject]);

  const drawerProject = useMemo(
    () => projects.find((p) => p.id === drawerProjectId) ?? null,
    [projects, drawerProjectId],
  );

  // Main list: chats NOT in a project, pinned first, then by recency.
  const mainChats = useMemo(
    () =>
      [...sessions]
        .filter((s) => !s.projectId)
        .sort(
          (a, b) =>
            Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt,
        ),
    [sessions],
  );

  // Chats grouped by project (for nested rendering), pinned first.
  const chatsByProject = useMemo(() => {
    const map: Record<string, ChatSession[]> = {};
    for (const s of sessions) {
      if (!s.projectId) continue;
      (map[s.projectId] ??= []).push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort(
        (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt,
      );
    }
    return map;
  }, [sessions]);

  // Capture a pasted image (screenshot) into the attachment preview strip.
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const images: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          const ext = blob.type.split('/')[1] || 'png';
          images.push(
            new File([blob], `screenshot-${Date.now()}.${ext}`, { type: blob.type }),
          );
        }
      }
    }
    if (!images.length) return;
    e.preventDefault();
    setAttachedFiles((prev) => {
      const room = 5 - prev.length;
      return [...prev, ...images.slice(0, Math.max(0, room))];
    });
    setFilePreviews((prev) => {
      const room = 5 - prev.length;
      return [...prev, ...images.slice(0, Math.max(0, room)).map((f) => URL.createObjectURL(f))];
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if ((!text && attachedFiles.length === 0) || isBusy) return;
    let fileList: FileList | undefined;
    if (attachedFiles.length > 0) {
      const dt = new DataTransfer();
      attachedFiles.forEach((f) => dt.items.add(f));
      fileList = dt.files;
    }
    // Make sure the latest project context is attached to this send.
    projectContextRef.current = currentProject ? buildProjectContext(currentProject) : '';
    pendingAnchorRef.current = true;
    sendMessage({ text, files: fileList });
    setInput('');
    filePreviews.forEach((u) => { if (u) URL.revokeObjectURL(u); });
    setAttachedFiles([]);
    setFilePreviews([]);
  }

  // Render a single chat row with the "..." menu (Pin / Move / Delete).
  function renderChatRow(s: ChatSession) {
    const isActive = s.id === activeId;
    const menuOpen = chatMenuId === s.id;
    return (
      <li key={s.id} className="relative">
        <div
          onClick={() => handleSelectSession(s.id)}
          className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-all duration-150 ${
            isActive
              ? 'bg-white text-[#1a1f2e] shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
              : 'text-[#5c5f6b] hover:bg-[#efefec] hover:text-[#1a1f2e]'
          }`}
        >
          {s.pinned ? (
            <Pin className="h-3.5 w-3.5 shrink-0 text-[#6d5ce0]" />
          ) : (
            <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#6d5ce0]' : 'opacity-50'}`} />
          )}
          <span className="flex-1 truncate">{s.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMoveMenuId(null);
              setChatMenuId(menuOpen ? null : s.id);
            }}
            className={`shrink-0 rounded p-0.5 text-[#b6b7bf] transition-opacity hover:text-[#1a1f2e] ${
              menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            aria-label="Chat options"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        {menuOpen && (
          <div
            ref={chatMenuRef}
            className="absolute right-1 top-9 z-50 w-48 rounded-xl border border-[#e4e4e1] bg-white py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
          >
            <button
              onClick={(e) => { e.stopPropagation(); togglePin(s.id); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[#5c5f6b] hover:bg-[#f7f7f5]"
            >
              {s.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              {s.pinned ? 'Unpin' : 'Pin'}
            </button>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMoveMenuId(moveMenuId === s.id ? null : s.id); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[#5c5f6b] hover:bg-[#f7f7f5]"
              >
                <FolderInput className="h-3.5 w-3.5" />
                <span className="flex-1">Move to project</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </button>
              {moveMenuId === s.id && (
                <div className="mt-0.5 max-h-52 overflow-y-auto border-t border-[#f0f0ee] py-1">
                  {projects.length === 0 && (
                    <p className="px-3 py-1.5 pl-6 text-[12px] text-[#b6b7bf]">No projects yet</p>
                  )}
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={(e) => { e.stopPropagation(); moveChatToProject(s.id, p.id); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 pl-6 text-left text-[12.5px] text-[#5c5f6b] hover:bg-[#f7f7f5]"
                    >
                      <Folder className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="flex-1 truncate">{p.name}</span>
                      {s.projectId === p.id && <Check className="h-3.5 w-3.5 shrink-0 text-[#2a2f6b]" />}
                    </button>
                  ))}
                  {s.projectId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); moveChatToProject(s.id, null); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 pl-6 text-left text-[12.5px] text-[#5c5f6b] hover:bg-[#f7f7f5]"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      Remove from project
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="my-1 border-t border-[#f0f0ee]" />
            <button
              onClick={(e) => handleDeleteSession(s.id, e)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete chat
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fbfbfa] font-sans text-[#1a1f2e] antialiased selection:bg-[#efeefb]">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[272px] overflow-hidden border-r border-[#ececea] bg-[#f7f7f5] transition-transform duration-300 ease-out md:static md:z-auto md:shrink-0 md:transition-[width] ${
          sidebarOpen
            ? 'translate-x-0 md:w-[272px]'
            : '-translate-x-full md:w-0 md:translate-x-0'
        }`}
      >
        <div className="flex h-full w-[272px] flex-col">

          {/* Brand */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4">
            <HiraniLogo size={36} pulse={isBusy} />
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight text-[#1a1f2e]">
                Banila AI Engine
              </div>
              <div className="text-[11px] text-[#9a9ba5]">Private Intelligence</div>
            </div>
          </div>

          {/* New chat */}
          <div className="px-3 pb-2">
            <button
              onClick={handleNewChat}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#2a2f6b] px-3 py-2.5 text-[13.5px] font-medium text-white shadow-[0_2px_8px_rgba(42,47,107,0.25)] transition-all duration-150 hover:bg-[#232757] hover:shadow-[0_3px_12px_rgba(42,47,107,0.32)]"
            >
              <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
              New chat
            </button>
          </div>

          {/* Projects + Chats (scroll area) */}
          <div className="mt-3 flex-1 overflow-y-auto px-3">

            {/* Projects */}
            <div className="mb-3">
              <div className="flex items-center justify-between px-2 pb-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a4a5ae]">
                  Projects
                </p>
                <button
                  onClick={createProject}
                  aria-label="New project"
                  title="New project"
                  className="flex h-5 w-5 items-center justify-center rounded text-[#a4a5ae] transition-colors hover:bg-[#efefec] hover:text-[#1a1f2e]"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
              </div>
              {projects.length === 0 ? (
                <p className="px-2 py-1 text-[12px] text-[#b6b7bf]">
                  {hydrated ? 'No projects yet.' : ''}
                </p>
              ) : (
                <ul className="space-y-px">
                  {projects.map((p) => {
                    const expanded = !!expandedProjects[p.id];
                    const pChats = chatsByProject[p.id] ?? [];
                    const isCurrent = currentProjectId === p.id;
                    return (
                      <li key={p.id}>
                        <div
                          className={`group flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-[13.5px] transition-colors ${
                            isCurrent ? 'bg-[#efeefb]/70' : 'hover:bg-[#efefec]'
                          }`}
                        >
                          <button
                            onClick={() =>
                              setExpandedProjects((prev) => ({ ...prev, [p.id]: !expanded }))
                            }
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#9a9ba5] hover:text-[#1a1f2e]"
                            aria-label={expanded ? 'Collapse project' : 'Expand project'}
                          >
                            <ChevronRight
                              className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
                            />
                          </button>
                          <button
                            onClick={() =>
                              setExpandedProjects((prev) => ({ ...prev, [p.id]: !expanded }))
                            }
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <Folder
                              className={`h-4 w-4 shrink-0 ${isCurrent ? 'text-[#6d5ce0]' : 'text-[#8a8d99]'}`}
                            />
                            <span className="truncate text-[#3a3d49]">{p.name}</span>
                            {pChats.length > 0 && (
                              <span className="shrink-0 text-[10px] text-[#b6b7bf]">{pChats.length}</span>
                            )}
                          </button>
                          <button
                            onClick={() => setDrawerProjectId(p.id)}
                            aria-label="Project settings"
                            title="Project settings"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#b6b7bf] opacity-0 transition-opacity hover:bg-white hover:text-[#1a1f2e] group-hover:opacity-100"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {expanded && (
                          <div className="ml-3 border-l border-[#e7e7e4] pl-1.5">
                            <ul className="space-y-px">{pChats.map((s) => renderChatRow(s))}</ul>
                            <button
                              onClick={() => newChatInProject(p.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#9a9ba5] transition-colors hover:bg-[#efefec] hover:text-[#1a1f2e]"
                            >
                              <Plus className="h-3.5 w-3.5" /> New chat
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Chats */}
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a4a5ae]">
              Chats
            </p>
            {mainChats.length === 0 ? (
              <p className="px-2 py-1.5 text-[12.5px] text-[#b6b7bf]">
                {hydrated ? 'No conversations yet.' : ''}
              </p>
            ) : (
              <ul className="space-y-px">{mainChats.map((s) => renderChatRow(s))}</ul>
            )}
          </div>

          {/* Workspace */}
          <div className="px-3 pt-2">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a4a5ae]">
              Workspace
            </p>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-[#5c5f6b] transition-all duration-150 hover:bg-[#efefec] hover:text-[#1a1f2e]">
              <User className="h-4 w-4 opacity-60" />
              <span className="flex-1 text-left">Your workspace</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            </button>
          </div>

          {/* Private & Secure card */}
          <div className="p-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-[#ececea] bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#efeefb]">
                <Shield className="h-3.5 w-3.5 text-[#6d5ce0]" />
              </div>
              <div className="leading-snug">
                <div className="text-[12.5px] font-semibold text-[#1a1f2e]">Private &amp; Secure</div>
                <div className="text-[11.5px] text-[#9a9ba5]">
                  Your conversations stay private and protected.
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main column ────────────────────────────────────────────── */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col">

        {/* Header */}
        <header className="flex items-center gap-3 border-b border-[#ececea] bg-[#fbfbfa]/90 px-4 py-3 backdrop-blur-md">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded-lg p-1.5 text-[#9a9ba5] transition-colors hover:bg-[#efefec] hover:text-[#1a1f2e]"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>

          <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-[#1a1f2e]">
            Banila AI Engine
          </span>

          {/* Status badge */}
          <div className="ml-1 hidden items-center gap-1.5 rounded-full border border-[#cdeede] bg-[#f0faf5] px-3 py-[4px] sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11.5px] font-medium tracking-tight text-[#2d8a5e]">
              Core Intelligence Active
            </span>
          </div>

          {/* Model selector dropdown */}
          <div className="relative ml-1" ref={modelDropRef}>
            <button
              onClick={() => setModelDropOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full border border-[#e4e4e1] bg-white px-3 py-[4px] text-[11.5px] font-medium text-[#5c5f6b] transition-colors hover:border-[#c4c5cc] hover:text-[#1a1f2e]"
              aria-label="Select model"
            >
              <span className="hidden text-[10px] text-[#9a9ba5] sm:inline">Model:</span>
              <span>{MODEL_OPTIONS.find((m) => m.id === selectedModel)?.label ?? 'Auto'}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>

            {modelDropOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-[#e4e4e1] bg-white py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
                <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b6b7bf]">
                  Intelligence Model
                </p>
                {MODEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedModel(opt.id)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#f7f7f5] ${
                      selectedModel === opt.id
                        ? 'text-[#2a2f6b]'
                        : 'text-[#5c5f6b]'
                    }`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {selectedModel === opt.id && (
                        <Check className="h-3.5 w-3.5 text-[#2a2f6b]" />
                      )}
                    </span>
                    <span className="flex-1 text-[13px] font-medium">{opt.label}</span>
                    <span className="text-[10.5px] text-[#b6b7bf]">{opt.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Project banner — shows which project this chat belongs to */}
          {currentProject && (
            <button
              onClick={() => setDrawerProjectId(currentProject.id)}
              title="Open project settings"
              className="ml-1 hidden items-center gap-1.5 rounded-full border border-[#e0ddf5] bg-[#efeefb] px-3 py-[4px] transition-colors hover:border-[#cfc8f0] md:flex"
            >
              <Folder className="h-3.5 w-3.5 text-[#6d5ce0]" />
              <span className="max-w-[160px] truncate text-[11.5px] font-medium text-[#4a3f8f]">
                {currentProject.name}
              </span>
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ececea] bg-white text-[#6b6f7d]">
              <User className="h-4 w-4" />
            </div>
          </div>
        </header>

        {/* Messages / welcome */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col items-center px-6 py-10 text-center">
              <div className="my-auto flex w-full flex-col items-center">
              <WelcomeSection />

              {/* Suggestion cards */}
              <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 lg:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => { pendingAnchorRef.current = true; sendMessage({ text: s.label }); }}
                    className="group flex items-center gap-3.5 rounded-2xl border border-[#ececea] bg-white px-4 py-3.5 text-left shadow-[0_1px_4px_rgba(0,0,0,0.03)] transition-all duration-150 hover:border-[#d8d8d4] hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)]"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.tile}`}>
                      <s.Icon className={`h-[18px] w-[18px] ${s.ink}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-[#1a1f2e]">
                        {s.label}
                      </div>
                      <div className="truncate text-[12px] text-[#9a9ba5]">{s.desc}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#c4c5cc] transition-transform duration-150 group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
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
                    ref={(el) => {
                      if (el && message.role === 'assistant') assistantRefs.current.set(message.id, el);
                      else if (!el) assistantRefs.current.delete(message.id);
                    }}
                    className={`mb-6 flex scroll-mt-3 gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {isUser ? (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a2f6b] text-white">
                        <span className="text-[10px] font-semibold">B</span>
                      </div>
                    ) : (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
                        <HiraniLogo size={28} pulse={isBusy && message === messages[messages.length - 1]} />
                      </div>
                    )}

                    {isUser ? (
                      <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm border border-[#d6e0f5] bg-[#eef3fc] px-4 py-2.5 text-[14px] leading-relaxed text-[#1a2438] shadow-[0_1px_3px_rgba(42,47,107,0.06)] sm:max-w-[78%]">
                        {text}
                      </div>
                    ) : (
                      <div className="min-w-0 max-w-[88%] pt-0.5 sm:max-w-[85%]">
                        {text ? (
                          <>
                            <AssistantMarkdown>{text}</AssistantMarkdown>
                            {/* Read-aloud — never autoplays; starts on tap. */}
                            <div className="mt-1 flex items-center">
                              <button
                                type="button"
                                onClick={() => toggleSpeak(message.id, text)}
                                disabled={!speechSupported}
                                aria-label={speakingId === message.id ? 'Stop reading' : 'Read response aloud'}
                                title={speakingId === message.id ? 'Stop reading' : 'Read response aloud'}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#a4a5ae] transition-colors hover:bg-[#f3f3f1] hover:text-[#6b6f7d] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {speakingId === message.id ? (
                                  <Square className="h-3.5 w-3.5 fill-current" />
                                ) : (
                                  <Volume2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-2 pt-1 text-[13.5px] text-[#8a8d99]">
                            <span className="inline-flex gap-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6d5ce0] opacity-60 [animation-delay:-0.3s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6d5ce0] opacity-60 [animation-delay:-0.15s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6d5ce0] opacity-60" />
                            </span>
                            <span>
                              Banila AI Engine is thinking
                              <span className="text-[#b6b7bf]"> · {elapsed}s</span>
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Thinking placeholder — shown while waiting before the
                  assistant message exists (status: submitted). */}
              {isBusy &&
                messages[messages.length - 1]?.role === 'user' && (
                  <div className="mb-6 flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
                      <HiraniLogo size={28} pulse />
                    </div>
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-2 text-[13.5px] text-[#8a8d99]">
                        <span className="inline-flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6d5ce0] opacity-60 [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6d5ce0] opacity-60 [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6d5ce0] opacity-60" />
                        </span>
                        <span>
                          Banila AI Engine is thinking
                          <span className="text-[#b6b7bf]"> · {elapsed}s</span>
                        </span>
                      </span>
                    </div>
                  </div>
                )}

              {/* Error bubble — clean, professional */}
              {error && !isBusy && (
                <div className="mb-6 flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
                    <HiraniLogo size={28} />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#f2d4d1] bg-[#fdf3f2] px-4 py-2.5 text-[14px] leading-relaxed text-[#9b2c22] sm:max-w-[80%]">
                    Something went wrong while reaching Banila AI Engine. Please try again.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="pointer-events-none sticky bottom-0 bg-gradient-to-t from-[#fbfbfa] via-[#fbfbfa]/90 to-transparent px-4 pb-5 pt-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.csv,.json"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Voice / speech status & error toast */}
          {(voiceError || speechError || isListening) && (
            <div className="pointer-events-none mx-auto mb-2 flex w-full max-w-2xl justify-center">
              <div
                className={`pointer-events-auto flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium shadow-sm ${
                  voiceError || speechError
                    ? 'border-[#f2d4d1] bg-[#fdf3f2] text-[#9b2c22]'
                    : 'border-[#f5d0d0] bg-[#fdf0f0] text-red-500'
                }`}
              >
                {voiceError || speechError ? (
                  <span>{voiceError || speechError}</span>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    <span>Listening… speak now</span>
                  </>
                )}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col rounded-2xl border border-[#e4e4e1] bg-white px-3 py-2 shadow-[0_2px_14px_rgba(0,0,0,0.06)] transition-all duration-200 focus-within:border-[#6d5ce0]/40 focus-within:shadow-[0_4px_22px_rgba(109,92,224,0.12)]"
          >
            {/* File preview strip */}
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 border-b border-[#f0f0ee] pb-2 pt-0.5">
                {attachedFiles.map((file, i) => (
                  <div key={i} className="relative flex items-center gap-2 rounded-xl border border-[#e4e4e1] bg-[#f7f7f5] p-1.5 pr-2">
                    {filePreviews[i] ? (
                      <img src={filePreviews[i]} alt={file.name} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#efeefb]">
                        <FileText className="h-4 w-4 text-[#6d5ce0]" />
                      </div>
                    )}
                    <div className="max-w-[90px]">
                      <p className="truncate text-[11px] font-medium text-[#1a1f2e]">{file.name}</p>
                      <p className="text-[10px] text-[#9a9ba5]">{fmtBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e4e4e1] text-[#6b6f7d] hover:bg-[#d0d0cc]"
                      aria-label="Remove file"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachedFiles.length >= 5}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#a4a5ae] transition-colors hover:bg-[#f3f3f1] hover:text-[#6b6f7d] disabled:opacity-40"
                aria-label="Attach file"
              >
                <Paperclip className="h-[18px] w-[18px]" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey)
                    handleSubmit(e as unknown as React.FormEvent);
                }}
                placeholder="Ask Banila AI Engine anything..."
                className="flex-1 bg-transparent px-1 py-1.5 text-[14px] text-[#1a1f2e] placeholder:text-[#b6b7bf] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleVoice}
                disabled={!voiceSupported}
                title={
                  voiceSupported
                    ? isListening
                      ? 'Stop recording'
                      : 'Voice input'
                    : 'Voice input not supported in this browser'
                }
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isListening
                    ? 'bg-red-50 text-red-500 hover:bg-red-100'
                    : 'text-[#a4a5ae] hover:bg-[#f3f3f1] hover:text-[#6b6f7d]'
                }`}
                aria-label={isListening ? 'Stop recording' : 'Voice input'}
              >
                {isListening ? (
                  <MicOff className="h-[18px] w-[18px] animate-pulse" />
                ) : (
                  <Mic className="h-[18px] w-[18px]" />
                )}
              </button>
              <button
                type="submit"
                disabled={(!input.trim() && attachedFiles.length === 0) || isBusy}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2a2f6b] text-white transition-all duration-150 enabled:hover:bg-[#232757] enabled:hover:shadow-[0_2px_10px_rgba(42,47,107,0.32)] disabled:cursor-not-allowed disabled:bg-[#e4e4e1] disabled:text-[#b6b7bf]"
                aria-label="Send"
              >
                <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
              </button>
            </div>
          </form>
          <p className="pointer-events-none mt-2 text-center text-[11px] text-[#b6b7bf]">
            Banila AI Engine can make mistakes. Verify important information.
          </p>
        </div>
      </main>

      {/* ── Project settings drawer ─────────────────────────────────── */}
      {drawerProject && (
        <>
          <button
            aria-label="Close project panel"
            onClick={() => setDrawerProjectId(null)}
            className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1px]"
          />
          <aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[380px] flex-col border-l border-[#ececea] bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between border-b border-[#ececea] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efeefb]">
                  <Folder className="h-4 w-4 text-[#6d5ce0]" />
                </div>
                <span className="text-[14px] font-semibold text-[#1a1f2e]">Project</span>
              </div>
              <button
                onClick={() => setDrawerProjectId(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-[#9a9ba5] transition-colors hover:bg-[#f3f3f1] hover:text-[#1a1f2e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Name */}
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a4a5ae]">
                Name
              </label>
              <input
                value={drawerProject.name}
                onChange={(e) => updateProject(drawerProject.id, { name: e.target.value })}
                className="mb-4 w-full rounded-xl border border-[#e4e4e1] bg-white px-3 py-2 text-[14px] text-[#1a1f2e] transition-colors focus:border-[#6d5ce0]/50 focus:outline-none"
              />

              {/* Files */}
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a4a5ae]">
                  Files
                </label>
                <button
                  onClick={() => projectFileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#6d5ce0] transition-colors hover:bg-[#efeefb]"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
              </div>
              <input
                ref={projectFileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.tsx,.jsx,.py,.css,.html,.xml,.yml,.yaml,.sql,.go,.rs,.rb,.php,.java,.c,.cpp,.sh"
                onChange={(e) => {
                  const f = e.target.files;
                  e.currentTarget.value = '';
                  if (f) addProjectFiles(drawerProject.id, f);
                }}
              />
              {drawerProject.files.length === 0 ? (
                <p className="mb-4 rounded-xl border border-dashed border-[#e4e4e1] px-3 py-4 text-center text-[12px] text-[#b6b7bf]">
                  No files yet. Upload docs, code, or images for shared context.
                </p>
              ) : (
                <ul className="mb-4 space-y-1.5">
                  {drawerProject.files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2.5 rounded-xl border border-[#ececea] bg-[#fafafa] p-2"
                    >
                      {f.kind === 'image' && f.dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.dataUrl} alt={f.name} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#efeefb]">
                          <FileText className="h-4 w-4 text-[#6d5ce0]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-[#1a1f2e]">{f.name}</p>
                        <p className="text-[10.5px] text-[#9a9ba5]">
                          {fmtBytes(f.size)}
                          {f.kind === 'text' ? ' · text' : f.kind === 'image' ? ' · image' : ' · file'}
                        </p>
                      </div>
                      <button
                        onClick={() => removeProjectFile(drawerProject.id, f.id)}
                        aria-label="Remove file"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#b6b7bf] transition-colors hover:bg-[#efefec] hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Notes */}
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a4a5ae]">
                Notes / context
              </label>
              <textarea
                value={drawerProject.notes}
                onChange={(e) => updateProject(drawerProject.id, { notes: e.target.value })}
                rows={6}
                placeholder="Shared instructions or context for every chat in this project…"
                className="mb-2 w-full resize-y rounded-xl border border-[#e4e4e1] bg-white px-3 py-2 text-[13.5px] leading-relaxed text-[#1a1f2e] placeholder:text-[#b6b7bf] transition-colors focus:border-[#6d5ce0]/50 focus:outline-none"
              />
              <p className="text-[11px] text-[#b6b7bf]">
                Notes + text files are sent with every message in this project (≈10k chars per file).
              </p>
            </div>

            <div className="border-t border-[#ececea] px-5 py-4">
              <button
                onClick={() => newChatInProject(drawerProject.id)}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2a2f6b] px-3 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-[#232757]"
              >
                <Plus className="h-4 w-4" /> New chat in this project
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Delete project "${drawerProject.name}"? Its chats will move back to the main Chats list.`,
                    )
                  )
                    deleteProject(drawerProject.id);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#f2d4d1] px-3 py-2 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete project
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
