import React, { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Cloud,
  Droplet,
  Edit3,
  EyeOff,
  FileText,
  Globe,
  HelpCircle,
  Info,
  Lock,
  Moon,
  Shield,
  Sun,
  Target,
  Trash2,
  Type,
  User,
  X,
} from "lucide-react";
import "./_group.css";
import "./Redesigned.css";

type IconType = React.ElementType;
type ToastSetter = (message: string) => void;

interface SettingRowProps {
  icon: IconType;
  title: string;
  body: string;
  onPress: () => void;
  className?: string;
}

const mealReminders = [
  { title: "Breakfast", body: "8:00 AM", icon: Sun },
  { title: "Lunch", body: "12:30 PM", icon: Sun },
  { title: "Dinner", body: "7:00 PM", icon: Moon },
];

const notices = [
  {
    title: "Hydration reminder",
    body: "Time for a glass of water. Small, steady steps add up.",
    time: "Today · 2:00 PM",
  },
  {
    title: "Daily goal check-in",
    body: "You are 420 kcal from your daily target. Keep going.",
    time: "Today · 9:00 AM",
  },
];

function SettingRow({ icon: Icon, title, body, onPress, className = "" }: SettingRowProps) {
  return (
    <button className={`cr-setting-row ${className}`} onClick={onPress} type="button">
      <span className="cr-symbol"><Icon size={16} /></span>
      <span className="cr-copy">
        <span className="cr-row-title">{title}</span>
        <span className="cr-row-body">{body}</span>
      </span>
      <ChevronRight className="cr-chevron" size={16} />
    </button>
  );
}

function SectionHeading({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="cr-section-heading">
      <span className="cr-section-index">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </div>
  );
}

function NotificationsSheet({
  close,
  notify,
}: {
  close: () => void;
  notify: ToastSetter;
}) {
  const [unread, setUnread] = useState(true);
  const [historyVisible, setHistoryVisible] = useState(true);

  return (
    <div className="cr-overlay" onClick={close}>
      <section
        aria-label="Notifications"
        aria-modal="true"
        className="cr-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="cr-sheet-handle" />
        <header className="cr-sheet-head">
          <span className="cr-symbol"><Bell size={17} /></span>
          <div>
            <h2>Notifications</h2>
            <div className="cr-row-body">
              {unread ? "2 unread updates" : "You’re all caught up"}
            </div>
          </div>
          <button aria-label="Close notifications" className="cr-sheet-close" onClick={close} type="button">
            <X size={17} />
          </button>
        </header>
        {historyVisible ? (
          <>
            {notices.map((notice, index) => (
              <button
                className={`cr-notice ${unread && index === 0 ? "unread" : ""}`}
                key={notice.title}
                onClick={() => notify(`${notice.title} stays in your inbox`)}
                type="button"
              >
                <span className="cr-symbol"><Bell size={14} /></span>
                <span className="cr-copy">
                  <span className="cr-row-title">{notice.title}</span>
                  <small>{notice.body}</small>
                  <small>{notice.time}</small>
                </span>
                <ChevronRight className="cr-chevron" size={15} />
              </button>
            ))}
            <footer className="cr-sheet-actions">
              <button onClick={() => { setUnread(false); notify("All notifications marked as read"); }} type="button">
                <Check size={12} /> Mark all read
              </button>
              <button onClick={() => { setHistoryVisible(false); notify("Notification history cleared"); }} type="button">
                Clear history
              </button>
            </footer>
          </>
        ) : (
          <div className="cr-inline-note">
            <Check size={15} />
            Your notification history is clear.
          </div>
        )}
      </section>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  body,
  checked,
  onChange,
}: {
  icon: IconType;
  title: string;
  body: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="cr-control-row">
      <span className="cr-symbol"><Icon size={16} /></span>
      <div className="cr-copy">
        <div className="cr-row-title">{title}</div>
        <div className="cr-row-body">{body}</div>
      </div>
      <input
        aria-label={title}
        checked={checked}
        className="cr-toggle"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </div>
  );
}

