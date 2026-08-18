/**
 * Calora Today — isolated mockup baseline
 *
 * Extracted from artifacts/calora/app/(tabs)/index.tsx
 * All React Native primitives, Expo modules, context, navigation, and native
 * APIs are stubbed. No production Calora files are touched.
 * Static data is realistic but not live.
 */

import React, { useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Droplet,
  Edit3,
  Heart,
  MinusCircle,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  Sliders,
  Smile,
  Sun,
  Sunrise,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

// ─── Brand ────────────────────────────────────────────────────────────────────
const BRAND_NAME = 'Calora';

// ─── Colour palette (Calora light theme approximation) ───────────────────────
const C = {
  background: '#f8faf9',
  foreground: '#0e1a12',
  card: '#ffffff',
  border: '#e3ebe5',
  muted: '#f0f4f1',
  mutedForeground: '#6b7e71',
  primary: '#1f6e3a',
  primaryForeground: '#ffffff',
  accent: '#e6f4ea',
  accentForeground: '#1f6e3a',
  success: '#22875a',
  warning: '#c97020',
  destructive: '#c0392b',
  protein: '#5d8edb',
  carbs: '#e0a040',
  fat: '#c060b0',
  hero: '#1b3022',
  heroMuted: '#9eb8a6',
  onHero: '#ffffff',
};

// ─── Static seed data ─────────────────────────────────────────────────────────

const TODAY_KEY = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
})();

const FORMAT_DATE_LABEL = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})
  .format(new Date())
  .toUpperCase();

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type Mood = 'energized' | 'good' | 'okay' | 'low' | 'stressed';

interface FoodLog {
  id: string;
  name: string;
  meal: MealType;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  serving: string;
}

const SEED_LOGS: FoodLog[] = [
  {
    id: '1',
    name: 'Greek Yoghurt with Honey',
    meal: 'Breakfast',
    time: '7:32 AM',
    calories: 210,
    protein: 18,
    carbs: 24,
    fat: 4,
    confidence: 95,
    serving: '1 cup',
  },
  {
    id: '2',
    name: 'Scrambled Eggs (2)',
    meal: 'Breakfast',
    time: '7:35 AM',
    calories: 180,
    protein: 14,
    carbs: 1,
    fat: 13,
    confidence: 98,
    serving: '2 eggs',
  },
  {
    id: '3',
    name: 'Grilled Chicken Salad',
    meal: 'Lunch',
    time: '12:48 PM',
    calories: 420,
    protein: 42,
    carbs: 18,
    fat: 18,
    confidence: 91,
    serving: '1 large bowl',
  },
  {
    id: '4',
    name: 'Brown Rice (cooked)',
    meal: 'Lunch',
    time: '12:49 PM',
    calories: 215,
    protein: 5,
    carbs: 45,
    fat: 2,
    confidence: 97,
    serving: '1 cup (200 g)',
  },
];

const SEED_RECIPES = [
  {
    id: 'r1',
    name: 'Thai Green Curry',
    area: 'Thai',
    calories: 490,
    image: 'https://www.themealdb.com/images/media/meals/sstssx1487349585.jpg',
  },
  {
    id: 'r2',
    name: 'Shakshuka',
    area: 'Middle Eastern',
    calories: 350,
    image: 'https://www.themealdb.com/images/media/meals/g373701551450224.jpg',
  },
  {
    id: 'r3',
    name: 'Chicken Fajita Mac',
    area: 'American',
    calories: 620,
    image: 'https://www.themealdb.com/images/media/meals/qrqywr1503066605.jpg',
  },
];

const VERIFIED_FOODS = [
  { name: 'Oats (dry)', calories: 307, protein: 11, carbs: 55, fat: 5, confidence: 99, serving: '100 g' },
  { name: 'Banana (medium)', calories: 89, protein: 1, carbs: 23, fat: 0, confidence: 99, serving: '1 medium' },
  { name: 'Whole milk (1 cup)', calories: 149, protein: 8, carbs: 12, fat: 8, confidence: 98, serving: '240 ml' },
  { name: 'Chicken breast (cooked)', calories: 165, protein: 31, carbs: 0, fat: 4, confidence: 99, serving: '100 g' },
  { name: 'Brown rice (cooked)', calories: 215, protein: 5, carbs: 45, fat: 2, confidence: 97, serving: '1 cup (200 g)' },
  { name: 'Avocado (half)', calories: 120, protein: 1, carbs: 6, fat: 11, confidence: 98, serving: 'half fruit' },
  { name: 'Almonds (small handful)', calories: 164, protein: 6, carbs: 6, fat: 14, confidence: 98, serving: '28 g' },
  { name: 'Salmon (baked)', calories: 208, protein: 20, carbs: 0, fat: 13, confidence: 96, serving: '100 g' },
];

