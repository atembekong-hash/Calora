import { describe, expect, it } from 'vitest';
import { guestCoachReply } from '../guestCoach';

describe('guest Coach guidance', () => {
  it('answers general questions without claiming access to personal records', () => {
    const response = guestCoachReply('How can I improve protein?');

    expect(response).toContain('general guidance');
    expect(response).toContain('Sign in');
    expect(response).not.toContain('your logged protein');
  });

  it('provides a safe general fallback for unknown questions', () => {
    const response = guestCoachReply('Tell me something useful');

    expect(response).toContain('general nutrition questions');
    expect(response).toContain('cannot see your calories');
  });
});