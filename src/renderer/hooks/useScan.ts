import { useEffect, useState } from 'react';
import type { ScanSnapshot, ScanUpdate } from '../../shared/scanning';

const initial: ScanSnapshot = { scanId: '', revision: -1, status: 'idle', projects: [], progress: { directories: 0, projects: 0, skipped: 0 }, issues: [], issueCount: 0 };
export function mergeScanUpdate(current: ScanSnapshot, update: ScanUpdate): ScanSnapshot {
  if (update.revision <= current.revision) return current;
  const projects = new Map((update.scanId === current.scanId ? current.projects : []).map((project) => [project.id, project]));
  for (const project of update.projects) projects.set(project.id, project);
  return { ...update, projects: [...projects.values()].sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path)) };
}

export function useScan(enabled: boolean) {
  const [scan, setScan] = useState(initial);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let hydrated = false;
    const buffered: ScanUpdate[] = [];
    const unsubscribe = window.desktop.onScanUpdate((update) => {
      if (!alive) return;
      if (!hydrated) buffered.push(update);
      else setScan((current) => mergeScanUpdate(current, update));
    });
    void window.desktop.scanProjects({ protocolVersion: 1 }).then((snapshot) => {
      if (!alive) return;
      let current = mergeScanUpdate(initial, snapshot);
      for (const update of buffered) current = mergeScanUpdate(current, update);
      hydrated = true; buffered.length = 0;
      setScan(current);
    }).catch(() => {
      if (alive) setScan({ ...initial, status: 'failed', error: 'Could not load project discovery. Reopen the app to try again.' });
    });
    return () => { alive = false; unsubscribe(); };
  }, [enabled]);
  return scan;
}