const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const MOOD_OPTIONS: Array<{ value: Mood; label: string; Icon: React.ElementType }> = [
  { value: 'energized', label: 'Energized', Icon: Sun },
  { value: 'good', label: 'Good', Icon: Smile },
  { value: 'okay', label: 'Okay', Icon: MinusCircle },
  { value: 'low', label: 'Low', Icon: Cloud },
  { value: 'stressed', label: 'Stressed', Icon: Activity },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWhole(n: number) {
  return Math.round(n).toLocaleString();
}

function formatGrams(n: number) {
  return `${Math.round(n)}g`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Horseshoe calorie gauge rendered in SVG */
function CalorieGauge({ consumed, target }: { consumed: number; target: number }) {
  const VBW = 260, VBH = 186, CX = 130, CY = 118, R = 90, SW = 13;
  const START = 135, SWEEP = 270;
  const ARC_LEN = (SWEEP / 360) * 2 * Math.PI * R;

  const pt = (deg: number) => ({
    x: CX + R * Math.cos((deg * Math.PI) / 180),
    y: CY + R * Math.sin((deg * Math.PI) / 180),
  });
  const gs = pt(START);
  const ge = pt(START + SWEEP);
  const trackD = `M ${gs.x.toFixed(2)} ${gs.y.toFixed(2)} A ${R} ${R} 0 1 1 ${ge.x.toFixed(2)} ${ge.y.toFixed(2)}`;

  const progress = target > 0 ? Math.min(Math.max(consumed / target, 0), 1) : 0;
  const remaining = Math.max(target - consumed, 0);
  const overGoal = consumed > target;
  const dashOffset = ARC_LEN * (1 - progress);
  const fillColor = overGoal ? C.warning : C.primary;

  const gaugeW = 280;
  const gaugeH = gaugeW * (VBH / VBW);
  const overlayTop = ((CY - R + SW / 2 + 32) / VBH) * gaugeH;

  return (
    <div className="flex flex-col items-center mt-3 mb-1">
      <div className="relative" style={{ width: gaugeW, height: gaugeH }}>
        <svg width={gaugeW} height={gaugeH} viewBox={`0 0 ${VBW} ${VBH}`}>
          <path d={trackD} stroke={C.border} strokeWidth={SW} fill="none" strokeLinecap="round" />
          {progress > 0 && (
            <path
              d={trackD}
              stroke={fillColor}
              strokeWidth={SW}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={ARC_LEN}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.33,1,0.68,1)' }}
            />
          )}
        </svg>
        <div
          className="absolute left-0 right-0 flex flex-col items-center"
          style={{ top: overlayTop }}
        >
          <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: C.mutedForeground }}>
            Remaining
          </span>
          <span className="text-4xl font-bold tracking-tight leading-none mt-0.5" style={{ color: C.foreground }}>
            {remaining.toLocaleString()}
          </span>
          <span className="text-[11px] font-medium mt-0.5" style={{ color: C.mutedForeground }}>
            kcal left
          </span>
          <span className="text-[10px] mt-1.5 opacity-70" style={{ color: C.mutedForeground }}>
            Goal {target.toLocaleString()} kcal
          </span>
        </div>
      </div>
      {/* Eaten / Burned row */}
      <div className="flex items-center gap-8 mt-1.5">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold tracking-tight" style={{ color: C.foreground }}>
            {consumed.toLocaleString()}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide mt-0.5" style={{ color: C.mutedForeground }}>
            Eaten
          </span>
        </div>
        <div className="w-px h-7" style={{ backgroundColor: C.border }} />
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold tracking-tight" style={{ color: C.foreground }}>
            0
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide mt-0.5" style={{ color: C.mutedForeground }}>
            Burned
          </span>
        </div>
      </div>
    </div>
  );
}

/** Animated macro progress bar (CSS transition instead of reanimated) */
function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div className="mt-3">
      <div className="flex justify-between mb-1.5">
        <span className="text-[12px] font-medium" style={{ color: C.mutedForeground }}>{label}</span>
        <span className="text-[12px] font-semibold" style={{ color: C.foreground }}>
          {value}g{' '}
          <span style={{ color: C.mutedForeground, fontWeight: 400 }}>/ {target}g</span>
        </span>
      </div>
      <div className="h-[7px] rounded-full overflow-hidden" style={{ backgroundColor: C.muted }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            transition: 'width 0.7s cubic-bezier(0.33,1,0.68,1)',
          }}
        />
      </div>
    </div>
  );
}

/** Water dot slots */
function WaterSlots({ filled, total = 8 }: { filled: number; total?: number }) {
  return (
    <div className="flex gap-1 items-end h-[25px] mt-2.5 mb-2.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="flex-1 h-[17px] rounded-[4px] transition-all duration-200"
          style={{ backgroundColor: i < filled ? '#8db8ed' : C.muted }}
        />
      ))}
    </div>
  );
}

/** Single diary meal row */
function MealRow({ log, onEdit }: { log: FoodLog; onEdit: () => void }) {
  const dotColor =
    log.meal === 'Breakfast' ? C.warning : log.meal === 'Lunch' ? C.success : C.primary;
  return (
    <button
      onClick={onEdit}
      className="flex items-center w-full gap-2.5 py-3 border-b text-left last:border-b-0 hover:bg-[#f8faf9] transition-colors"
      style={{ borderBottomColor: C.border }}
      aria-label={`Edit ${log.name}`}
    >
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: C.foreground }}>{log.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px]" style={{ color: C.mutedForeground }}>{log.meal} · {log.time}</span>
          <span
            className="flex items-center gap-0.5 text-[9px] font-semibold rounded-[6px] px-1.5 py-0.5"
            style={{ backgroundColor: C.accent, color: C.accentForeground }}
          >
            <Check size={10} />
            {log.confidence}% verified
          </span>
        </div>
      </div>
      <span className="text-[14px] font-bold" style={{ color: C.foreground }}>{formatWhole(log.calories)}</span>
      <span className="text-[9px] -ml-1.5 mt-4" style={{ color: C.mutedForeground }}>kcal</span>
      <ChevronRight size={14} color={C.mutedForeground} />
    </button>
  );
}

