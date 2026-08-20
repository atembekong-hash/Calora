import { intelligenceFeatureFlags } from './featureFlags';
import type { IntelligenceObservabilityEvent } from './types';

export type IntelligenceObserver = (event: IntelligenceObservabilityEvent) => void;

let observer: IntelligenceObserver | null = null;

/** Test/development hook only. It receives metadata, never user food content. */
export function setIntelligenceObserver(next: IntelligenceObserver | null): void {
  observer = next;
}

export function reportIntelligenceEvent(event: Omit<IntelligenceObservabilityEvent, 'featureFlags'>): void {
  observer?.({ ...event, featureFlags: { ...intelligenceFeatureFlags } });
}