import React, { useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, ChevronDown, ChevronLeft, ChevronRight,
  Droplets, Heart, Plus, Search, Sparkles, Utensils, X,
} from 'lucide-react';

type Mood = 'Energized' | 'Good' | 'Okay' | 'Low' | 'Stressed';
type Meal = { id: number; name: string; meal: string; time: string; kcal: number };

const palette = {
  ink: '#26372f', moss: '#3f6852', sage: '#dce9dd', paper: '#f8f5ed',
  cream: '#fffdf8', terracotta: '#c96f4d', peach: '#f3d9c8', gold: '#d8aa61',
  line: '#e6e1d7', quiet: '#78847b', blue: '#8aaeb0',
};

const initialMeals: Meal[] = [
  { id: 1, name: 'Greek yoghurt with honey', meal: 'Breakfast', time: '7:32 AM', kcal: 210 },
  { id: 2, name: 'Scrambled eggs', meal: 'Breakfast', time: '7:35 AM', kcal: 180 },
  { id: 3, name: 'Grilled chicken salad', meal: 'Lunch', time: '12:48 PM', kcal: 420 },
  { id: 4, name: 'Brown rice', meal: 'Lunch', time: '12:49 PM', kcal: 215 },
];

const suggestions = ['Oats + banana', 'Avocado toast', 'Salmon bowl'];

function Arc({ progress }: { progress: number }) {
  const radius = 82;
  const circumference = Math.PI * radius;
  return (
    <svg viewBox="0 0 210 125" className="absolute inset-x-0 top-0 mx-auto h-[145px] w-[240px]" aria-hidden="true">
      <path d="M 23 108 A 82 82 0 0 1 187 108" fill="none" stroke="#dce5d9" strokeWidth="13" strokeLinecap="round" />
      <path d="M 23 108 A 82 82 0 0 1 187 108" fill="none" stroke={palette.moss} strokeWidth="13" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} className="transition-all duration-700" />
    </svg>
  );
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="mb-3 flex items-center justify-between"><h2 className="text-[11px] font-bold uppercase tracking-[.18em] text-[#78847b]">{children}</h2>{action}</div>;
}