/** Living rhythm card */
function LivingRhythmCard() {
  const mealsToday = new Set(SEED_LOGS.map((l) => l.meal)).size;
  const waterToday = 24;
  const loggedDaysLast7 = 5;
  const waterPct = Math.min((waterToday / 64) * 100, 100);
  const weekPct = Math.min((loggedDaysLast7 / 7) * 100, 100);

  return (
    <div
      className="rounded-[22px] border p-4 mb-5"
      style={{ backgroundColor: C.card, borderColor: C.border }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: C.accent }}
        >
          <Activity size={16} color={C.accentForeground} />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: C.mutedForeground }}>
            TODAY'S RHYTHM
          </p>
          <p className="text-base font-bold tracking-tight" style={{ color: C.foreground }}>
            A rhythm is emerging
          </p>
        </div>
        <div className="rounded-[10px] px-2 py-1.5" style={{ backgroundColor: C.muted }}>
          <span className="text-[9px] font-semibold capitalize" style={{ color: C.mutedForeground }}>
            Emerging rhythm
          </span>
        </div>
      </div>

      <p className="text-[11px] leading-4 mt-2.5 max-w-[300px]" style={{ color: C.mutedForeground }}>
        Your recent entries are giving {BRAND_NAME} more context to work with.
      </p>

      {/* Signal row */}
      <div className="flex items-center mt-4">
        <div className="flex-1">
          <p className="text-[18px] font-bold tracking-tight" style={{ color: C.foreground }}>{mealsToday}</p>
          <p className="text-[9px] mt-0.5" style={{ color: C.mutedForeground }}>meals today</p>
        </div>
        <div className="w-px h-7 mx-3" style={{ backgroundColor: C.border }} />
        <div className="flex-1">
          <p className="text-[18px] font-bold tracking-tight" style={{ color: C.foreground }}>{waterToday}</p>
          <p className="text-[9px] mt-0.5" style={{ color: C.mutedForeground }}>fl oz today</p>
        </div>
        <div className="w-px h-7 mx-3" style={{ backgroundColor: C.border }} />
        <div className="flex-1">
          <p className="text-[18px] font-bold tracking-tight" style={{ color: C.foreground }}>
            {loggedDaysLast7}
            <span className="text-[11px] font-medium">/7</span>
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: C.mutedForeground }}>days tracked</p>
        </div>
      </div>

      {/* Progress tracks */}
      <div className="flex gap-3 mt-4">
        <div className="flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.mutedForeground }}>water</p>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.muted }}>
            <div className="h-full rounded-full" style={{ width: `${waterPct}%`, backgroundColor: C.primary, transition: 'width 0.7s ease' }} />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ color: C.mutedForeground }}>week</p>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.muted }}>
            <div className="h-full rounded-full" style={{ width: `${weekPct}%`, backgroundColor: C.success, transition: 'width 0.7s ease' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Recipe inspiration carousel (static – shows first recipe) */
function RecipeWidget({ onOpen }: { onOpen: (r: typeof SEED_RECIPES[number]) => void }) {
  const [active, setActive] = useState(0);
  const recipe = SEED_RECIPES[active];

  return (
    <div
      className="rounded-[22px] border p-3.5 mb-6"
      style={{ backgroundColor: C.card, borderColor: C.border }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[18px] font-bold tracking-tight" style={{ color: C.foreground }}>A little inspiration</p>
          <p className="text-[12px] mt-1" style={{ color: C.mutedForeground }}>Swipe for something worth making</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {SEED_RECIPES.length > 1 && (
            <div className="flex gap-1">
              <button
                onClick={() => setActive((a) => Math.max(0, a - 1))}
                className="w-7 h-7 rounded-[10px] flex items-center justify-center"
                style={{ backgroundColor: C.muted }}
                aria-label="Previous recipe"
              >
                <ChevronLeft size={15} color={C.foreground} />
              </button>
              <button
                onClick={() => setActive((a) => Math.min(SEED_RECIPES.length - 1, a + 1))}
                className="w-7 h-7 rounded-[10px] flex items-center justify-center"
                style={{ backgroundColor: C.muted }}
                aria-label="Next recipe"
              >
                <ChevronRight size={15} color={C.foreground} />
              </button>
            </div>
          )}
          <div
            className="flex items-center gap-1 rounded-[10px] px-2 py-1.5"
            style={{ backgroundColor: C.accent }}
          >
            <BookOpen size={13} color={C.accentForeground} />
            <span className="text-[8px] font-bold tracking-wide" style={{ color: C.accentForeground }}>RECIPES</span>
          </div>
        </div>
      </div>

      {/* Card image */}
      <div
        className="relative rounded-[17px] overflow-hidden"
        style={{ height: 174 }}
      >
        <img
          src={recipe.image}
          alt={recipe.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(18,34,24,0.08) 0%, rgba(18,34,24,0.88) 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-[15px]">
          <p className="text-[8px] font-bold tracking-widest mb-1" style={{ color: '#b6d8c2' }}>
            {recipe.area ? `${recipe.area.toUpperCase()} · OPEN SOURCE` : 'OPEN SOURCE RECIPE'}
          </p>
          <p className="text-[18px] font-bold text-white tracking-tight leading-snug max-w-[260px] line-clamp-2">
            {recipe.name}
          </p>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[10px] font-medium" style={{ color: '#d4eadc' }}>
              {recipe.calories ? `${Math.round(recipe.calories)} kcal` : 'Nutrition review needed'}
            </span>
            <button
              onClick={() => onOpen(recipe)}
              className="flex items-center gap-1 text-white"
              aria-label={`View recipe details for ${recipe.name}`}
            >
              <span className="text-[10px] font-bold">View details</span>
              <ArrowUpRight size={13} color="#ffffff" />
            </button>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <MoreHorizontal size={16} color={C.mutedForeground} />
        <span className="text-[10px] font-medium" style={{ color: C.mutedForeground }}>
          Use the arrows to explore
        </span>
      </div>
    </div>
  );
}

/** Wellness cards — water + meals logged + mood */
function WellnessCards({
  waterOunces,
  mealsLogged,
  mealNames,
  mood,
  waterConfirmed,
  onAddWater,
  onAddMeal,
  onMood,
}: {
  waterOunces: number;
  mealsLogged: number;
  mealNames: string[];
  mood?: Mood;
  waterConfirmed: boolean;
  onAddWater: () => void;
  onAddMeal: () => void;
  onMood: (m: Mood) => void;
}) {
  const waterGoal = 64;
  const filledGlasses = Math.min(Math.ceil(waterOunces / 8), waterGoal / 8);
  const selectedMood = MOOD_OPTIONS.find((o) => o.value === mood);

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Water + Meals row */}
      <div className="flex gap-2.5">
        {/* Water card */}
        <div
          className="flex-1 rounded-[20px] border p-3.5 flex flex-col"
          style={{ backgroundColor: C.card, borderColor: C.border, minHeight: 172 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center" style={{ backgroundColor: '#e5f1ff' }}>
              <Droplet size={15} color="#5d8edb" />
            </div>
            <span className="text-[12px] font-semibold" style={{ color: C.foreground }}>Water</span>
          </div>
          <p className="text-[20px] font-bold tracking-tight" style={{ color: C.foreground }}>
            {waterOunces}{' '}
            <span className="text-[10px] font-normal" style={{ color: C.mutedForeground }}>/ {waterGoal} fl oz</span>
          </p>
          <WaterSlots filled={filledGlasses} />
          <button
            onClick={onAddWater}
            disabled={waterConfirmed}
            className="flex items-center justify-center gap-1 rounded-[10px] py-2 mt-auto transition-opacity"
            style={{
              backgroundColor: C.accent,
              opacity: waterConfirmed ? 0.72 : 1,
            }}
            aria-label={waterConfirmed ? 'Water added' : 'Log 8 fluid ounces of water'}
          >
            {waterConfirmed ? <Check size={13} color={C.accentForeground} /> : <Plus size={13} color={C.accentForeground} />}
            <span className="text-[10px] font-bold" style={{ color: C.accentForeground }}>
              {waterConfirmed ? 'Added ✓' : '8 fl oz'}
            </span>
          </button>
        </div>

        {/* Meals logged card */}
        <div
          className="flex-1 rounded-[20px] border p-3.5 flex flex-col"
          style={{ backgroundColor: C.card, borderColor: C.border, minHeight: 172 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center" style={{ backgroundColor: '#fff0dc' }}>
              <CheckCircle size={15} color="#d7954e" />
            </div>
            <span className="text-[12px] font-semibold" style={{ color: C.foreground }}>Meals logged</span>
          </div>
          <p className="text-[20px] font-bold tracking-tight" style={{ color: C.foreground }}>
            {mealsLogged}{' '}
            <span className="text-[10px] font-normal" style={{ color: C.mutedForeground }}>/ 4 today</span>
          </p>
          <p className="text-[10px] mt-3 truncate" style={{ color: C.mutedForeground, minHeight: 17 }}>
            {mealNames.length ? mealNames.join(' · ') : 'No meals logged yet'}
          </p>
          <button
            onClick={onAddMeal}
            className="flex items-center justify-center gap-1 rounded-[10px] py-2 mt-auto"
            style={{ backgroundColor: C.accent }}
            aria-label="Add a meal"
          >
            <Plus size={13} color={C.accentForeground} />
            <span className="text-[10px] font-bold" style={{ color: C.accentForeground }}>Add meal</span>
          </button>
        </div>
      </div>

      {/* Mood card */}
      <div
        className="rounded-[20px] border p-[15px]"
        style={{ backgroundColor: C.card, borderColor: C.border }}
      >
        <div className="flex items-start justify-between mb-3.5">
          <div>
            <p className="text-[18px] font-bold tracking-tight" style={{ color: C.foreground }}>How are you feeling?</p>
            <p className="text-[12px] mt-1" style={{ color: C.mutedForeground }}>
              {selectedMood
                ? `Logged as ${selectedMood.label.toLowerCase()}.`
                : 'A quick check-in, whenever it feels useful.'}
            </p>
          </div>
          <div className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f2eafd' }}>
            <Heart size={15} color="#9875c7" />
          </div>
        </div>
        <div className="flex gap-1.5">
          {MOOD_OPTIONS.map(({ value, label, Icon }) => {
            const selected = mood === value;
            return (
              <button
                key={value}
                onClick={() => onMood(value)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 border rounded-xl py-3 min-h-[50px] transition-colors"
                style={{
                  backgroundColor: selected ? C.primary : C.muted,
                  borderColor: selected ? C.primary : C.border,
                }}
                aria-label={`Log mood ${label}`}
              >
                <Icon size={15} color={selected ? C.primaryForeground : C.mutedForeground} />
                <span className="text-[9px] font-semibold" style={{ color: selected ? C.primaryForeground : C.mutedForeground }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Add food modal */
function AddFoodModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [captureMode, setCaptureMode] = useState<'search' | 'voice' | 'barcode'>('search');
  const [manualError, setManualError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = VERIFIED_FOODS.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = (name: string) => {
    setNotice(`${name} added to today's log.`);
    setTimeout(() => setNotice(null), 2000);
  };

  const handleManual = () => {
    const kcal = Number(customCalories);
    if (!customName.trim()) { setManualError('Add a food name before saving.'); return; }
    if (!Number.isFinite(kcal) || kcal <= 0) { setManualError('Enter calories greater than zero.'); return; }
    handleAdd(customName.trim());
    setCustomName('');
    setCustomCalories('');
    setManualError(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.42)' }}
    >
      <div
        className="w-full max-w-md rounded-t-[28px] px-5 pt-3 pb-7 overflow-y-auto max-h-[92vh]"
        style={{ backgroundColor: '#f8faf9' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-[#9aa69e] mx-auto mb-4" />

        {/* Heading */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[23px] font-bold tracking-tight" style={{ color: C.foreground }}>Add to today</p>
            <p className="text-[12px] mt-1" style={{ color: C.mutedForeground }}>Fast now. Precise when it matters.</p>
          </div>
          <button
            onClick={onClose}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
            style={{ backgroundColor: C.muted }}
            aria-label="Close"
          >
            <X size={18} color={C.foreground} />
          </button>
        </div>

        {/* Photo log */}
        <button
          className="flex items-center gap-3 rounded-[18px] p-[15px] w-full mb-3.5 text-left"
          style={{ backgroundColor: C.hero }}
          aria-label="Log from photo"
        >
          <Camera size={20} color={C.heroMuted} />
          <div className="flex-1">
            <p className="text-[14px] font-semibold" style={{ color: C.onHero }}>Log from a photo</p>
            <p className="text-[11px] mt-1" style={{ color: C.heroMuted }}>Review an estimate before it counts</p>
          </div>
          <ArrowUpRight size={18} color={C.heroMuted} />
        </button>

        {/* Capture modes */}
        <div className="flex rounded-[13px] p-1 mb-3.5 gap-0.5" style={{ backgroundColor: C.muted }}>
          {(['search', 'voice', 'barcode'] as const).map((mode) => {
            const Icon = mode === 'search' ? Edit3 : mode === 'voice' ? Search : Search;
            const label = mode === 'search' ? 'Text' : mode === 'voice' ? 'Voice' : 'Barcode';
            const selected = captureMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setCaptureMode(mode)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-[10px] py-2 transition-colors"
                style={{ backgroundColor: selected ? C.card : 'transparent' }}
                aria-label={`${label} food logging`}
              >
                <Icon size={14} color={selected ? C.primary : C.mutedForeground} />
                <span className="text-[11px] font-semibold" style={{ color: selected ? C.foreground : C.mutedForeground }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {captureMode !== 'search' && (
          <div
            className="flex items-center gap-2 rounded-[15px] p-3 mb-3"
            style={{ backgroundColor: C.accent }}
          >
            <div className="flex-1">
              <p className="text-[11px] font-bold" style={{ color: C.foreground }}>
                {captureMode === 'voice' ? 'Voice capture needs permission' : 'Barcode scanning needs camera access'}
              </p>
              <p className="text-[10px] leading-snug mt-0.5" style={{ color: C.mutedForeground }}>
                {captureMode === 'voice'
                  ? `In the native build, ${BRAND_NAME} will request microphone access and turn your words into a reviewable draft.`
                  : `In the native build, ${BRAND_NAME} will request camera access and look up a verified product by barcode.`}
              </p>
            </div>
            <button onClick={() => setCaptureMode('search')}>
              <span className="text-[10px] font-bold" style={{ color: C.primary }}>Use text</span>
            </button>
          </div>
        )}

        {/* Search box */}
        <div
          className="flex items-center gap-2 border rounded-[14px] px-3 h-[45px] mb-2"
          style={{ backgroundColor: C.card, borderColor: C.border }}
        >
          <Search size={18} color={C.mutedForeground} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search verified foods"
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: C.foreground }}
          />
        </div>

        <p className="text-[10px] font-semibold tracking-widest mb-1" style={{ color: C.mutedForeground }}>
          VERIFIED SHORTLIST
        </p>
        <div className="max-h-[210px] overflow-y-auto">
          {filtered.map((food) => (
            <button
              key={food.name}
              onClick={() => handleAdd(food.name)}
              className="flex items-center gap-2.5 w-full py-2.5 border-b text-left hover:bg-[#f0f4f1] transition-colors"
              style={{ borderBottomColor: C.border }}
            >
              <div
                className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: C.accent }}
              >
                <Check size={15} color={C.accentForeground} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: C.foreground }}>{food.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: C.mutedForeground }}>
                  {formatWhole(food.calories)} kcal · {formatGrams(food.protein)} protein · {food.confidence}% confidence
                </p>
              </div>
              <Plus size={18} color={C.primary} />
            </button>
          ))}
        </div>

        {/* Manual quick add */}
        <p className="text-[10px] font-semibold tracking-widest mt-3.5 mb-1.5" style={{ color: C.mutedForeground }}>
          MANUAL QUICK ADD
        </p>
        <div className="flex gap-1.5">
          <input
            value={customName}
            onChange={(e) => { setCustomName(e.target.value); setManualError(null); }}
            placeholder="Food name"
            className="flex-1 border rounded-xl px-3 h-[42px] text-[12px] outline-none"
            style={{
              color: C.foreground,
              backgroundColor: C.card,
              borderColor: manualError ? C.destructive : C.border,
            }}
          />
          <input
            value={customCalories}
            onChange={(e) => { setCustomCalories(e.target.value); setManualError(null); }}
            placeholder="kcal"
            type="number"
            className="w-[67px] border rounded-xl px-2.5 h-[42px] text-[12px] outline-none"
            style={{
              color: C.foreground,
              backgroundColor: C.card,
              borderColor: manualError ? C.destructive : C.border,
            }}
          />
          <button
            onClick={handleManual}
            className="w-[43px] h-[42px] rounded-xl flex items-center justify-center"
            style={{ backgroundColor: C.primary }}
            aria-label="Add manual food"
          >
            <Plus size={20} color={C.primaryForeground} />
          </button>
        </div>
        {manualError && (
          <p className="text-[11px] mt-1.5" style={{ color: C.destructive }}>{manualError}</p>
        )}

        {notice && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1f6e3a] text-white text-[12px] font-semibold rounded-full px-4 py-2 shadow-lg">
            {notice}
          </div>
        )}
      </div>
    </div>
  );
}

/** Edit log modal */
function EditLogModal({ log, onClose }: { log: FoodLog | null; onClose: () => void }) {
  const [name, setName] = useState(log?.name ?? '');
  const [calories, setCalories] = useState(log ? `${log.calories}` : '');
  const [meal, setMeal] = useState<MealType>(log?.meal ?? 'Snack');

  React.useEffect(() => {
    if (!log) return;
    setName(log.name);
    setCalories(`${log.calories}`);
    setMeal(log.meal);
  }, [log]);

  if (!log) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.42)' }}
    >
      <div
        className="w-full max-w-md rounded-t-[28px] px-5 pt-3 pb-7"
        style={{ backgroundColor: '#f8faf9' }}
      >
        <div className="w-10 h-1 rounded-full bg-[#9aa69e] mx-auto mb-4" />
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[23px] font-bold tracking-tight" style={{ color: C.foreground }}>Edit entry</p>
            <p className="text-[12px] mt-1" style={{ color: C.mutedForeground }}>Correct anything before it shapes your trend.</p>
          </div>
          <button
            onClick={onClose}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
            style={{ backgroundColor: C.muted }}
            aria-label="Close"
          >
            <X size={18} color={C.foreground} />
          </button>
        </div>

        <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: C.mutedForeground }}>Food name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-11 border rounded-xl px-3 text-[13px] outline-none mb-2.5"
          style={{ backgroundColor: C.card, borderColor: C.border, color: C.foreground }}
        />

        <div className="flex gap-2.5 mb-2.5">
          <div className="flex-1">
            <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: C.mutedForeground }}>Calories</label>
            <input
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              type="number"
              className="w-full h-11 border rounded-xl px-3 text-[13px] outline-none"
              style={{ backgroundColor: C.card, borderColor: C.border, color: C.foreground }}
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: C.mutedForeground }}>Serving</label>
            <input
              defaultValue={log.serving}
              className="w-full h-11 border rounded-xl px-3 text-[13px] outline-none"
              style={{ backgroundColor: C.card, borderColor: C.border, color: C.foreground }}
            />
          </div>
        </div>

        <label className="text-[10px] font-semibold mb-2 mt-3 block" style={{ color: C.mutedForeground }}>Meal</label>
        <div className="flex flex-wrap gap-1.5 mb-1">
          {MEAL_ORDER.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className="border rounded-xl px-2.5 py-2"
              style={{
                backgroundColor: meal === m ? C.primary : C.card,
                borderColor: meal === m ? C.primary : C.border,
              }}
            >
              <span className="text-[10px] font-semibold" style={{ color: meal === m ? C.primaryForeground : C.mutedForeground }}>
                {m}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center rounded-[13px] py-3.5 mt-3"
          style={{ backgroundColor: C.primary }}
          aria-label="Save changes"
        >
          <span className="text-[12px] font-bold" style={{ color: C.primaryForeground }}>Save changes</span>
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-1.5 py-3.5 mt-1"
          aria-label="Delete this entry"
        >
          <Trash2 size={15} color={C.destructive} />
          <span className="text-[11px] font-semibold" style={{ color: C.destructive }}>Delete this entry</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function Current() {
  const calorieTarget = 2000;

  // Compute totals from seed logs
  const totals = SEED_LOGS.reduce(
    (sum, l) => ({
      calories: sum.calories + l.calories,
      protein: sum.protein + l.protein,
      carbs: sum.carbs + l.carbs,
      fat: sum.fat + l.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const mealsLogged = new Set(SEED_LOGS.map((l) => l.meal)).size;
  const mealNames = Array.from(new Set(SEED_LOGS.map((l) => l.meal)));

  // Interactive state
  const [waterOunces, setWaterOunces] = useState(24);
  const [waterConfirmed, setWaterConfirmed] = useState(false);
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(TODAY_KEY);

  const isSelectedToday = selectedDate === TODAY_KEY;

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(`${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(`${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`);
  };
  const displayDate = isSelectedToday
    ? 'Today'
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(selectedDate));

  const handleAddWater = () => {
    if (waterConfirmed) return;
    setWaterOunces((prev) => Math.min(prev + 8, 64));
    setWaterConfirmed(true);
    setSaveNotice('Water check-in added for this day.');
    setTimeout(() => { setWaterConfirmed(false); }, 1500);
    setTimeout(() => setSaveNotice(null), 2200);
  };

  const handleMood = (m: Mood) => {
    setMood(m);
    setSaveNotice('Mood check-in saved for this day.');
    setTimeout(() => setSaveNotice(null), 2200);
  };

  const proteinTarget = Math.round((calorieTarget * 0.26) / 4);
  const carbsTarget = Math.round((calorieTarget * 0.44) / 4);
  const fatTarget = Math.round((calorieTarget * 0.30) / 9);

  // Data trust approximation
  const dataTrust = 87;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: C.background, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── App header ── */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-5 h-14 border-b"
        style={{ backgroundColor: C.background, borderColor: C.border }}
      >
        <span className="text-[17px] font-bold tracking-tight" style={{ color: C.foreground }}>Today</span>
        <div className="flex items-center gap-2">
          <button
            className="w-[38px] h-[38px] rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: C.primary, borderColor: C.primary }}
            aria-label="Open Calora Coach"
          >
            <Zap size={16} color={C.primaryForeground} />
          </button>
          <button
            className="w-[38px] h-[38px] rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: C.muted, borderColor: C.border }}
            aria-label="Profile shortcut"
          >
            <span className="text-[15px] font-bold" style={{ color: C.foreground }}>A</span>
          </button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="px-5 pt-3.5 pb-24 max-w-md mx-auto overflow-y-auto">

        {/* Hero header image strip */}
        <div
          className="relative rounded-[25px] overflow-hidden mb-4"
          style={{ minHeight: 190, backgroundColor: '#1b3022' }}
        >
          <img
            src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&auto=format&fit=crop"
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(160deg, rgba(18,34,24,0.98) 0%, rgba(18,34,24,0.72) 58%, rgba(18,34,24,0.16) 100%)' }}
          />
          <div className="relative min-h-[190px] p-5 flex flex-col justify-end">
            {/* Top badge + date */}
            <div className="absolute top-4 left-5 right-4 flex items-center justify-between">
              <div
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border"
                style={{ backgroundColor: 'rgba(212,234,220,0.16)', borderColor: 'rgba(212,234,220,0.25)' }}
              >
                <Sunrise size={12} color="#d4eadc" />
                <span className="text-[9px] font-bold tracking-widest text-[#d4eadc]">DAILY RHYTHM</span>
              </div>
              <span className="text-[8px] font-semibold tracking-wide text-right max-w-[146px]" style={{ color: '#b6d8c2' }}>
                {FORMAT_DATE_LABEL}
              </span>
            </div>
            <p className="text-[26px] font-bold text-white tracking-tight">Good morning, Alex</p>
            <p className="text-[12px] mt-1.5" style={{ color: '#d4eadc' }}>
              You're building a useful picture, one meal at a time.
            </p>
          </div>
        </div>

        {/* Motivational quote */}
        <div
          className="rounded-[18px] border px-4 py-3 mb-3.5 flex items-center gap-3"
          style={{ backgroundColor: C.card, borderColor: C.border }}
        >
          <span className="text-[20px]">🌿</span>
          <p className="text-[12px] leading-snug flex-1" style={{ color: C.mutedForeground }}>
            "Small consistent steps build the strongest foundation."
          </p>
        </div>

        {/* Date navigator (top) */}
        <DateNav
          display={displayDate}
          sub={selectedDate}
          onPrev={prevDay}
          onNext={nextDay}
        />

        {/* Hero calorie card */}
        <div
          className="rounded-[26px] border p-5 mb-4"
          style={{ backgroundColor: C.card, borderColor: C.border }}
        >
          {/* Eyebrow + trust */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: C.mutedForeground }}>
              TODAY'S FUEL
            </span>
            <div
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5"
              style={{ backgroundColor: C.accent }}
            >
              <Shield size={13} color={C.accentForeground} />
              <span className="text-[11px] font-semibold" style={{ color: C.accentForeground }}>
                {dataTrust}% trusted
              </span>
            </div>
          </div>

          {/* Gauge */}
          <CalorieGauge consumed={totals.calories} target={calorieTarget} />

          {/* Planning insight */}
          <p className="text-[11px] leading-4 mt-3.5 opacity-80" style={{ color: C.mutedForeground }}>
            You've used {Math.round((totals.calories / calorieTarget) * 100)}% of your daily goal.
            Dinner is still ahead — stay balanced.
          </p>

          {/* Living-state action */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 w-full min-h-[42px] rounded-[14px] px-4 mt-5"
            style={{ backgroundColor: C.primary }}
            aria-label="Log a meal"
          >
            <Plus size={16} color={C.primaryForeground} />
            <span className="text-[13px] font-bold" style={{ color: C.primaryForeground }}>Log a meal</span>
            <ArrowUpRight size={15} color={C.primaryForeground} />
          </button>
        </div>

        {/* Living rhythm card */}
        <LivingRhythmCard />

        {/* Quick actions */}
        <div className="flex gap-2.5 mb-5">
          {(
            [
              { icon: Camera, label: 'Photo log' },
              { icon: Search, label: 'Search foods' },
              { icon: Edit3, label: 'Quick add' },
            ] as const
          ).map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => setShowAdd(true)}
              className="flex-1 border rounded-[18px] p-3 flex flex-col justify-between min-h-[88px] text-left"
              style={{ backgroundColor: C.card, borderColor: C.border }}
              aria-label={label}
            >
              <div
                className="w-8 h-8 rounded-[11px] flex items-center justify-center"
                style={{ backgroundColor: C.accent }}
              >
                <Icon size={20} color={C.accentForeground} />
              </div>
              <span className="text-[12px] font-semibold mt-2 block" style={{ color: C.foreground }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Planner peek */}
        <div
          className="rounded-[22px] border p-4 mb-6"
          style={{ backgroundColor: C.card, borderColor: C.border }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[18px] font-bold tracking-tight" style={{ color: C.foreground }}>Today's plan</p>
              <p className="text-[12px] mt-0.5" style={{ color: C.mutedForeground }}>What you set aside for today</p>
            </div>
            <div className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center" style={{ backgroundColor: C.accent }}>
              <Calendar size={15} color={C.accentForeground} />
            </div>
          </div>
          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-2"
            style={{ backgroundColor: C.muted }}
          >
            <BarChart2 size={14} color={C.mutedForeground} />
            <span className="text-[12px]" style={{ color: C.mutedForeground }}>
              No plan set for today — add meals to start shaping tomorrow.
            </span>
          </div>
        </div>

        {/* Recipe widget */}
        <RecipeWidget onOpen={() => {}} />

        {/* Wellness cards */}
        <WellnessCards
          waterOunces={waterOunces}
          mealsLogged={mealsLogged}
          mealNames={mealNames}
          mood={mood}
          waterConfirmed={waterConfirmed}
          onAddWater={handleAddWater}
          onAddMeal={() => setShowAdd(true)}
          onMood={handleMood}
        />

        {/* Your balance (macros) */}
        <div
          className="rounded-[22px] border p-[17px] mb-6"
          style={{ backgroundColor: C.card, borderColor: C.border }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[18px] font-bold tracking-tight" style={{ color: C.foreground }}>Your balance</p>
              <p className="text-[12px] mt-1" style={{ color: C.mutedForeground }}>A simple view of what's left</p>
            </div>
            <button
              className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center"
              style={{ backgroundColor: C.muted }}
              aria-label="Edit nutrition goals"
            >
              <Sliders size={17} color={C.mutedForeground} />
            </button>
          </div>
          <MacroBar label="Protein" value={totals.protein} target={proteinTarget} color={C.protein} />
          <MacroBar label="Carbs" value={totals.carbs} target={carbsTarget} color={C.carbs} />
          <MacroBar label="Fat" value={totals.fat} target={fatTarget} color={C.fat} />
        </div>

        {/* Diary log section */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[18px] font-bold tracking-tight" style={{ color: C.foreground }}>
              {isSelectedToday ? "Today's log" : 'Diary log'}
            </p>
            <p className="text-[12px] mt-1" style={{ color: C.mutedForeground }}>
              Tap an entry to edit · {SEED_LOGS.length} logged
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-[13px] px-3 py-2.5"
            style={{ backgroundColor: C.primary }}
            aria-label="Add meal"
          >
            <Plus size={16} color={C.primaryForeground} />
            <span className="text-[12px] font-semibold" style={{ color: C.primaryForeground }}>Add</span>
          </button>
        </div>

        {/* Date nav (diary) */}
        <DateNav
          display={displayDate}
          sub={selectedDate}
          onPrev={prevDay}
          onNext={nextDay}
        />

        {/* Log card */}
        <div
          className="rounded-[22px] border px-4 py-1 mb-5"
          style={{ backgroundColor: C.card, borderColor: C.border }}
        >
          {MEAL_ORDER.map((meal) => {
            const mealLogs = SEED_LOGS.filter((l) => l.meal === meal);
            if (!mealLogs.length) return null;
            return (
              <div key={meal}>
                <p className="text-[10px] font-semibold tracking-widest mt-3.5 mb-0.5 uppercase" style={{ color: C.mutedForeground }}>
                  {meal}
                </p>
                {mealLogs.map((log) => (
                  <MealRow key={log.id} log={log} onEdit={() => setEditingLog(log)} />
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer note — truthful local/offline wording */}
        <div className="flex items-center justify-center gap-1.5 py-4">
          <CheckCircle size={15} color={C.success} />
          <span className="text-[11px]" style={{ color: C.mutedForeground }}>
            Saved on this device · ready to sync
          </span>
        </div>
      </div>

      {/* ── Save notice toast ── */}
      {saveNotice && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg"
          style={{ backgroundColor: C.primary }}
        >
          <Check size={14} color={C.primaryForeground} />
          <span className="text-[12px] font-semibold" style={{ color: C.primaryForeground }}>{saveNotice}</span>
        </div>
      )}

      {/* ── Modals ── */}
      <AddFoodModal open={showAdd} onClose={() => setShowAdd(false)} />
      <EditLogModal log={editingLog} onClose={() => setEditingLog(null)} />
    </div>
  );
}

// ─── Shared date navigator ────────────────────────────────────────────────────
function DateNav({
  display,
  sub,
  onPrev,
  onNext,
}: {
  display: string;
  sub: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between border rounded-[17px] p-2 mb-2.5"
      style={{ backgroundColor: C.card, borderColor: C.border }}
    >
      <button
        onClick={onPrev}
        className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center"
        style={{ backgroundColor: C.muted }}
        aria-label="Previous diary day"
      >
        <ChevronLeft size={17} color={C.foreground} />
      </button>
      <div className="flex flex-col items-center">
        <span className="text-[13px] font-bold" style={{ color: C.foreground }}>{display}</span>
        <span className="text-[10px] mt-0.5" style={{ color: C.mutedForeground }}>{sub}</span>
      </div>
      <button
        onClick={onNext}
        className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center"
        style={{ backgroundColor: C.muted }}
        aria-label="Next diary day"
      >
        <ChevronRight size={17} color={C.foreground} />
      </button>
    </div>
  );
}

export default Current;
