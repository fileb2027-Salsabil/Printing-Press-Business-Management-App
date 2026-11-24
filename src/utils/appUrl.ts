export const ACTIVE_APP_URL = 'https://pressmanagement.vercel.app';

export function getSharedAppUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (
      origin &&
      origin !== 'null' &&
      !origin.startsWith('file:') &&
      !origin.includes('localhost') &&
      !origin.includes('127.0.0.1') &&
      !origin.includes('://ais-dev-')
    ) {
      return origin;
    }
  }
  return ACTIVE_APP_URL;
}

export function getCurrentOriginUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (origin && origin !== 'null' && !origin.startsWith('file:')) {
      return origin;
    }
  }
  return ACTIVE_APP_URL;
}

export function isDevPreviewOrigin(url?: string): boolean {
  const target = url ?? getCurrentOriginUrl();
  return target.includes('://ais-dev-');
}

export function getCleanAppUrl(): string {
  return getSharedAppUrl();
}



