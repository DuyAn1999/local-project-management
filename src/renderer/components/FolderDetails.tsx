import { useState } from 'react';
import { DEFAULT_EXCLUSIONS, isExclusions } from '../../shared/folders';
import type { FolderSnapshot } from '../../shared/folders';
import type { useFolders } from '../hooks/useFolders';
import { Button } from '../ui/Button';

export function FolderDetails({ root, folders, onRemoved }: { root: FolderSnapshot['roots'][number]; folders: ReturnType<typeof useFolders>; onRemoved: () => void }) {
  const [draft, setDraft] = useState(root.exclusions.join('\n'));
  const exclusions = [...new Set(draft.split('\n').map((line) => line.trim()).filter(Boolean))];
  const valid = isExclusions(exclusions);
  const changed = JSON.stringify(exclusions) !== JSON.stringify(root.exclusions);
  const name = root.path.split(/[\\/]/).filter(Boolean).at(-1) || root.path;
  return <section className="project-detail folder-details" aria-labelledby="folder-detail-heading">
    <header className="project-detail-heading"><span className="section-eyebrow">Saved folder</span><h2 id="folder-detail-heading">{name}</h2><p className="path-text">{root.path}</p></header>
    <div className={`folder-status ${root.available ? '' : 'folder-status--unavailable'}`}>
      <h3>{root.available ? 'Ready for project discovery' : 'This folder is no longer available.'}</h3>
      <p>{root.available ? 'Your folder is saved. Project scanning is not available in this version.' : 'It may have moved, been disconnected, or lost access. Choose its current location or check again.'}</p>
      <div className="folder-actions">
        {!root.available && <Button variant="primary" disabled={folders.busy} onClick={() => void folders.request({ protocolVersion: 1, action: 'locate', id: root.id })}>Locate folder</Button>}
        <Button disabled={folders.busy} onClick={() => void folders.request({ protocolVersion: 1, action: 'list' })}>Check availability</Button>
      </div>
    </div>
    <form className="exclusions-form" onSubmit={(event) => { event.preventDefault(); if (valid && changed) void folders.request({ protocolVersion: 1, action: 'exclusions', id: root.id, exclusions }); }}>
      <label htmlFor="scan-exclusions">Scan exclusions</label>
      <p className="subtle small" id="exclusions-help">Skip these directory names inside this folder. One name per line, matched exactly at any depth; paths and wildcards are not supported. An empty list excludes nothing.</p>
      <textarea id="scan-exclusions" rows={7} value={draft} disabled={folders.busy} spellCheck={false} aria-describedby="exclusions-help exclusions-validation" aria-invalid={!valid} onChange={(event) => setDraft(event.target.value)} />
      <p className="small" id="exclusions-validation">{!valid ? 'Use up to 100 directory names, each at most 255 characters, without paths, wildcards, or control characters.' : changed ? 'Unsaved changes' : 'All changes saved'}</p>
      <div className="folder-actions"><Button variant="primary" type="submit" disabled={folders.busy || !changed || !valid}>Save exclusions</Button><Button disabled={folders.busy} onClick={() => setDraft(DEFAULT_EXCLUSIONS.join('\n'))}>Use defaults</Button></div>
    </form>
    <section className="remove-folder"><h3>Remove from Local Projects</h3><p className="subtle small">Removes this saved location and its settings. Your files stay on disk.</p><Button disabled={folders.busy} onClick={async () => {
      if (await folders.request({ protocolVersion: 1, action: 'remove', id: root.id })) onRemoved();
    }}>Remove folder</Button></section>
  </section>;
}
