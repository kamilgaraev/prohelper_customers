import { describe, expect, it } from 'vitest';

import { getAdminEntryUrl, hasAdminInterface } from '@shared/utils/interfaceAccess';

describe('interfaceAccess', () => {
  it('detects admin interface in customer session', () => {
    expect(hasAdminInterface(['customer', 'admin'])).toBe(true);
    expect(hasAdminInterface(['customer'])).toBe(false);
  });

  it('builds admin entry url with dashboard path by default', () => {
    expect(getAdminEntryUrl()).toMatch(/\/dashboard$/);
  });
});