function MealRow({ item, onRemove }: { item: Meal; onRemove: () => void }) {
  return (
    <div className="group flex items-center gap-3 border-b border-[#e6e1d7] py-3 last:border-0">
      <span className={`h-2 w-2 rounded-full ${item.meal === 'Lunch' ? 'bg-[#c96f4d]' : 'bg-[#d8aa61]'}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#26372f]">{item.name}</p>
        <p className="mt-0.5 text-[10px] text-[#78847b]">{item.meal} · {item.time}</p>
      </div>
      <span className="text-[12px] font-bold text-[#26372f]">{item.kcal} <small className="font-normal text-[#78847b]">kcal</small></span>
      <button onClick={onRemove} aria-label={`Remove ${item.name}`} className="rounded-full p-1.5 text-[#9ba49d] opacity-0 transition-opacity hover:bg-[#f1ebe2] hover:text-[#c96f4d] group-hover:opacity-100"><X size={13} /></button>
    </div>
  );
}

export function EditorialCalm() {
  const [meals, setMeals] = useState(initialMeals);
  const [water, setWater] = useState(24);
  const [mood, setMood] = useState<Mood | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState('');
  const [recipe, setRecipe] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const recipes = [
    { title: 'Thai green curry', note: 'Bright, warming, 490 kcal', color: '#c97959', accent: '#f0b184' },
    { title: 'Shakshuka', note: 'Comforting, simple, 350 kcal', color: '#b95c3e', accent: '#e9c574' },
    { title: 'Chicken fajita mac', note: 'A generous one-pan dinner, 620 kcal', color: '#6e8060', accent: '#d1a25d' },
  ];
  const consumed = meals.reduce((sum, item) => sum + item.kcal, 0);
  const addWater = () => {
    setWater((value) => Math.min(value + 8, 64));
    setToast('8 fl oz added');
    window.setTimeout(() => setToast(''), 1800);
  };
  const addSuggestion = (name: string) => {
    setMeals((current) => [...current, { id: Date.now(), name, meal: 'Snack', time: 'Just now', kcal: name.includes('Oats') ? 307 : 180 }]);
    setShowAdd(false);
    setToast(`${name} added to today`);
    window.setTimeout(() => setToast(''), 1800);
  };
  const moodText = useMemo(() => mood ? `Feeling ${mood.toLowerCase()}. Noted.` : 'A gentle check-in, whenever it helps.', [mood]);

  return (
    <main className="min-h-[100dvh] bg-[#f8f5ed] pb-8 text-[#26372f]" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-[430px] overflow-hidden">
        <header className="px-5 pb-4 pt-6">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#78847b]">Monday, October 14</p><h1 className="mt-1 font-serif text-[30px] tracking-[-.04em] text-[#26372f]">Good morning, Maya</h1></div>
            <button aria-label="Open profile" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ded8cb] bg-[#e4eee2] text-[12px] font-bold text-[#3f6852]">MC</button>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#ded8cb] bg-[#eef3e9] px-3.5 py-3">
            <div className="flex items-center gap-2.5"><Sparkles size={16} color={palette.moss} /><p className="text-[12px] font-medium text-[#3f6852]">A steady start counts today.</p></div>
            <ChevronRight size={15} color={palette.moss} />
          </div>
        </header>

        <section className="mx-4 rounded-[27px] bg-[#e2ede0] px-4 pb-4 pt-5 shadow-[0_10px_28px_rgba(63,104,82,.08)]">
          <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#718675]">Your daily balance</p><p className="mt-1 text-[13px] text-[#59715f]">There is room for what you need.</p></div><span className="rounded-full bg-[#f7e5d4] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#a85e42]">On track</span></div>
          <div className="relative mx-auto mt-2 h-[155px] w-[240px]"><Arc progress={consumed / 1800} /><div className="absolute inset-x-0 top-[55px] text-center"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#718675]">remaining</p><p className="mt-0.5 text-[39px] font-semibold leading-none tracking-[-.06em] text-[#26372f]">{Math.max(1800 - consumed, 0).toLocaleString()}</p><p className="mt-1 text-[11px] text-[#718675]">kcal to enjoy</p></div></div>
          <div className="flex items-center justify-center gap-9 border-t border-[#cbdcc9] pt-3"><div className="text-center"><p className="text-[19px] font-bold">{consumed.toLocaleString()}</p><p className="text-[10px] uppercase tracking-[.12em] text-[#718675]">eaten</p></div><div className="h-7 w-px bg-[#cbdcc9]" /><div className="text-center"><p className="text-[19px] font-bold">1,800</p><p className="text-[10px] uppercase tracking-[.12em] text-[#718675]">daily goal</p></div></div>
        </section>

        <section className="px-5 pt-7">
          <SectionLabel action={<button onClick={() => setShowAdd(true)} className="flex items-center gap-1 rounded-full bg-[#3f6852] px-3 py-2 text-[11px] font-bold text-[#fffdf8] shadow-sm transition-transform hover:scale-[1.03]"><Plus size={13} /> Log food</button>}>Today's rhythm</SectionLabel>
          <div className="rounded-2xl border border-[#e6e1d7] bg-[#fffdf8] px-4">
            {meals.map((item) => <MealRow item={item} key={item.id} onRemove={() => setMeals((current) => current.filter((meal) => meal.id !== item.id))} />)}
            <button onClick={() => setShowAdd(true)} className="flex w-full items-center gap-2 py-3 text-[12px] font-semibold text-[#3f6852]"><Plus size={14} /> Add something else</button>
          </div>
        </section>

        <section className="px-5 pt-7">
          <SectionLabel>Small signals</SectionLabel>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-[#e6e1d7] bg-[#fffdf8] p-3.5"><div className="flex items-center gap-2"><div className="rounded-xl bg-[#e2f0f0] p-2"><Droplets size={15} color={palette.blue} /></div><span className="text-[12px] font-semibold">Water</span></div><p className="mt-3 text-[21px] font-bold">{water}<small className="ml-1 text-[10px] font-normal text-[#78847b]">/ 64 fl oz</small></p><div className="mt-2 flex gap-1">{Array.from({ length: 8 }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < water / 8 ? 'bg-[#8aaeb0]' : 'bg-[#e9ece5]'}`} />)}</div><button onClick={addWater} disabled={water >= 64} className="mt-3 w-full rounded-xl bg-[#eaf2ee] py-2 text-[10px] font-bold text-[#3f6852] disabled:opacity-50">{water >= 64 ? 'Goal reached' : '+ 8 fl oz'}</button></div>
            <div className="rounded-2xl border border-[#e6e1d7] bg-[#fffdf8] p-3.5"><div className="flex items-center gap-2"><div className="rounded-xl bg-[#f7e5d4] p-2"><Utensils size={15} color={palette.terracotta} /></div><span className="text-[12px] font-semibold">Macros</span></div><div className="mt-3 space-y-2.5"><div><div className="flex justify-between text-[10px]"><span className="text-[#78847b]">Protein</span><b>79 / 110g</b></div><div className="mt-1 h-1.5 rounded-full bg-[#eee9df]"><div className="h-full w-[72%] rounded-full bg-[#c96f4d]" /></div></div><div><div className="flex justify-between text-[10px]"><span className="text-[#78847b]">Carbs</span><b>88 / 210g</b></div><div className="mt-1 h-1.5 rounded-full bg-[#eee9df]"><div className="h-full w-[42%] rounded-full bg-[#d8aa61]" /></div></div></div><button onClick={() => setExpanded(!expanded)} className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#3f6852]">{expanded ? 'Hide detail' : 'View balance'} <ChevronDown size={12} className={expanded ? 'rotate-180' : ''} /></button></div>
          </div>
        </section>

        <section className="px-5 pt-7">
          <div className="rounded-2xl border border-[#eadfce] bg-[#fff7ed] p-4"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#a66950]">A moment for you</p><p className="mt-1 font-serif text-[20px] text-[#5a4439]">How are you feeling?</p><p className="mt-1 text-[11px] text-[#927769]">{moodText}</p></div><Heart size={17} color={palette.terracotta} /></div><div className="mt-3 flex gap-1.5">{(['Energized', 'Good', 'Okay', 'Low', 'Stressed'] as Mood[]).map((item) => <button key={item} onClick={() => setMood(item)} className={`flex-1 rounded-xl border py-2 text-[9px] font-semibold transition-colors ${mood === item ? 'border-[#c96f4d] bg-[#c96f4d] text-white' : 'border-[#eadfce] bg-[#fffdf8] text-[#927769]'}`}>{item}</button>)}</div></div>
        </section>

        <section className="px-5 pb-4 pt-7">
          <SectionLabel action={<button onClick={() => setRecipe((recipe + recipes.length - 1) % recipes.length)} aria-label="Previous recipe"><ChevronLeft size={16} color={palette.quiet} /></button>}>For later</SectionLabel>
          <div className="relative overflow-hidden rounded-[22px] p-4 text-[#fffdf8]" style={{ backgroundColor: recipes[recipe].color }}><div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border-[18px] opacity-30" style={{ borderColor: recipes[recipe].accent }} /><div className="absolute right-6 top-8 h-16 w-16 rounded-full opacity-60" style={{ backgroundColor: recipes[recipe].accent }} /><div className="relative"><div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-[#ffe0ba]"><BookOpen size={12} /> Recipe inspiration</div><p className="mt-8 font-serif text-[25px] leading-none">{recipes[recipe].title}</p><p className="mt-2 text-[11px] text-[#ffe5d4]">{recipes[recipe].note}</p><button onClick={() => setToast('Recipe saved for later')} className="mt-4 flex items-center gap-1.5 rounded-full bg-[#fffdf8] px-3 py-2 text-[10px] font-bold text-[#6e4639]">View recipe <ArrowRight size={12} /></button></div></div>
          <div className="mt-3 flex items-center justify-center gap-1.5">{recipes.map((_, i) => <button key={i} onClick={() => setRecipe(i)} aria-label={`Show recipe ${i + 1}`} className={`h-1.5 rounded-full transition-all ${recipe === i ? 'w-5 bg-[#3f6852]' : 'w-1.5 bg-[#cbd6ca]'}`} />)}</div>
        </section>
      </div>
      {showAdd && <div className="fixed inset-0 z-20 flex items-end justify-center bg-[#26372f]/30 p-3" onClick={() => setShowAdd(false)}><div className="w-full max-w-[414px] rounded-[27px] bg-[#fffdf8] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-start justify-between"><div><p className="font-serif text-[25px]">Add to today</p><p className="mt-1 text-[11px] text-[#78847b]">Choose something quick, or search when you have a moment.</p></div><button onClick={() => setShowAdd(false)} aria-label="Close add food"><X size={19} /></button></div><button onClick={() => addSuggestion('Photo estimate')} className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-[#3f6852] p-3.5 text-left text-[#fffdf8]"><Search size={18} /><span><b className="block text-[13px]">Search or scan a food</b><small className="text-[10px] text-[#d8e7d8]">Review an estimate before it counts</small></span></button><p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#78847b]">Recent ideas</p>{suggestions.map((name) => <button key={name} onClick={() => addSuggestion(name)} className="flex w-full items-center justify-between border-b border-[#e6e1d7] py-3 text-left text-[13px] font-semibold">{name}<Plus size={15} color={palette.moss} /></button>)}</div></div>}
      {toast && <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#26372f] px-4 py-2.5 text-[11px] font-bold text-[#fffdf8] shadow-lg">{toast}</div>}
    </main>
  );
}