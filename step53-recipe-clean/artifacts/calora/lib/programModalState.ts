import type { PlanType } from './planType';

export type ProgramModalState = {
  selectorVisible: boolean;
  detail: PlanType | null;
};

export const CLOSED_PROGRAM_MODAL: ProgramModalState = {
  selectorVisible: false,
  detail: null,
};

export function openProgramSelector(): ProgramModalState {
  return { selectorVisible: true, detail: null };
}

export function selectProgram(
  state: ProgramModalState,
  program: PlanType,
): ProgramModalState {
  return { selectorVisible: true, detail: program };
}

export function closeProgramModal(state: ProgramModalState): ProgramModalState {
  return state.detail
    ? { selectorVisible: true, detail: null }
    : CLOSED_PROGRAM_MODAL;
}

export function applyProgram(state: ProgramModalState): ProgramModalState {
  if (!state.detail) return state;
  return CLOSED_PROGRAM_MODAL;
}