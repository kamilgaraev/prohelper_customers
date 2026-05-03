import { describe, expect, it } from 'vitest';

import { CONVERSATIONS_EMPTY_TEXT } from '@features/conversations/ConversationsPage';

describe('ConversationsPage copy', () => {
  it('uses business wording for empty conversations state', () => {
    expect(CONVERSATIONS_EMPTY_TEXT).toBe('По доступным проектам пока нет активных сообщений.');
    expect(CONVERSATIONS_EMPTY_TEXT).not.toMatch(/backend|endpoint|модул/i);
  });
});
