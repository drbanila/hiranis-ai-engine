/**
 * Client-side persistence for "Projects" (folders) — per-device, zero backend.
 * Stored in localStorage under `hae.projects.v1`. A project groups chats and
 * carries shared context (free-text notes + uploaded files) that is prepended
 * to every message sent from chats inside the project.
 */

export type ProjectFileKind = 'text' | 'image' | 'other';

export type ProjectFile = {
  id: string;
  name: string;
  type: string; // MIME type
  size: number;
  kind: ProjectFileKind;
  content?: string; // text files only (capped for storage)
  dataUrl?: string; // image files only (for preview)
};

export type Project = {
  id: string;
  name: string;
  notes: string;
  files: ProjectFile[];
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = 'hae.projects.v1';

// How much text we keep per file in storage and inject into the model.
const STORE_CAP = 12_000;
export const INJECT_CAP = 10_000;

export function loadProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Project[]) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // Best-effort: ignore quota / serialization failures (large images, etc.).
  }
}

export function newProjectId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'js', 'mjs', 'cjs', 'ts', 'tsx',
  'jsx', 'py', 'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'css', 'scss', 'html', 'xml',
  'yml', 'yaml', 'toml', 'ini', 'sh', 'bash', 'zsh', 'go', 'rs', 'rb', 'php',
  'sql', 'swift', 'kt', 'r', 'log', 'env', 'gitignore', 'dockerfile',
]);

export function classifyFileKind(file: File): ProjectFileKind {
  if (file.type.startsWith('image/')) return 'image';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (file.type.startsWith('text/') || file.type === 'application/json') return 'text';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  return 'other';
}

/** Read a browser File into a persistable ProjectFile (text content or image dataURL). */
export function fileToProjectFile(file: File): Promise<ProjectFile> {
  const kind = classifyFileKind(file);
  const base: ProjectFile = {
    id: newProjectId(),
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    kind,
  };

  return new Promise((resolve) => {
    if (kind === 'text') {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ ...base, content: String(reader.result ?? '').slice(0, STORE_CAP) });
      reader.onerror = () => resolve(base);
      reader.readAsText(file);
    } else if (kind === 'image') {
      const reader = new FileReader();
      reader.onload = () => resolve({ ...base, dataUrl: String(reader.result ?? '') });
      reader.onerror = () => resolve(base);
      reader.readAsDataURL(file);
    } else {
      // pdf / binary: keep metadata only (no text extraction client-side).
      resolve(base);
    }
  });
}

/** Build the shared context string (notes + text-file contents) for a project. */
export function buildProjectContext(project: Project): string {
  const parts: string[] = [];
  if (project.notes && project.notes.trim()) {
    parts.push(`Project notes:\n${project.notes.trim()}`);
  }
  for (const f of project.files) {
    if (f.kind === 'text' && f.content && f.content.trim()) {
      parts.push(`File "${f.name}":\n${f.content.slice(0, INJECT_CAP)}`);
    }
  }
  if (parts.length === 0) return '';
  return `The following is shared context for project "${project.name}". Use it to inform your answers.\n\n${parts.join('\n\n---\n\n')}`;
}
