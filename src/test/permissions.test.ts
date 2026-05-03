import { describe, expect, it } from 'vitest';

import { CustomerUser } from '@shared/types/auth';

const customerUser: CustomerUser = {
  id: 101,
  name: 'Тестовый заказчик',
  email: 'customer@prohelper.pro',
  accountType: 'organization',
  companyName: 'Тестовая организация заказчика',
  role: 'customer_owner',
  roles: ['customer_owner'],
  interfaces: ['customer', 'admin'],
};

describe('customer interface bootstrap', () => {
  it('contains customer interface in mock user', () => {
    expect(customerUser.interfaces).toContain('customer');
  });

  it('contains admin interface in mock user', () => {
    expect(customerUser.interfaces).toContain('admin');
  });

  it('keeps customer role namespaced', () => {
    expect(customerUser.role.startsWith('customer_')).toBe(true);
  });

  it('stores explicit customer roles list', () => {
    expect(customerUser.roles).toContain('customer_owner');
  });
});
