---
name: Animation system
description: Four-tier animation architecture across all Calora screens — patterns, component names, Reanimated version notes, and pitfalls.
---

## Architecture (four tiers)

**Tier 1 — Haptics**
- `expo-haptics` ~15.0.8 installed. Already used in scan.tsx and index.tsx.
- profile.tsx: imports `* as Haptics from 'expo-haptics'`. `saveProfileEdit` fires `notificationAsync(Success)`; `applyHydrationPrefs`, `applyMealPrefs`, `applyGoalPrefs` each fire `selectionAsync()`.
- planner.tsx and recipes.tsx do NOT yet import Haptics — add if needed.

**Tier 2 — Micro-interactions**
- `ScalePressable` component at `components/ScalePressable.tsx` — `withSpring` scale + haptic. Not yet applied to existing Pressables (deferred pass).
- Tab icons: `AnimatedTabIcon` wrapper in `_layout.tsx` springs icon scale 1→1.18 on focus (damping 14, stiffness 220).

**Tier 3 — State-reactive animations**
- `AnimatedMacroBar` in index.tsx — `onLayout` measures pixel track width, `withTiming(700ms, Easing.out(cubic))` drives fill width in pixels. Re-fires on `value`/`target` changes. Replaces static `MacroBar` in HomeScreen JSX.
- `AnimatedWaterSlot` in index.tsx — `withSpring(stiffness 380)` bounce from 0.3→1 when slot transitions unfilled→filled; `withTiming(200ms)` shrink on reverse. Uses `useRef(prevFilled)` to detect transitions.
- `AnimatedBar` and `AnimatedTrackFill` in insights.tsx — deps arrays now include `value`/`percentage` so they re-animate when data changes (progress reset to 0 before re-drive).
- Scan viewfinder corners: `withRepeat(withSequence(...))` opacity breathe on four corner views via `Animated.View` wrapper with `pointerEvents="none"`; cancels on `hasScanned`.

**Tier 4 — Screen entrance**
- Reanimated 4.1.1: `entering` prop works with `FadeInDown.springify().damping(N).delay(N)`.
- Coach message bubbles: `Animated.View entering={FadeInDown.springify().damping(16).duration(380)}` on each turn.
- Diary log entries in index.tsx: `FadeInDown.springify().damping(18).delay(logIndex * 35)`.
- Profile sections (profile.tsx): staggered delay 0/80/140/200ms for card, appearance, text+units, reminders sections.
- Planner day view: day heading at delay 60ms, meal list at delay 120ms.
- Recipe grid: `FadeInDown.springify().damping(20).delay(80)` on `<Animated.View style={styles.recipeGrid}>`.

## Key pitfalls
- `entering` only fires on initial mount — correct for screen transitions, not for conditional renders that toggle while screen is mounted.
- When wrapping a View in Animated.View for entering animation, always update BOTH the opening tag AND the closing `</View>` → `</Animated.View>`. Missing closing tag causes a TS17008 error.
- `AnimatedMacroBar` measures track width with `onLayout`; if `trackWidth` is 0 the animation is skipped (correct — avoids division-by-zero on first paint).
- Jest tests fail with Babel transform errors in this workspace — pre-existing infrastructure issue, not related to animation code. TypeScript (`npx tsc --noEmit`) is the correct compile check.
- `StyleSheet.absoluteFillObject` is used in scan.tsx for the pulse overlay — verify `StyleSheet` is imported from `react-native` (it is, via the original import).

## Progress tab deep-animation additions

**New components in insights.tsx:**
- `AnimatedCountUp` — `Animated.createAnimatedComponent(TextInput)` with `useAnimatedProps({ text })`. Counts from 0 to target over 900ms cubic ease. Used for stat card numbers.
- `AnimatedPatternBar` — height-fill animation for Weekly Patterns chart. Replaces static inline `Animated.View` height. Staggered per bar via `delay` prop.
- `AnimatedRhythmBar` — same pattern for Logging Rhythm chart.
- `AnimatedSparkBar` — pixel-height fill for weight sparkline bars.
- `CircularProgress` — SVG arc via `react-native-svg` `AnimatedCircle` + `useAnimatedProps({ strokeDashoffset })`. Replaces data-trust flat number. Size/strokeWidth configurable.
- `SpringChip` — wraps `Pressable` in `Animated.View` with `withSpring(1.07)` on selection. Applied to all activity + mood chips with `Haptics.selectionAsync()`.
- Hero parallax — `Animated.ScrollView` + `useAnimatedScrollHandler` drives `heroParallaxStyle` translateY on the header image (factor 0.38).

**Key implementation notes:**
- `useAnimatedProps({ text, defaultValue })` on `AnimatedTextInput` is the Reanimated 4 pattern for animated text (renders as editable=false TextInput).
- Percentage-string heights (`height: '${n}%'`) work in `useAnimatedStyle` worklets on Hermes. Use `.toFixed(1)` to produce stable strings.
- SVG circle arc: `strokeDasharray={circumference}` + animated `strokeDashoffset`. Rotate container `-90deg` so arc starts at top.
- `AnimatedCircle = Animated.createAnimatedComponent(Circle)` from `react-native-svg`.

**Confetti burst (insights.tsx):**
- Pure-RN particle system — no Lottie. 30 particles, each a `ConfettiParticle` sub-component with its own `useAnimatedStyle`.
- Two shared values owned by `ConfettiBurst`: `progress` (0→1 over 2.1s, cubic ease) and `fadeOpacity` (1→0 after 1.5s delay, 600ms).
- Particle positions computed in worklet: `x = cos(angle)*speed*p + offsetX`, `y = sin(angle)*speed*p + 140*p²` (simulated gravity).
- Hook-in-loop avoided by making each particle a separate component — the only correct Reanimated pattern for N animated items.
- Container is `position:'absolute', height:0, zIndex:10, pointerEvents:'none'` so particles float freely without affecting layout.
- `ConfettiBurst` early-returns null when `active` is false (no DOM cost while idle).

**Limitations documented:**
- Scroll-triggered per-card reveals: no IntersectionObserver in RN; mount stagger is the ceiling.
- Bezier/line sparkline: possible with SVG path interpolation but complex.
- Shared element drill-down: no shared-element library.

**Why:**
Restrained motion makes the app feel alive without being distracting. All animations are gated on meaningful state transitions (no idle loops except the scan viewfinder), spring physics match platform conventions, and haptics are scoped to confirmatory actions (save, toggle) rather than navigation taps.
