import { useCallback, useEffect, useRef, useState } from 'react';
import type { FolderRequest, FolderSnapshot } from '../../shared/folders';

export function useFolders(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<FolderSnapshot>({ roots: [] });
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(enabled);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const request = useCallback(async (input: FolderRequest) => {
    if (!enabled || pending.current) return false;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await window.desktop.manageFolders(input);
      setSnapshot(result); setReady(true);
      setSelectedId((id) => result.selectedId ?? (result.roots.some((root) => root.id === id) ? id : result.roots[0]?.id));
      if (input.action === 'remove') setNotice('Folder removed from Local Projects. Files on disk were kept.');
      if (input.action === 'exclusions') setNotice('Scan exclusions saved. Project discovery is using the updated settings.');
      if (input.action === 'list') setNotice('Folder availability checked.');
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : 'Could not update folders. Try again.');
      return false;
    } finally { pending.current = false; setBusy(false); }
  }, [enabled]);
  useEffect(() => { if (enabled) void request({ protocolVersion: 1, action: 'list' }); }, [enabled, request]);
  return { ...snapshot, selectedId, select: setSelectedId, busy, ready, error, notice, request };
}
