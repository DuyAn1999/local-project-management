import type { AppInfo } from '../shared/contracts';
import { isAppInfoRequest } from '../shared/contracts';

export interface SenderContext {
  isAppWindow: boolean;
  isMainFrame: boolean;
  frameUrl: string;
  expectedUrl: string;
}

export function isTrustedRendererUrl(actual: string, expected: string): boolean {
  try {
    const actualUrl = new URL(actual);
    const expectedUrl = new URL(expected);
    // Hash navigation is in-document. Query strings and other documents are not trusted.
    actualUrl.hash = '';
    expectedUrl.hash = '';
    return actualUrl.href === expectedUrl.href;
  } catch {
    return false;
  }
}

export function handleAppInfo(
  sender: SenderContext,
  args: readonly unknown[],
  info: AppInfo,
): AppInfo {
  assertTrustedSender(sender);
  if (args.length !== 1 || !isAppInfoRequest(args[0])) {
    throw new Error('Invalid app info request');
  }
  return { ...info };
}

export function assertTrustedSender(sender: SenderContext): void {
  if (!sender.isAppWindow || !sender.isMainFrame
    || !isTrustedRendererUrl(sender.frameUrl, sender.expectedUrl)) {
    throw new Error('Untrusted IPC sender');
  }
}
