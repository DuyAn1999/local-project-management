import { useEffect, useState } from 'react';
import type { AppInfo } from '../../shared/contracts';

export function useDesktopInfo() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function connect() {
      try {
        const result = await window.desktop.getAppInfo({ protocolVersion: 1 });
        if (!cancelled) setInfo(result);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    void connect();
    return () => { cancelled = true; };
  }, []);
  return { info, error };
}