function ProfilePlan({ notify }: { notify: ToastSetter }) {
  return (
    <section className="cr-section">
      <SectionHeading number="01" title="Your plan" body="The details Calora uses to make your day feel steadier." />
      <div className="cr-card">
        <div className="cr-plan-summary">
          <span className="cr-symbol"><Target size={16} /></span>
          <div className="cr-copy">
            <div className="cr-plan-kcal">2,100 <small>kcal daily target</small></div>
            <div className="cr-row-body">Everything · 72 kg · moderately active</div>
          </div>
          <span className="cr-pill">AUTO</span>
        </div>
        <SettingRow
          body="34 years · Moderately active"
          icon={User}
          onPress={() => notify("Personal details are ready to edit")}
          title="Personal details"
        />
        <SettingRow
          body="Automatic recommendations"
          icon={Target}
          onPress={() => notify("Nutrition goals are ready to edit")}
          title="Nutrition goals"
        />
        <div className="cr-inline-note">
          <Activity size={14} />
          Calora adjusts recommendations gently as your routine changes.
        </div>
      </div>
    </section>
  );
}

function DailyHabits({ notify }: { notify: ToastSetter }) {
  const [notifications, setNotifications] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [mealState, setMealState] = useState([true, true, false]);
  const [goalCheckIn, setGoalCheckIn] = useState(true);

  return (
    <section className="cr-section">
      <SectionHeading number="02" title="Daily habits" body="Small nudges, delivered on your terms." />
      <div className="cr-card">
        <ToggleRow
          body={notifications ? "Selected reminders arrive on this device" : "Reminders paused · choices are saved"}
          checked={notifications}
          icon={notifications ? Bell : BellOff}
          onChange={(checked) => { setNotifications(checked); notify(checked ? "Reminders are on" : "Reminders are paused"); }}
          title="Notifications"
        />
        <div className="cr-control-row">
          <span className="cr-symbol"><Moon size={16} /></span>
          <div className="cr-copy">
            <div className="cr-row-title">Quiet hours</div>
            <div className="cr-row-body">{quietHours ? "Pause delivery 10:00 PM – 7:00 AM" : "Allow reminders at all hours"}</div>
          </div>
          <input
            aria-label="Quiet hours"
            checked={quietHours}
            className="cr-toggle"
            onChange={(event) => setQuietHours(event.target.checked)}
            type="checkbox"
          />
        </div>
        {quietHours && (
          <div className="cr-quiet-detail">
            <button className="cr-time" onClick={() => notify("Quiet hours start stays at 10:00 PM")} type="button">
              <small>Start quiet hours</small><strong>10:00 PM</strong>
            </button>
            <button className="cr-time" onClick={() => notify("Quiet hours end stays at 7:00 AM")} type="button">
              <small>End quiet hours</small><strong>7:00 AM</strong>
            </button>
          </div>
        )}
      </div>
      <div className="cr-subhead">Meal reminders</div>
      <div className="cr-card">
        {mealReminders.map(({ title, body, icon: MealIcon }, index) => (
          <div className="cr-meal-row" key={title}>
            <span className="cr-symbol"><MealIcon size={15} /></span>
            <div className="cr-copy">
              <div className="cr-row-title">{title}</div>
              <div className="cr-row-body">{body}</div>
            </div>
            <input
              aria-label={`${title} reminder`}
              checked={mealState[index]}
              className="cr-toggle"
              onChange={(event) => setMealState((current) => current.map((value, i) => i === index ? event.target.checked : value))}
              type="checkbox"
            />
          </div>
        ))}
      </div>
      <div className="cr-subhead">Daily goal check-in</div>
      <div className="cr-card">
        <ToggleRow
          body="Daily at 9:00 AM"
          checked={goalCheckIn}
          icon={Target}
          onChange={setGoalCheckIn}
          title="Daily goal check-in"
        />
      </div>
    </section>
  );
}

