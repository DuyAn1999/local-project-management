import { useEffect, useState } from 'react';
import type { AppInfo } from '../shared/contracts';

export function App() {
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

  return (
    <main>
      <p className="eyebrow">DESKTOP FOUNDATION</p>
      <h1>Local Projects</h1>
      <p className="intro">A home for everything you’re building.</p>
      <section aria-label="Application status">
        {error ? (
          <p role="alert">Could not connect to the desktop app. Close and reopen the app to try again.</p>
        ) : (
          <p role="status">{info ? 'Desktop connection ready' : 'Connecting to desktop…'}</p>
        )}
        {info && <p className="metadata">Version {info.version} · {info.packaged ? 'Packaged app' : 'Development'} · {info.platform}</p>}
      </section>
      <p className="next">Folder selection and project discovery are coming in the next checkpoints.</p>
    </main>
  );
}
