import { intelligenceFeatureFlags } from './featureFlags';
import type { IntelligenceObservabilityEvent } from './types';
import type { IntelligencePerformanceSample } from './types';

export type IntelligenceObserver = (event: IntelligenceObservabilityEvent) => void;

let observer: IntelligenceObserver | null = null;

/** Test/development hook only. It receives metadata, never user food content. */
export function setIntelligenceObserver(next: IntelligenceObserver | null): void {
  observer = next;
}

export function reportIntelligenceEvent(event: Omit<IntelligenceObservabilityEvent, 'featureFlags'>): void {
  observer?.({ ...event, featureFlags: { ...intelligenceFeatureFlags } });
}

/** Lightweight local timing seam for development and deterministic test measurements. */
export function measureIntelligenceOperation<T>(
  operation: IntelligencePerformanceSample['operation'],
  work: () => T,
  now: () => number = () => (globalThis.performance?.now?.() ?? Date.now()),
): { value: T; sample: IntelligencePerformanceSample } {
  const startedAt = now();
  const value = work();
  return { value, sample: { operation, durationMs: Math.max(0, now() - startedAt) } };
}