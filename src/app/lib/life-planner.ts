/**
 * Client-side life planner — schedule, tasks, grocery, Wivaan study.
 * Stored in localStorage; schedule/tasks/study are date-keyed, grocery persists.
 */

export type ScheduleEntry = {
  id: string;
  time: string;
  title: string;
  note?: string;
  category: 'clinic' | 'personal' | 'family';
};

export type TaskEntry = {
  id: string;
  text: string;
  done: boolean;
};

export type GroceryEntry = {
  id: string;
  text: string;
  done: boolean;
};

export type WivaanStudyEntry = {
  id: string;
  subject: string;
  homework: string;
  done: boolean;
};

export type DayBundle = {
  schedule: ScheduleEntry[];
  tasks: TaskEntry[];
  wivaanStudy: WivaanStudyEntry[];
};

type PlannerStore = {
  grocery: GroceryEntry[];
  days: Record<string, DayBundle>;
};

const STORAGE_KEY = 'hae.planner.v1';

const EMPTY_DAY: DayBundle = {
  schedule: [],
  tasks: [],
  wivaanStudy: [],
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadStore(): PlannerStore {
  if (typeof window === 'undefined') return { grocery: [], days: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { grocery: [], days: {} };
    const parsed = JSON.parse(raw) as PlannerStore;
    return {
      grocery: Array.isArray(parsed.grocery) ? parsed.grocery : [],
      days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
    };
  } catch {
    return { grocery: [], days: {} };
  }
}

function saveStore(store: PlannerStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* best-effort */
  }
}

function getDay(store: PlannerStore, date = todayKey()): DayBundle {
  return store.days[date] ?? { ...EMPTY_DAY, schedule: [], tasks: [], wivaanStudy: [] };
}

export function newEntryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export type PlannerCounts = {
  schedule: number;
  tasks: number;
  grocery: number;
  wivaan: number;
};

export function getPlannerCounts(): PlannerCounts {
  const store = loadStore();
  const day = getDay(store);
  return {
    schedule: day.schedule.length,
    tasks: day.tasks.filter((t) => !t.done).length,
    grocery: store.grocery.filter((g) => !g.done).length,
    wivaan: day.wivaanStudy.filter((w) => !w.done).length,
  };
}

export function loadDayBundle(date = todayKey()): DayBundle {
  return getDay(loadStore(), date);
}

export function loadGrocery(): GroceryEntry[] {
  return loadStore().grocery;
}

export function saveSchedule(entries: ScheduleEntry[], date = todayKey()): void {
  const store = loadStore();
  store.days[date] = { ...getDay(store, date), schedule: entries };
  saveStore(store);
}

export function saveTasks(entries: TaskEntry[], date = todayKey()): void {
  const store = loadStore();
  store.days[date] = { ...getDay(store, date), tasks: entries };
  saveStore(store);
}

export function saveGrocery(entries: GroceryEntry[]): void {
  const store = loadStore();
  store.grocery = entries;
  saveStore(store);
}

export function saveWivaanStudy(entries: WivaanStudyEntry[], date = todayKey()): void {
  const store = loadStore();
  store.days[date] = { ...getDay(store, date), wivaanStudy: entries };
  saveStore(store);
}

export { todayKey };
