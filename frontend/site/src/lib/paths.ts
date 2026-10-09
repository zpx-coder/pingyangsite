/** Browser-facing paths include the deployment prefix; server-to-server API paths do not. */
export const APP_BASE_PATH = (process.env.NEXT_PUBLIC_APP_BASE_PATH ?? '').replace(/\/+$/, '');

export function browserPath(path: string): string {
  return path.startsWith('/') ? `${APP_BASE_PATH}${path}` : path;
}

/** Existing database rows can contain root-relative /img and /uploads URLs. */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  const oldLocalUpload = /^https?:\/\/(?:localhost|127\.0\.0\.1):18080(\/uploads\/.*)$/.exec(url);
  if (oldLocalUpload) return browserPath(oldLocalUpload[1]);
  return url.startsWith('/img/') || url.startsWith('/uploads/') ? browserPath(url) : url;
}

/** Rich content saved before the prefixed deployment may contain root-relative media. */
export function mediaHtml(html: string): string {
  if (!APP_BASE_PATH) return html;
  return html
    .replace(/(\b(?:src|poster)=["'])\/(img|uploads)\//gi, `$1${APP_BASE_PATH}/$2/`)
    .replace(
      /(\b(?:src|poster)=["'])https?:\/\/(?:localhost|127\.0\.0\.1):18080(\/uploads\/)/gi,
      `$1${APP_BASE_PATH}$2`,
    );
}
