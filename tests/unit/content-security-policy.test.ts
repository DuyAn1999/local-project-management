import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from '../../build/content-security-policy.mts';

describe('content policy', () => {
  it('blocks inline code, eval, frames and network connections in packaged builds', () => {
    const policy = contentSecurityPolicy(false);
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("frame-src 'none'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval|https?:|wss?:/);
  });

  it('limits development connectivity to the loopback HMR server without enabling eval', () => {
    const policy = contentSecurityPolicy(true);
    expect(policy).toContain('http://127.0.0.1:5173 ws://127.0.0.1:5173');
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).not.toContain('*');
  });
});
