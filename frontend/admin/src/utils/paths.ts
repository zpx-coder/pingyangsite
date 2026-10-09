/** Vite's public base is /admin/ locally and /pingyang/admin/ in production. */
export const APP_BASE_PATH = import.meta.env.BASE_URL.replace(/\/admin\/$/, '');

export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  const oldLocalUpload = /^https?:\/\/(?:localhost|127\.0\.0\.1):18080(\/uploads\/.*)$/.exec(url);
  if (oldLocalUpload) return `${APP_BASE_PATH}${oldLocalUpload[1]}`;
  return url.startsWith('/img/') || url.startsWith('/uploads/') ? `${APP_BASE_PATH}${url}` : url;
}