function AppPreferences({ notify }: { notify: ToastSetter }) {
  const [appearance, setAppearance] = useState("System");
  const [textSize, setTextSize] = useState("A");
  const [units, setUnits] = useState("Metric");

  return (
    <section className="cr-section">
      <SectionHeading number="03" title="App preferences" body="Make Calora read and feel right for you." />
      <div className="cr-subhead">Appearance</div>
      <div className="cr-segmented" role="group" aria-label="Appearance">
        {[
          { label: "System", icon: Lock },
          { label: "Light", icon: Sun },
          { label: "Dark", icon: Moon },
        ].map(({ label, icon: Icon }) => (
          <button className={appearance === label ? "active" : ""} key={label} onClick={() => { setAppearance(label); notify(`${label} appearance selected`); }} type="button">
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
      <div className="cr-card" style={{ marginTop: 9 }}>
        <div className="cr-control-row">
          <span className="cr-symbol"><Type size={16} /></span>
          <div className="cr-copy">
            <div className="cr-row-title">Text size</div>
            <div className="cr-row-body">Grilled chicken salad · 510 kcal</div>
          </div>
          <div className="cr-small-controls">
            {["A−", "A", "A+"].map((size) => <button className={`cr-chip ${textSize === size ? "active" : ""}`} key={size} onClick={() => setTextSize(size)} type="button">{size}</button>)}
          </div>
        </div>
        <div className="cr-control-row">
          <span className="cr-symbol"><Globe size={16} /></span>
          <div className="cr-copy">
            <div className="cr-row-title">Measurement units</div>
            <div className="cr-row-body">Used for weight, water, and portions</div>
          </div>
          <div className="cr-small-controls">
            {["Metric", "Imperial"].map((unit) => <button className={`cr-chip ${units === unit ? "active" : ""}`} key={unit} onClick={() => setUnits(unit)} type="button">{unit}</button>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Membership({ notify }: { notify: ToastSetter }) {
  const [annual, setAnnual] = useState(true);

  return (
    <section className="cr-section">
      <SectionHeading number="04" title="Membership" body="Keep the tools that help you notice what works." />
      <div className="cr-membership">
        <div className="cr-membership-top">
          <span className="cr-symbol"><Shield size={16} /></span>
          <div className="cr-copy">
            <h3>CaloraApp Pro</h3>
            <div className="cr-row-body">Your premium plan is active.</div>
          </div>
          <span className="cr-pill">PRO</span>
        </div>
        <div className="cr-subhead" style={{ marginTop: 0 }}>Choose a plan</div>
        {[
          { name: "Monthly", detail: "Cancel anytime", price: "$4.99 / mo", isAnnual: false },
          { name: "Annual", detail: "Billed annually", price: "$35.99 / yr", isAnnual: true },
        ].map((plan) => (
          <button className={`cr-plan-choice ${annual === plan.isAnnual ? "selected" : ""}`} key={plan.name} onClick={() => setAnnual(plan.isAnnual)} type="button">
            <span className="cr-radio">{annual === plan.isAnnual && <span className="cr-radio-dot" />}</span>
            <span className="cr-copy"><span className="cr-row-title">{plan.name}</span><span className="cr-row-body">{plan.detail}</span></span>
            <span className="cr-price">{plan.price}</span>
          </button>
        ))}
        <div className="cr-inline-note" style={{ padding: "10px 2px 2px" }}>
          <Check size={14} /> 7-day free trial. Store eligibility and localized prices apply.
        </div>
        <div className="cr-feature-list">
          {["Photo and voice logging", "Food sources and confidence", "Calorie targets and insights", "Ad-free offline diary"].map((feature) => (
            <div className="cr-feature" key={feature}><Check size={14} />{feature}</div>
          ))}
        </div>
        <button className="cr-primary" onClick={() => notify(`Selected ${annual ? "annual" : "monthly"} membership`)} type="button">
          Continue with {annual ? "$35.99 / year" : "$4.99 / month"} <ChevronRight size={15} />
        </button>
        <p className="cr-disclaimer">After the 7-day trial, your plan renews at its plan price unless changed or canceled in the store.</p>
        <div className="cr-membership-links">
          <button onClick={() => notify("Purchase history restored")} type="button">Restore purchases</button>
          <span>·</span>
          <button onClick={() => notify("Subscription management opened")} type="button">Manage subscription</button>
        </div>
      </div>
      <div className="cr-card" style={{ marginTop: 9 }}>
        <SettingRow body="Give friends a steadier way to track." icon={Cloud} onPress={() => notify("Share link copied")} title="Share CaloraApp" />
      </div>
    </section>
  );
}

function DataPrivacy({ notify }: { notify: ToastSetter }) {
  return (
    <section className="cr-section">
      <SectionHeading number="05" title="Data and privacy" body="Your food diary stays yours, with controls close at hand." />
      <div className="cr-trust-card">
        <div className="cr-trust-head">
          <span className="cr-symbol"><Activity size={16} /></span>
          <div className="cr-copy">
            <div className="cr-row-title">Health data</div>
            <div className="cr-row-body">Not connected · Calora works offline without it</div>
          </div>
        </div>
        <div className="cr-trust-actions">
          <button className="cr-outline-btn" onClick={() => notify("Health connection stays off")} type="button"><Lock size={12} /> Not connected</button>
          <button className="cr-outline-btn" onClick={() => notify("Health connection details opened")} type="button">Learn more</button>
        </div>
      </div>
      <div className="cr-card" style={{ marginTop: 9 }}>
        <SettingRow body="Portable JSON · stored locally" icon={Cloud} onPress={() => notify("Your local export is ready")} title="Export your data" />
        <SettingRow body="Remove this device’s diary and profile data" icon={Trash2} onPress={() => notify("Delete local data needs confirmation")} title="Delete local data" />
        <SettingRow body="Meals are not used for ads" icon={EyeOff} onPress={() => notify("Calora does not use meals for ad tracking")} title="No ad tracking" />
      </div>
    </section>
  );
}

function Account({ notify }: { notify: ToastSetter }) {
  const aboutItems = [
    { icon: Info, title: "CaloraApp", body: "AI Nutrition & Calorie Tracker · v1.0.0" },
    { icon: Globe, title: "Website", body: "calorie-coach-pie35449.replit.app" },
    { icon: Shield, title: "Privacy Policy", body: "How we handle your data" },
    { icon: FileText, title: "Terms of Use", body: "Terms governing your use" },
    { icon: HelpCircle, title: "Help & Support", body: "support@mycaloraapp.com" },
  ];

  return (
    <section className="cr-section">
      <SectionHeading number="06" title="Account" body="Sign-in, support, and the small print." />
      <div className="cr-account-card">
        <div className="cr-account-head">
          <span className="cr-symbol"><User size={17} /></span>
          <div className="cr-copy">
            <div className="cr-account-email">alex.morgan@example.com</div>
            <div className="cr-row-body">Email & password</div>
          </div>
        </div>
        <button className="cr-account-action" onClick={() => notify("Sign out is ready when you are")} type="button">
          <User size={15} /> Sign out <ChevronRight size={15} style={{ marginLeft: "auto" }} />
        </button>
        <button className="cr-account-action danger" onClick={() => notify("Delete account needs confirmation")} type="button">
          <Trash2 size={15} /> Delete account <ChevronRight size={15} style={{ marginLeft: "auto" }} />
        </button>
      </div>
      <div className="cr-subhead">About Calora</div>
      <div className="cr-about">
        {aboutItems.map(({ icon: Icon, title, body }) => (
          <SettingRow body={body} icon={Icon} key={title} onPress={() => notify(`${title} opened`)} title={title} />
        ))}
      </div>
      <div className="cr-version">© 2026 Etiendem Technologies · CaloraApp 1.0<br />Made for steadier days</div>
    </section>
  );
}

export function Redesigned() {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <main className="calora-profile calora-redesigned">
      <div className="cr-shell">
        <header className="cr-topbar">
          <button aria-label="Go back" className="cp-back" onClick={() => setToast("Back to your diary")} type="button"><ChevronRight size={18} /></button>
          <h1>Profile</h1>
          <button aria-label="Open notifications" className="cp-icon-btn cr-bell" onClick={() => setNoticeOpen(true)} type="button">
            <Bell size={18} /><span className="cp-badge cr-badge">2</span>
          </button>
        </header>
        <div className="cr-content">
          <section className="cr-hero">
            <div className="cr-avatar">A</div>
            <div className="cr-hero-copy">
              <div className="cr-hero-name">Alex Morgan</div>
              <div className="cr-hero-sub">2,100 kcal · Everything · 72 kg</div>
            </div>
            <button aria-label="Edit profile" onClick={() => setToast("Profile details are ready to edit")} type="button"><Edit3 size={16} /></button>
          </section>
          <div className="cr-intro">
            <p>A calm place to tune the details that keep your days feeling like yours.</p>
            <span className="cr-local-mark"><Lock size={12} /> Local first</span>
          </div>
          <ProfilePlan notify={setToast} />
          <DailyHabits notify={setToast} />
          <AppPreferences notify={setToast} />
          <Membership notify={setToast} />
          <DataPrivacy notify={setToast} />
          <Account notify={setToast} />
        </div>
      </div>
      {noticeOpen && <NotificationsSheet close={() => setNoticeOpen(false)} notify={setToast} />}
      {toast && <div aria-live="polite" className="cr-toast">{toast}</div>}
    </main>
  );
}

export default Redesigned;