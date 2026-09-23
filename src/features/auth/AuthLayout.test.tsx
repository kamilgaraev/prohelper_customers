// @vitest-environment jsdom
import { act, ReactNode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthLayout } from './AuthLayout';

describe('AuthLayout theme', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('follows system light and dark modes without changing the saved portal theme', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    let prefersDark = false;
    const media = {
      media: '(prefers-color-scheme: dark)',
      get matches() { return prefersDark; },
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        if (typeof listener === 'function') listeners.add(listener as (event: MediaQueryListEvent) => void);
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        if (typeof listener === 'function') listeners.delete(listener as (event: MediaQueryListEvent) => void);
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;

    localStorage.setItem('customer-theme', 'dark');
    document.documentElement.dataset.theme = 'dark';
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue(media),
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    function render(children: ReactNode) {
      act(() => root?.render(
        <AuthLayout title="Вход" description="Вход в рабочее пространство" footer={<span>Поддержка</span>}>
          {children}
        </AuthLayout>
      ));
    }

    render(<p>Форма входа</p>);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('customer-theme')).toBe('dark');
    expect(container.querySelector('.theme-toggle')).toBeNull();

    prefersDark = true;
    act(() => listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('customer-theme')).toBe('dark');

    prefersDark = false;
    act(() => listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent)));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
