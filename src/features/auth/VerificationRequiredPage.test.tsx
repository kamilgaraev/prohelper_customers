// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@shared/contexts/AuthContext';
import { savePendingVerification } from '@shared/api/storage';

import { LoginPage } from './LoginPage';
import { VerificationRequiredPage } from './VerificationRequiredPage';

vi.mock('@shared/api/authService', () => ({
  authService: {
    restoreSession: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    resendVerification: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('VerificationRequiredPage', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    sessionStorage.clear();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('returns to login and clears pending verification', async () => {
    savePendingVerification({
      status: 'verification_required',
      email: 'customer-test@example.invalid',
      canEnterPortal: false,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/verification-required']}>
            <Routes>
              <Route path="/verification-required" element={<VerificationRequiredPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );
    });

    const returnControl = [...container.querySelectorAll('a, button')].find(
      (element) => element.textContent === 'Вернуться ко входу'
    );
    expect(returnControl).toBeDefined();

    await act(async () => {
      (returnControl as HTMLElement).click();
    });

    expect(container.querySelector('h1')?.textContent).toBe('Кабинет участника МОСТ');
    expect(sessionStorage.getItem('most.customer.pending_verification')).toBeNull();
  });
});
