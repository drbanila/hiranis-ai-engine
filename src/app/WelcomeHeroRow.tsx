'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckSquare,
  ChevronRight,
  GraduationCap,
  ShoppingBag,
} from 'lucide-react';
import PremiumDateTime from './PremiumDateTime';
import LifePlannerDrawer, { type PlannerPanel } from './LifePlannerDrawer';
import DrBanilaCircle from './DrBanilaCircle';
import { getPlannerCounts, type PlannerCounts } from './lib/life-planner';

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' };

const QUICK_TILES = [
  {
    id: 'schedule' as const,
    label: "Today's Schedule",
    shortLabel: 'Schedule',
    hint: 'Clinic & home',
    icon: CalendarClock,
    card: 'from-[#fff9fb] via-white to-[#fceef4]',
    border: 'border-[#f0d4e0]/80',
    hoverBorder: 'hover:border-[#e8b4c8]/70',
    shadow: 'shadow-[0_4px_18px_rgba(183,110,138,0.1)]',
    iconBg: 'bg-gradient-to-br from-[#fce8f0] to-[#f5d0de]',
    iconRing: 'ring-[#f0c4d8]/50',
    ink: 'text-[#a8436e]',
    badge: 'bg-[#9d4a6a]',
    countKey: 'schedule' as keyof PlannerCounts,
  },
  {
    id: 'tasks' as const,
    label: 'Tasks',
    shortLabel: 'Tasks',
    hint: 'To-do today',
    icon: CheckSquare,
    card: 'from-[#f8fbf9] via-white to-[#eef6f1]',
    border: 'border-[#d4e8dc]/80',
    hoverBorder: 'hover:border-[#b8d4c4]/80',
    shadow: 'shadow-[0_4px_18px_rgba(107,144,128,0.1)]',
    iconBg: 'bg-gradient-to-br from-[#e8f4ec] to-[#d0e8d8]',
    iconRing: 'ring-[#c8ddd0]/50',
    ink: 'text-[#4a7560]',
    badge: 'bg-[#5a8268]',
    countKey: 'tasks' as keyof PlannerCounts,
  },
  {
    id: 'grocery' as const,
    label: 'Grocery',
    shortLabel: 'Grocery',
    hint: 'Shopping list',
    icon: ShoppingBag,
    card: 'from-[#fffcf8] via-white to-[#faf3e8]',
    border: 'border-[#ead9c4]/80',
    hoverBorder: 'hover:border-[#dcc4a0]/70',
    shadow: 'shadow-[0_4px_18px_rgba(201,168,124,0.12)]',
    iconBg: 'bg-gradient-to-br from-[#faf0e4] to-[#f0dfc4]',
    iconRing: 'ring-[#e8d4b8]/50',
    ink: 'text-[#9a7344]',
    badge: 'bg-[#a8844a]',
    countKey: 'grocery' as keyof PlannerCounts,
  },
  {
    id: 'wivaan' as const,
    label: 'Wivaan Study',
    shortLabel: 'Wivaan',
    hint: 'Homework',
    icon: GraduationCap,
    card: 'from-[#faf9fc] via-white to-[#f0ecf8]',
    border: 'border-[#ddd4eb]/80',
    hoverBorder: 'hover:border-[#c4b8dc]/70',
    shadow: 'shadow-[0_4px_18px_rgba(130,110,160,0.1)]',
    iconBg: 'bg-gradient-to-br from-[#ede8f6] to-[#ddd0ec]',
    iconRing: 'ring-[#d4c8e4]/50',
    ink: 'text-[#6b558a]',
    badge: 'bg-[#7560a0]',
    countKey: 'wivaan' as keyof PlannerCounts,
  },
];

function QuickTileButton({
  t,
  badge,
  onClick,
  compact,
}: {
  t: (typeof QUICK_TILES)[number];
  badge: number;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = t.icon;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[1rem] border bg-gradient-to-br px-2 py-2.5 text-center transition-all duration-200 active:scale-[0.98] ${t.card} ${t.border} ${t.hoverBorder} ${t.shadow}`}
      >
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${t.iconBg} ${t.iconRing}`}
        >
          <Icon className={`h-4 w-4 ${t.ink}`} />
        </div>
        <span className="text-[10.5px] font-semibold leading-tight text-[#3a2228]" style={serif}>
          {t.shortLabel}
        </span>
        {badge > 0 && (
          <span
            className={`absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ${t.badge}`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full max-w-[196px] items-center gap-3 rounded-[1rem] border bg-gradient-to-br px-3.5 py-2.5 text-left transition-all duration-200 active:scale-[0.99] ${t.card} ${t.border} ${t.hoverBorder} shadow-[0_3px_14px_rgba(15,15,15,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,15,15,0.07)] ${t.shadow}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${t.iconBg} ${t.iconRing}`}
      >
        <Icon className={`h-[18px] w-[18px] ${t.ink}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#2a2226]" style={serif}>
          {t.label}
        </p>
        <p className="truncate text-[10.5px] text-[#8a7a80]">{t.hint}</p>
      </div>
      {badge > 0 && (
        <span
          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white ${t.badge}`}
        >
          {badge}
        </span>
      )}
      <ChevronRight
        className={`h-3.5 w-3.5 shrink-0 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-80 ${t.ink}`}
      />
    </button>
  );
}

export default function WelcomeHeroRow() {
  const [panel, setPanel] = useState<PlannerPanel>(null);
  const [counts, setCounts] = useState<PlannerCounts>({
    schedule: 0,
    tasks: 0,
    grocery: 0,
    wivaan: 0,
  });

  const refreshCounts = useCallback(() => {
    setCounts(getPlannerCounts());
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  return (
    <>
      <div className="mb-6 w-full max-w-3xl px-1 sm:mb-8">
        {/* Desktop */}
        <div className="hidden items-center justify-between gap-5 md:flex">
          <div className="flex flex-1 justify-start">
            <PremiumDateTime />
          </div>
          <DrBanilaCircle />
          <div className="flex flex-1 flex-col gap-2.5">
            {QUICK_TILES.map((t) => (
              <QuickTileButton
                key={t.id}
                t={t}
                badge={counts[t.countKey]}
                onClick={() => setPanel(t.id)}
              />
            ))}
          </div>
        </div>

        {/* iPhone / mobile — portrait first, then date, then tiles */}
        <div className="flex flex-col items-center gap-4 md:hidden">
          <DrBanilaCircle />
          <div className="w-full max-w-[200px]">
            <PremiumDateTime />
          </div>
          <div className="grid w-full grid-cols-2 gap-2.5">
            {QUICK_TILES.map((t) => (
              <QuickTileButton
                key={t.id}
                t={t}
                badge={counts[t.countKey]}
                onClick={() => setPanel(t.id)}
                compact
              />
            ))}
          </div>
        </div>
      </div>

      <LifePlannerDrawer
        open={panel}
        onClose={() => setPanel(null)}
        onChange={refreshCounts}
      />
    </>
  );
}
