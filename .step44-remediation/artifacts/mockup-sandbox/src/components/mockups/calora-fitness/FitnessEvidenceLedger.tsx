import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Info,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";

type Evidence = {
  id: string;
  category: string;
  title: string;
  detail: string;
  source: string;
  sourceType: "reviewed" | "measured" | "personal";
  tone: "clay" | "blue" | "ochre";
  stat?: string;
};

const evidence: Evidence[] = [
  {
    id: "recovery",
    category: "Recovery",
    title: "Your rest day is doing useful work",
    detail: "Low-intensity movement supports circulation without adding training stress.",
    source: "Calora coaching team · 2024 review",
    sourceType: "reviewed",
    tone: "clay",
    stat: "08 min",
  },
  {
    id: "protein",
    category: "Nutrition",
    title: "A steadier breakfast may help your 3pm dip",
    detail: "You logged less than 12g protein before noon on four of the last seven days.",
    source: "Your meal log · last 7 days",
    sourceType: "measured",
    tone: "blue",
    stat: "4 / 7 days",
  },
  {
    id: "walk",
    category: "Movement",
    title: "A walk is enough for today's plan",
    detail: "Your plan adapts to energy, sleep, and consistency — not a perfect streak.",
    source: "Maya, your Calora coach",
    sourceType: "personal",
    tone: "ochre",
    stat: "2.4 km",
  },
];

const sourceLabel: Record<Evidence["sourceType"], string> = {
  reviewed: "Reviewed guidance",
  measured: "From your data",
  personal: "Personalised for you",
};

const toneMap = {
  clay: {
    wash: "#f6e5da",
    ink: "#8d4f3e",
    dot: "#cf795f",
    line: "#e9c6b6",
  },
  blue: {
    wash: "#e1edef",
    ink: "#416b73",
    dot: "#6d9ca0",
    line: "#bdd7d9",
  },
  ochre: {
    wash: "#f5edd2",
    ink: "#8a6d2f",
    dot: "#d3a744",
    line: "#e5d5a5",
  },
};

function EvidenceRow({
  item,
  open,
  onToggle,
}: {
  item: Evidence;
  open: boolean;
  onToggle: () => void;
}) {
  const tone = toneMap[item.tone];

  return (
    <article
      className="overflow-hidden rounded-[20px] border transition-all duration-300"
      style={{
        borderColor: open ? tone.line : "#e7e1d9",
        background: open ? tone.wash : "#fffdf8",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px]"
          style={{ background: tone.wash, color: tone.ink }}
        >
          {item.sourceType === "reviewed" ? (
            <ShieldCheck size={17} strokeWidth={1.8} />
          ) : item.sourceType === "measured" ? (
            <Timer size={17} strokeWidth={1.8} />
          ) : (
            <Sparkles size={17} strokeWidth={1.8} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: tone.ink }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
            {item.category}
          </span>
          <span className="block text-[13px] font-semibold leading-[1.25] text-[#273832]">{item.title}</span>
        </span>
        {item.stat && <span className="hidden shrink-0 text-right sm:block"><span className="block text-[12px] font-bold text-[#273832]">{item.stat}</span><span className="text-[9px] text-[#8a938d]">signal</span></span>}
        <span className="shrink-0 text-[#86918b]">{open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</span>
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: tone.line }}>
          <p className="max-w-[290px] text-[12px] leading-[1.55] text-[#53645b]">{item.detail}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: tone.ink }}>
              {item.sourceType === "reviewed" ? <Check size={13} /> : <Info size={13} />}
              {sourceLabel[item.sourceType]}
            </div>
            <button
              type="button"
              onClick={() => window.alert(`${item.source} would open here.`)}
              className="flex items-center gap-1 text-[10px] font-bold text-[#52645a] underline decoration-[#bfcac2] underline-offset-4"
            >
              See source <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#ffffff99]">
            <div className="h-full w-[72%] rounded-full" style={{ background: tone.dot }} />
          </div>
        </div>
      )}
    </article>
  );
}

