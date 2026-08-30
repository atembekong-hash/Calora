import React, { useState } from 'react';
import {
  Activity, ArrowUpRight, Award, Check, ChevronRight, CircleHelp,
  ExternalLink, HeartPulse, RefreshCw, ShieldCheck, Watch, Zap,
} from 'lucide-react';

const colors = {
  ink: '#173b32', deep: '#10362e', coral: '#e5795d', coralLight: '#f7d2c6',
  paper: '#f5f0e8', card: '#fffaf3', line: '#ded8cb', quiet: '#6e7c73',
  mint: '#dcebe1', mintDeep: '#2d6650', sun: '#e2b866', rose: '#fff0e9',
};

type ToastProps = { message: string; onClose: () => void };

function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#173b32] px-4 py-3 text-[11px] font-bold text-[#fffaf3] shadow-xl">
      <Check size={14} className="text-[#e2b866]" /> {message}
      <button onClick={onClose} className="ml-1 text-[#b8d0bd]" aria-label="Dismiss message">×</button>
    </div>
  );
}

function Metric({ icon, label, value, unit, accent }: { icon: React.ReactNode; label: string; value: string; unit?: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-[#d8e2d8] bg-[#fffaf3] p-4">
      <div className="absolute right-[-18px] top-[-20px] h-20 w-20 rounded-full border-[10px] opacity-40" style={{ borderColor: accent }} />
      <div className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#718078]">
        <span style={{ color: accent }}>{icon}</span>{label}
      </div>
      <p className="relative mt-4 font-['Space_Grotesk'] text-[27px] font-bold leading-none tracking-[-.06em] text-[#173b32]">
        {value}{unit && <span className="ml-1 text-[11px] font-semibold tracking-normal text-[#718078]">{unit}</span>}
      </p>
    </div>
  );
}

export function FitnessTrustForward() {
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };
  const sync = () => {
    if (syncing) return;
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      notify('Activity is up to date');
    }, 900);
  };

  return (
    <main className="min-h-[100dvh] bg-[#f5f0e8] pb-8 text-[#173b32]" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-[430px] overflow-hidden">
        <header className="px-5 pb-5 pt-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#718078]">Monday · 14 October</p>
              <h1 className="mt-2 font-['Fraunces'] text-[37px] font-semibold leading-[.95] tracking-[-.055em]">Your training,<br /><em className="font-normal text-[#d36f55]">in context.</em></h1>
            </div>
            <button onClick={() => notify('Profile is ready for review')} aria-label="Open profile" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d5cec1] bg-[#dcebe1] text-[11px] font-bold text-[#2d6650] transition-transform hover:scale-105">MC</button>
          </div>
          <div className="mt-6 flex items-center gap-2 border-l-2 border-[#e5795d] pl-3 text-[12px] leading-5 text-[#53675c]">
            <span>Activity helps us read your day.</span><CircleHelp size={14} className="text-[#e5795d]" />
          </div>
        </header>

        <section className="relative mx-4 overflow-hidden rounded-[28px] bg-[#173b32] px-5 pb-5 pt-5 text-[#fffaf3] shadow-[0_14px_34px_rgba(23,59,50,.14)]">
          <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full border-[24px] border-[#e5795d]/25" />
          <div className="absolute -bottom-20 -left-12 h-40 w-40 rounded-full border-[18px] border-[#e2b866]/20" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9c8b1]">Your focus</p>
              <h2 className="mt-2 font-['Fraunces'] text-[28px] leading-none tracking-[-.04em]">Build strength<br />without rushing it.</h2>
            </div>
            <div className="rounded-full bg-[#2d6650] p-2.5 text-[#e2b866]"><HeartPulse size={19} /></div>
          </div>
          <p className="relative mt-5 max-w-[305px] text-[12px] leading-[1.55] text-[#c4d7c7]">A good training day supports recovery too. We’ll keep the signal clear, not turn it into a score.</p>
          <div className="relative mt-5 flex items-center justify-between border-t border-[#5a7d6b] pt-3">
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a9c8b1]">Current-day lens</span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#e2b866]"><span className="h-1.5 w-1.5 rounded-full bg-[#e2b866]" />Calm + consistent</span>
          </div>
        </section>

        <section className="px-5 pt-7">
          <div className="mb-3 flex items-end justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#718078]">Activity today</p><h2 className="mt-1 font-['Fraunces'] text-[25px] tracking-[-.035em]">A quiet read on your day</h2></div>
            <button onClick={sync} disabled={syncing} className="flex items-center gap-1.5 rounded-full border border-[#d5cec1] bg-[#fffaf3] px-3 py-2 text-[10px] font-bold text-[#2d6650] transition-colors hover:bg-[#dcebe1]">
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing' : 'Sync'}
            </button>
          </div>
          <div className="mb-3 flex items-center gap-2 text-[11px] text-[#718078]"><Watch size={14} /> Imported from Apple Health <span className="h-1 w-1 rounded-full bg-[#b2b9b0]" /> Updated 9:42 AM</div>
          <div className="grid grid-cols-2 gap-3">
            <Metric icon={<Zap size={14} />} label="Active energy" value="0" unit="kcal" accent={colors.coral} />
            <Metric icon={<Activity size={14} />} label="Steps" value="0" accent={colors.mintDeep} />
          </div>
          <div className="mt-3 rounded-[18px] border border-[#e3bda9] bg-[#fff0e9] px-4 py-3 text-[11px] leading-4 text-[#925844]">
            <span className="font-bold">No workout double-counting.</span> Imported activity stays as context and never changes your logged dietary calories.
          </div>
        </section>

        <section className="px-5 pt-7">
          <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#718078]">Recent workouts</p><h2 className="mt-1 font-['Fraunces'] text-[25px] tracking-[-.035em]">Nothing logged yet</h2></div><span className="rounded-full bg-[#dcebe1] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#2d6650]">Today</span></div>
          <div className="rounded-[22px] border border-dashed border-[#c9c9ba] bg-[#faf6ef] px-5 py-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#e4ece2] p-3 text-[#2d6650]"><Activity size={21} /></div>
              <div><h3 className="text-[14px] font-bold">No recent workouts</h3><p className="mt-1 text-[11px] leading-5 text-[#718078]">When your connected device records one, it will appear here. This screen does not play or create workouts.</p></div>
            </div>
            <button onClick={() => notify('Review Apple Health access from your device settings')} className="mt-5 flex w-full items-center justify-between rounded-xl bg-[#173b32] px-4 py-3 text-left text-[11px] font-bold text-[#fffaf3] transition-transform hover:translate-y-[-1px]">Review health access <ArrowUpRight size={15} /></button>
          </div>
        </section>

        <section className="px-5 pt-7">
          <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#718078]">Programs</p><h2 className="mt-1 font-['Fraunces'] text-[25px] tracking-[-.035em]">A considered first connection</h2></div><Award size={20} className="text-[#d39e45]" /></div>
          <div className="overflow-hidden rounded-[23px] border border-[#d6d0c4] bg-[#fffaf3]">
            <div className="flex items-center gap-3 border-b border-[#e4ded3] px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e5795d] text-[#fffaf3]"><span className="font-['Space_Grotesk'] text-[17px] font-bold">LM</span></div>
              <div className="min-w-0 flex-1"><h3 className="text-[15px] font-bold">LES MILLS Content</h3><p className="mt-1 text-[10px] font-semibold text-[#b36750]">Approved provider · access pending</p></div>
              <span className="h-2 w-2 rounded-full bg-[#e2b866]" title="Pending" />
            </div>
            <div className="px-4 py-4"><p className="text-[12px] leading-5 text-[#617067]">Calora’s first program connection is being prepared with official LES MILLS metadata and attributed links.</p>
              <button onClick={() => setShowDetails(!showDetails)} className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#2d6650]">{showDetails ? 'Hide connection boundaries' : 'What this means'} <ChevronRight size={14} className={showDetails ? 'rotate-90' : ''} /></button>
              {showDetails && <div className="mt-4 space-y-3 border-t border-[#e4ded3] pt-4 text-[11px] leading-4 text-[#53675c]"><p className="flex gap-2"><ShieldCheck size={15} className="shrink-0 text-[#2d6650]" />Attributed metadata + official deep links only.</p><p className="flex gap-2"><Check size={15} className="shrink-0 text-[#2d6650]" />No workout instructions, media, or playback in Calora.</p><p className="flex gap-2"><Zap size={15} className="shrink-0 text-[#d39e45]" />Signed partner access is required before provider metadata is imported.</p></div>}
              <button onClick={() => notify('Opening official LES MILLS source')} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#dcebe1] px-4 py-2.5 text-[11px] font-bold text-[#2d6650] transition-colors hover:bg-[#c8ded0]">Visit official source <ExternalLink size={13} /></button>
            </div>
          </div>
          <p className="mt-5 text-center text-[10px] leading-4 text-[#89938b]">Imported activity is context only and does not alter your logged dietary calories.<br />Program connections remain limited to approved source types.</p>
        </section>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </main>
  );
}