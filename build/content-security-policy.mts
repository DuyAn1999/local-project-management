export const DEV_SERVER_ORIGIN = 'http://127.0.0.1:5173';

export function contentSecurityPolicy(development: boolean): string {
  return [
    "default-src 'none'",
    // Vite's React Refresh preamble and injected styles are development-only.
    `script-src 'self'${development ? " 'unsafe-inline'" : ''}`,
    `style-src 'self'${development ? " 'unsafe-inline'" : ''}`,
    "img-src 'self' data:",
    "font-src 'self'",
    development
      ? `connect-src 'self' ${DEV_SERVER_ORIGIN} ws://127.0.0.1:5173`
      : "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
  ].join('; ');
}
