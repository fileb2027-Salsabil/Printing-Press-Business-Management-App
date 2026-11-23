export const ACTIVE_APP_URL =
  'https://ais-pre-qzircfaw36troujsrun3k5-645511411022.asia-southeast1.run.app';

export function getSharedAppUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (origin.includes('://ais-dev-')) {
      return origin.replace('://ais-dev-', '://ais-pre-');
    }
    if (
      origin !== 'null' &&
      !origin.startsWith('file:') &&
      !origin.includes('localhost') &&
      !origin.includes('127.0.0.1')
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


