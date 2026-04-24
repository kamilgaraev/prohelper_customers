import { describe, expect, it } from 'vitest';

import { mockCustomerUser } from '@shared/api/mockData';

describe('customer interface bootstrap', () => {
  it('contains customer interface in mock user', () => {
    expect(mockCustomerUser.interfaces).toContain('customer');
  });

  it('contains admin interface in mock user', () => {
    expect(mockCustomerUser.interfaces).toContain('admin');
  });

  it('keeps customer role namespaced', () => {
    expect(mockCustomerUser.role.startsWith('customer_')).toBe(true);
  });

  it('stores explicit customer roles list', () => {
    expect(mockCustomerUser.roles).toContain('customer_owner');
  });
});
