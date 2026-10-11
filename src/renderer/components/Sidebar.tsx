import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function Sidebar({ count, preview }: { count: number; preview: boolean }) {
  return (
    <aside className="sidebar" aria-label="Folders and navigation">
      <nav className="primary-navigation" aria-label="Project navigation">
        <a className="nav-item nav-item--selected" href="#main-content" aria-current="page"><Icon name="layers" /><span>All projects</span><span className="count">{count}</span></a>
        <button className="nav-item" type="button" disabled aria-describedby="run-availability"><Icon name="play" /><span>Running</span><span className="count">0</span></button>
        <span className="sr-only" id="run-availability">Project execution is not available yet.</span>
      </nav>
      <section className="folder-navigation" aria-labelledby="folders-heading">
        <h2 className="section-eyebrow" id="folders-heading">Folders</h2>
        {preview ? <div className="nav-item folder-label"><Icon name="folder" /><span>Coding <span className="subtle">(sample)</span></span></div> : <p className="sidebar-hint">No folders added</p>}
        <Button className="add-folder-nav" variant="quiet" disabled aria-describedby="folder-availability"><Icon name="plus" />Add folder</Button>
      </section>
      <div className="sidebar-footer"><Icon name="device" /><div><p>Stored on this device</p><p className="subtle">No account needed</p></div></div>
    </aside>
  );
}