export function FitnessEvidenceLedger() {
  const [activeDay, setActiveDay] = useState("Today");
  const [openId, setOpenId] = useState("recovery");
  const [reviewedOnly, setReviewedOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visibleEvidence = reviewedOnly
    ? evidence.filter((item) => item.sourceType === "reviewed")
    : showAll
      ? evidence
      : evidence.slice(0, 2);

  return (
    <main
      className="min-h-[100dvh] w-full bg-[#e9e5dc] px-3 py-3 text-[#273832] sm:flex sm:items-center sm:justify-center sm:py-8"
      style={{ fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif" }}
    >
      <section className="relative mx-auto min-h-[820px] w-full max-w-[414px] overflow-hidden rounded-[30px] border border-[#d7d3c9] bg-[#f8f6f0] shadow-[0_20px_55px_rgba(47,57,48,0.14)]">
        <div className="pointer-events-none absolute -right-24 -top-32 h-64 w-64 rounded-full bg-[#dbe7dd] opacity-70" />
        <div className="pointer-events-none absolute -left-28 bottom-20 h-64 w-64 rounded-full bg-[#f2dfd2] opacity-55" />

        <header className="relative flex items-center justify-between px-5 pb-4 pt-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#87918b]">Calora / evidence</p>
            <h1 className="mt-1 font-serif text-[26px] leading-none tracking-[-0.03em] text-[#273832]">Why this plan?</h1>
          </div>
          <button
            type="button"
            onClick={() => setReviewedOnly((value) => !value)}
            aria-label="Filter evidence"
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${reviewedOnly ? "border-[#416b73] bg-[#416b73] text-[#fffdf8]" : "border-[#d9ded7] bg-[#fffdf8] text-[#637269]"}`}
          >
            <SlidersHorizontal size={17} strokeWidth={1.8} />
          </button>
        </header>

        <div className="relative px-5">
          <div className="rounded-[23px] bg-[#344d42] p-5 text-[#f8f6f0] shadow-[0_12px_28px_rgba(52,77,66,0.16)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b8caba]">Your plan, explained</p>
                <p className="mt-2 max-w-[250px] font-serif text-[24px] leading-[1.05] tracking-[-0.02em]">Small signals. Better decisions.</p>
              </div>
              <div className="rounded-full border border-[#abc2b0]/40 p-2 text-[#d5e6d5]">
                <LockKeyhole size={15} strokeWidth={1.8} />
              </div>
            </div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-[10px] text-[#c0d1c3]">Confidence in today's plan</p>
                <p className="mt-1 text-[31px] font-semibold tracking-[-0.05em]">72<span className="text-[17px] font-normal text-[#b8caba]"> / 100</span></p>
              </div>
              <div className="relative h-[48px] w-[112px] overflow-hidden">
                <svg viewBox="0 0 112 55" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <path d="M4 48 C 24 10, 53 22, 67 32 S 94 38, 109 5" fill="none" stroke="#87ac92" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" />
                  <circle cx="109" cy="5" r="4" fill="#e2b867" />
                </svg>
              </div>
            </div>
            <p className="mt-2 max-w-[285px] text-[10px] leading-[1.45] text-[#c0d1c3]">Built from your recent patterns, reviewed guidance, and how you say you feel.</p>
          </div>
        </div>

        <nav className="relative mt-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {["Today", "This week", "Your pattern"].map((day) => (
            <button
              type="button"
              key={day}
              onClick={() => setActiveDay(day)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[10px] font-bold transition-colors ${activeDay === day ? "border-[#344d42] bg-[#344d42] text-[#f8f6f0]" : "border-[#dfe2da] bg-[#fffdf8] text-[#748279]"}`}
            >
              {day}
            </button>
          ))}
        </nav>

        <section className="relative px-5 pb-8 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-[21px] tracking-[-0.02em] text-[#32483d]">{activeDay === "Today" ? "The reasoning trail" : activeDay}</h2>
              <p className="mt-0.5 text-[10px] text-[#87918b]">{reviewedOnly ? "Showing reviewed guidance only" : "Tap any note to see what shaped it"}</p>
            </div>
            <button
              type="button"
              onClick={() => setReviewedOnly((value) => !value)}
              className={`text-[10px] font-bold ${reviewedOnly ? "text-[#416b73]" : "text-[#76857b]"}`}
            >
              {reviewedOnly ? "Clear filter" : "Reviewed first"}
            </button>
          </div>

          <div className="space-y-2.5">
            {visibleEvidence.map((item) => (
              <EvidenceRow
                key={item.id}
                item={item}
                open={openId === item.id}
                onToggle={() => setOpenId((current) => (current === item.id ? "" : item.id))}
              />
            ))}
          </div>

          {!reviewedOnly && (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[16px] border border-dashed border-[#ccd5cb] py-3 text-[10px] font-bold text-[#637269]"
            >
              {showAll ? "Show fewer signals" : "Show all 3 signals"} {showAll ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}

          <div className="mt-5 flex items-start gap-2.5 rounded-[17px] border border-[#e5e0d4] bg-[#f1eee6] p-3.5">
            <CircleHelp size={15} className="mt-0.5 shrink-0 text-[#8e9a91]" strokeWidth={1.8} />
            <p className="text-[10px] leading-[1.45] text-[#758178]"><span className="font-bold text-[#53645b]">A note on trust.</span> We show the signal behind a suggestion, so you can keep it, skip it, or ask for a different approach.</p>
          </div>

          <button
            type="button"
            onClick={() => window.alert("Your feedback has been noted.")}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[17px] border border-[#d5dcd3] bg-[#fffdf8] py-3.5 text-[11px] font-bold text-[#465b4e]"
          >
            <Star size={14} strokeWidth={1.8} /> Does this explanation feel useful?
          </button>
        </section>
      </section>
    </main>
  );
}
