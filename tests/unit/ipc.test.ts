import { describe, expect, it } from 'vitest';
import { handleAppInfo, isTrustedRendererUrl } from '../../src/main/ipc';
import type { SenderContext } from '../../src/main/ipc';
import type { AppInfo } from '../../src/shared/contracts';

const url = 'file:///Applications/Local%20Projects.app/Contents/Resources/app.asar/.vite/renderer/main_window/index.html';
const sender: SenderContext = { isAppWindow: true, isMainFrame: true, frameUrl: url, expectedUrl: url };
const info: AppInfo = { name: 'Local Projects', version: '0.1.0', platform: 'darwin', packaged: true };

describe('app info IPC boundary', () => {
  it('returns app metadata for the owned main frame and protocol version', () => {
    expect(handleAppInfo(sender, [{ protocolVersion: 1 }], info)).toEqual(info);
  });

  it.each([
    undefined, null, [], {}, '1', 1, { protocolVersion: '1' }, { protocolVersion: 2 },
    { protocolVersion: 1, command: 'execute' },
  ])('rejects malformed or extra request fields: %j', (request) => {
    expect(() => handleAppInfo(sender, [request], info)).toThrow('Invalid app info request');
  });

  it('rejects missing or extra positional arguments', () => {
    expect(() => handleAppInfo(sender, [], info)).toThrow('Invalid app info request');
    expect(() => handleAppInfo(sender, [{ protocolVersion: 1 }, 'extra'], info)).toThrow('Invalid app info request');
  });

  it.each([
    { isAppWindow: false }, { isMainFrame: false }, { frameUrl: '' },
    { frameUrl: 'https://example.com/' }, { frameUrl: url + '?untrusted=1' },
    { frameUrl: url.replace('index.html', 'other.html') },
  ])('rejects an untrusted caller: %j', (override) => {
    expect(() => handleAppInfo({ ...sender, ...override }, [{ protocolVersion: 1 }], info)).toThrow('Untrusted IPC sender');
  });
});

describe('renderer URL validation', () => {
  it('allows in-document hashes without accepting another document', () => {
    expect(isTrustedRendererUrl(url + '#projects', url)).toBe(true);
    expect(isTrustedRendererUrl('not a URL', url)).toBe(false);
  });

  it.each([
    'http://127.0.0.1:5174/', 'http://127.0.0.1:5173/other',
    'http://127.0.0.1:5173.evil.test/', 'https://127.0.0.1:5173/',
  ])('rejects a mismatched development URL: %s', (actual) => {
    expect(isTrustedRendererUrl(actual, 'http://127.0.0.1:5173/')).toBe(false);
  });
});
