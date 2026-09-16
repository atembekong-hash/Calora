import { describe, expect, it } from 'vitest';
import { PLAN_TYPES } from '../planType';
import {
  applyProgram,
  closeProgramModal,
  CLOSED_PROGRAM_MODAL,
  openProgramSelector,
  selectProgram,
} from '../programModalState';

describe('program modal state', () => {
  it('transitions from selector to detail without opening a second modal', () => {
    const selector = openProgramSelector();
    const detail = selectProgram(selector, PLAN_TYPES[0]);

    expect(detail.selectorVisible).toBe(true);
    expect(detail.detail?.id).toBe(PLAN_TYPES[0].id);
    expect(closeProgramModal(detail)).toEqual(selector);
  });

  it('closes the single modal after apply', () => {
    const detail = selectProgram(openProgramSelector(), PLAN_TYPES[0]);
    expect(applyProgram(detail)).toEqual(CLOSED_PROGRAM_MODAL);
  });
});