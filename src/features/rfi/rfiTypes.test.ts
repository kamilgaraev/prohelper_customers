import { describe, expect, it } from 'vitest';

import { rfiHasAction } from './rfiTypes';

describe('RFI available actions', () => {
  it('uses the backend request_clarification action key', () => {
    const actions = ['request_clarification'];

    expect(rfiHasAction(actions, 'request_clarification')).toBe(true);
    expect(rfiHasAction(actions, 'clarification')).toBe(false);
  });
});
