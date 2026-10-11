import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import type { useFolders } from '../hooks/useFolders';

export function Sidebar({ count, preview, folders, onAdd }: { count: number; preview: boolean; folders?: ReturnType<typeof useFolders>; onAdd: () => void }) {
  return (
    <aside className="sidebar" aria-label="Folders and navigation">
      <nav className="primary-navigation" aria-label="Project navigation">
        <a className="nav-item nav-item--selected" href="#main-content" aria-current="page"><Icon name="layers" /><span>All projects</span><span className="count">{count}</span></a>
        <button className="nav-item" type="button" disabled aria-describedby="run-availability"><Icon name="play" /><span>Running</span><span className="count">0</span></button>
        <span className="sr-only" id="run-availability">Project execution is not available yet.</span>
      </nav>
      <section className="folder-navigation" aria-labelledby="folders-heading">
        <h2 className="section-eyebrow" id="folders-heading">Folders</h2>
        {preview ? <div className="nav-item folder-label"><Icon name="folder" /><span>Coding <span className="subtle">(sample)</span></span></div> : folders?.roots.length ? <ul className="saved-folders">{folders.roots.map((root) => <li key={root.id}><button type="button" className={`nav-item saved-folder ${folders.selectedId === root.id ? 'nav-item--selected' : ''}`} aria-pressed={folders.selectedId === root.id} onClick={() => folders.select(root.id)} title={root.path}><Icon name="folder" /><span>{root.path.split(/[\\/]/).filter(Boolean).at(-1) || root.path}<span className="saved-folder-path">{root.path}</span>{!root.available && <span className="folder-unavailable">Unavailable</span>}</span></button></li>)}</ul> : <p className="sidebar-hint">No folders added</p>}
        <Button id="add-folder" className="add-folder-nav" variant="quiet" disabled={!folders || folders.busy || !folders.ready} onClick={onAdd}><Icon name="plus" />Add folder</Button>
      </section>
      <div className="sidebar-footer"><Icon name="device" /><div><p>Stored on this device</p><p className="subtle">No account needed</p></div></div>
    </aside>
  );
}
