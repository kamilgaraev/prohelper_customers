import { env } from '@shared/config/env';

export function hasInterface(interfaces: string[] | null | undefined, target: string): boolean {
  return (interfaces ?? []).includes(target);
}

export function hasAdminInterface(interfaces: string[] | null | undefined): boolean {
  return hasInterface(interfaces, 'admin');
}

export function getAdminEntryUrl(path = '/dashboard'): string {
  const baseUrl = env.adminAppUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}
