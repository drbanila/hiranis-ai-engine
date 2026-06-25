'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  Check,
  CheckSquare,
  GraduationCap,
  Plus,
  ShoppingBag,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import {
  loadDayBundle,
  loadGrocery,
  newEntryId,
  saveGrocery,
  saveSchedule,
  saveTasks,
  saveWivaanStudy,
  todayKey,
  type GroceryEntry,
  type ScheduleEntry,
  type TaskEntry,
  type WivaanStudyEntry,
} from './lib/life-planner';

export type PlannerPanel = 'schedule' | 'tasks' | 'grocery' | 'wivaan' | null;

type Props = {
  open: PlannerPanel;
  onClose: () => void;
  onChange: () => void;
};

const PANEL_META = {
  schedule: {
    title: "Today's Schedule",
    subtitle: 'Clinic, personal & family',
    icon: CalendarClock,
  },
  tasks: {
    title: 'Tasks',
    subtitle: 'Focus for today',
    icon: CheckSquare,
  },
  grocery: {
    title: 'Grocery',
    subtitle: 'Shopping list',
    icon: ShoppingBag,
  },
  wivaan: {
    title: 'Wivaan Study',
    subtitle: 'Homework & home learning',
    icon: GraduationCap,
  },
} as const;

export default function LifePlannerDrawer({ open, onClose, onChange }: Props) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [grocery, setGrocery] = useState<GroceryEntry[]>([]);
  const [wivaan, setWivaan] = useState<WivaanStudyEntry[]>([]);

  const [newTime, setNewTime] = useState('09:00');
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newGrocery, setNewGrocery] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newHomework, setNewHomework] = useState('');

  const reload = useCallback(() => {
    const day = loadDayBundle();
    setSchedule(day.schedule);
    setTasks(day.tasks);
    setWivaan(day.wivaanStudy);
    setGrocery(loadGrocery());
  }, []);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  if (!open) return null;

  const meta = PANEL_META[open];
  const Icon = meta.icon;

  const persistSchedule = (next: ScheduleEntry[]) => {
    setSchedule(next);
    saveSchedule(next);
    onChange();
  };
  const persistTasks = (next: TaskEntry[]) => {
    setTasks(next);
    saveTasks(next);
    onChange();
  };
  const persistGrocery = (next: GroceryEntry[]) => {
    setGrocery(next);
    saveGrocery(next);
    onChange();
  };
  const persistWivaan = (next: WivaanStudyEntry[]) => {
    setWivaan(next);
    saveWivaanStudy(next);
    onChange();
  };

  return (
    <>
      <button
        aria-label="Close planner"
        onClick={onClose}
        className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-[1px]"
      />
      <aside className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-[400px] flex-col border-l border-[#f5c4d8]/60 bg-gradient-to-b from-[#fffbfc] to-[#fceef4] shadow-[-10px_0_40px_rgba(219,105,155,0.12)] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-start justify-between border-b border-[#fce0ea] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fce4ef] to-[#fbd9e8] ring-1 ring-[#f5c4d8]/50">
              <Icon className="h-5 w-5 text-[#c74b7a]" />
            </div>
            <div>
              <h2
                className="text-[17px] font-semibold text-[#3a2228]"
                style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
              >
                {meta.title}
              </h2>
              <p className="text-[12px] text-[#a8949c]">{meta.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#a8949c] hover:bg-[#fce4ef] hover:text-[#a8436e]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="hae-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {open === 'schedule' && (
            <>
              <ul className="space-y-2">
                {[...schedule]
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((s) => (
                    <li
                      key={s.id}
                      className="flex items-start gap-3 rounded-xl border border-[#fce0ea] bg-white/80 p-3"
                    >
                      <span className="shrink-0 tabular-nums text-[13px] font-semibold text-[#c74b7a]">
                        {s.time}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-[#3a2228]">{s.title}</p>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#b58396]">
                          {s.category === 'clinic' && <Stethoscope className="h-3 w-3" />}
                          {s.category}
                        </span>
                      </div>
                      <button
                        onClick={() => persistSchedule(schedule.filter((x) => x.id !== s.id))}
                        className="text-[#c4b4bc] hover:text-red-400"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                {schedule.length === 0 && (
                  <p className="rounded-xl border border-dashed border-[#f5c4d8] px-4 py-8 text-center text-[13px] text-[#a8949c]">
                    No appointments yet — add clinic rounds, OPD, or family time.
                  </p>
                )}
              </ul>
              <form
                className="mt-4 space-y-2 rounded-xl border border-[#fce0ea] bg-white/60 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newScheduleTitle.trim()) return;
                  persistSchedule([
                    ...schedule,
                    {
                      id: newEntryId(),
                      time: newTime,
                      title: newScheduleTitle.trim(),
                      category: 'clinic',
                    },
                  ]);
                  setNewScheduleTitle('');
                }}
              >
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="hae-input min-h-[44px] rounded-lg border border-[#eadde3] px-2 py-2 text-[#3a2228]"
                  />
                  <input
                    value={newScheduleTitle}
                    onChange={(e) => setNewScheduleTitle(e.target.value)}
                    placeholder="OPD, surgery, school run…"
                    className="hae-input min-h-[44px] min-w-0 flex-1 rounded-lg border border-[#eadde3] px-3 py-2 focus:border-[#e878a8]/50 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#7a3d58] py-2 text-[13px] font-medium text-white hover:bg-[#693349]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add to schedule
                </button>
              </form>
            </>
          )}

          {open === 'tasks' && (
            <>
              <ul className="space-y-1.5">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2.5 rounded-xl border border-[#fce0ea] bg-white/80 px-3 py-2.5"
                  >
                    <button
                      onClick={() =>
                        persistTasks(
                          tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)),
                        )
                      }
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        t.done
                          ? 'border-[#c74b7a] bg-[#c74b7a] text-white'
                          : 'border-[#f0b8cc] bg-white'
                      }`}
                    >
                      {t.done && <Check className="h-3 w-3" />}
                    </button>
                    <span
                      className={`flex-1 text-[13.5px] ${t.done ? 'text-[#a8949c] line-through' : 'text-[#3a2228]'}`}
                    >
                      {t.text}
                    </span>
                    <button
                      onClick={() => persistTasks(tasks.filter((x) => x.id !== t.id))}
                      className="text-[#c4b4bc] hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {tasks.length === 0 && (
                  <p className="rounded-xl border border-dashed border-[#f5c4d8] px-4 py-8 text-center text-[13px] text-[#a8949c]">
                    Capture follow-ups, calls, and admin for today.
                  </p>
                )}
              </ul>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTask.trim()) return;
                  persistTasks([...tasks, { id: newEntryId(), text: newTask.trim(), done: false }]);
                  setNewTask('');
                }}
              >
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="New task…"
                  className="min-w-0 flex-1 rounded-xl border border-[#eadde3] px-3 py-2 text-[13px] focus:border-[#e878a8]/50 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7a3d58] text-white hover:bg-[#693349]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            </>
          )}

          {open === 'grocery' && (
            <>
              <ul className="space-y-1.5">
                {grocery.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center gap-2.5 rounded-xl border border-[#fce0ea] bg-white/80 px-3 py-2.5"
                  >
                    <button
                      onClick={() =>
                        persistGrocery(
                          grocery.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)),
                        )
                      }
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        g.done
                          ? 'border-[#c74b7a] bg-[#c74b7a] text-white'
                          : 'border-[#f0b8cc] bg-white'
                      }`}
                    >
                      {g.done && <Check className="h-3 w-3" />}
                    </button>
                    <span
                      className={`flex-1 text-[13.5px] ${g.done ? 'text-[#a8949c] line-through' : 'text-[#3a2228]'}`}
                    >
                      {g.text}
                    </span>
                    <button
                      onClick={() => persistGrocery(grocery.filter((x) => x.id !== g.id))}
                      className="text-[#c4b4bc] hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {grocery.length === 0 && (
                  <p className="rounded-xl border border-dashed border-[#f5c4d8] px-4 py-8 text-center text-[13px] text-[#a8949c]">
                    Fruits, vegetables, pantry — build your list here.
                  </p>
                )}
              </ul>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newGrocery.trim()) return;
                  persistGrocery([
                    ...grocery,
                    { id: newEntryId(), text: newGrocery.trim(), done: false },
                  ]);
                  setNewGrocery('');
                }}
              >
                <input
                  value={newGrocery}
                  onChange={(e) => setNewGrocery(e.target.value)}
                  placeholder="Add item…"
                  className="min-w-0 flex-1 rounded-xl border border-[#eadde3] px-3 py-2 text-[13px] focus:border-[#e878a8]/50 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7a3d58] text-white hover:bg-[#693349]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            </>
          )}

          {open === 'wivaan' && (
            <>
              <ul className="space-y-2">
                {wivaan.map((w) => (
                  <li
                    key={w.id}
                    className="rounded-xl border border-[#fce0ea] bg-white/80 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() =>
                          persistWivaan(
                            wivaan.map((x) =>
                              x.id === w.id ? { ...x, done: !x.done } : x,
                            ),
                          )
                        }
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          w.done
                            ? 'border-[#c74b7a] bg-[#c74b7a] text-white'
                            : 'border-[#f0b8cc] bg-white'
                        }`}
                      >
                        {w.done && <Check className="h-3 w-3" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-[#b83d6e]">
                          <BookOpen className="h-3 w-3" />
                          {w.subject}
                        </p>
                        <p
                          className={`mt-1 text-[13.5px] ${w.done ? 'text-[#a8949c] line-through' : 'text-[#3a2228]'}`}
                        >
                          {w.homework}
                        </p>
                      </div>
                      <button
                        onClick={() => persistWivaan(wivaan.filter((x) => x.id !== w.id))}
                        className="text-[#c4b4bc] hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
                {wivaan.length === 0 && (
                  <p className="rounded-xl border border-dashed border-[#f5c4d8] px-4 py-8 text-center text-[13px] text-[#a8949c]">
                    Track Wivaan&apos;s homework, reading, and revision for today.
                  </p>
                )}
              </ul>
              <form
                className="mt-4 space-y-2 rounded-xl border border-[#fce0ea] bg-white/60 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSubject.trim() || !newHomework.trim()) return;
                  persistWivaan([
                    ...wivaan,
                    {
                      id: newEntryId(),
                      subject: newSubject.trim(),
                      homework: newHomework.trim(),
                      done: false,
                    },
                  ]);
                  setNewSubject('');
                  setNewHomework('');
                }}
              >
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Subject — Maths, English…"
                  className="w-full rounded-lg border border-[#eadde3] px-3 py-1.5 text-[13px] focus:outline-none"
                />
                <input
                  value={newHomework}
                  onChange={(e) => setNewHomework(e.target.value)}
                  placeholder="Homework or activity"
                  className="w-full rounded-lg border border-[#eadde3] px-3 py-1.5 text-[13px] focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#7a3d58] py-2 text-[13px] font-medium text-white hover:bg-[#693349]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add homework
                </button>
              </form>
            </>
          )}
        </div>

        <div className="border-t border-[#fce0ea] px-5 py-3 text-center text-[10px] text-[#b58396]">
          Saved privately on this device · {todayKey()}
        </div>
      </aside>
    </>
  );
}
