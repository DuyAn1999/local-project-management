import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useDesktopInfo } from '../hooks/useDesktopInfo';
import { useFolders } from '../hooks/useFolders';
import { FolderDetails } from './FolderDetails';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Sidebar } from './Sidebar';
import { ProjectBrowser } from './ProjectBrowser';
import { ProjectDetails } from './ProjectDetails';
import type { DesignPreview } from './shell-types';

export function AppShell({ preview, previewToolbar }: { preview?: DesignPreview; previewToolbar?: ReactNode }) {
  const { info, error } = useDesktopInfo();
  const folders = useFolders(!preview);
  const [focusAddFolder, setFocusAddFolder] = useState(false);
  useEffect(() => {
    if (focusAddFolder && !folders.busy) {
      document.getElementById('add-folder')?.focus();
      setFocusAddFolder(false);
    }
  }, [focusAddFolder, folders.busy]);
  const root = folders.roots.find((item) => item.id === folders.selectedId);
  const addFolder = () => { void folders.request({ protocolVersion: 1, action: 'add' }); };
  const project = preview?.projects.find((item) => item.id === preview.selectedId);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to projects</a>
    <header className="app-chrome"><div className="brand"><Icon name="layers" /><span>Local Projects</span></div><span className="chrome-label">Your local workspace</span></header>
    {previewToolbar}
    <div className="shell-body">
      <Sidebar count={preview?.projects.length ?? 0} preview={Boolean(preview?.projects.length)} folders={preview ? undefined : folders} onAdd={addFolder} />
      <main className="workspace" id="main-content" tabIndex={-1}>
        <header className="workspace-heading"><div><h1>All projects</h1><p className="subtle">A home for everything you’re building.</p></div><Button disabled aria-describedby="scan-availability"><Icon name="refresh" />Rescan</Button></header>
        <div className="project-toolbar">
          <label className="search-field"><Icon name="search" /><input type="search" placeholder="Search projects or paths…" aria-label="Search projects or paths" disabled aria-describedby="search-availability" /></label>
          <select aria-label="Filter by language" disabled aria-describedby="search-availability"><option>All languages</option></select>
          <span className="sr-only" id="search-availability">Search and filtering will be available after project discovery is added.</span>
          <span className="sr-only" id="scan-availability">Project scanning is not available yet.</span>
        </div>
        {!preview && <div className="folder-feedback">
          {folders.recoveryNotice && <p role="alert" className="recovery-notice">{folders.recoveryNotice}</p>}
          {folders.error && <div role="alert" className="folder-error"><p>{folders.error}</p><Button disabled={folders.busy} onClick={() => void folders.request({ protocolVersion: 1, action: 'list' })}>Retry loading folders</Button></div>}
          <p role="status" aria-label="Folder status">{folders.busy ? 'Updating folders…' : folders.notice}</p>
        </div>}
        <div className="project-columns"><ProjectBrowser preview={preview} />{root && !preview
          ? <FolderDetails key={root.id} root={root} folders={folders} onRemoved={() => setFocusAddFolder(true)} />
          : <ProjectDetails project={project} onAdd={preview ? undefined : addFolder} folderBusy={folders.busy || !folders.ready} />}</div>
      </main>
    </div>
    <footer className="app-footer">
      <span>{preview ? 'Design preview · sample data only' : folders.roots.length ? `${folders.roots.length} saved folder${folders.roots.length === 1 ? '' : 's'} · Scanning not available yet` : 'No folder selected'}</span>
      <div className="connection-status">
        {error ? <span role="alert">Desktop connection unavailable. Reopen the app to retry.</span> : <span role="status" aria-label="Desktop connection"><span className={`status-dot ${info ? 'status-dot--ready' : ''}`} aria-hidden="true" />{info ? 'Desktop connection ready' : 'Connecting to desktop…'}</span>}
        {info && <span className="version">v{info.version}</span>}
        {import.meta.env.DEV && <a href={preview ? '#' : '#design-preview'} onClick={(event) => {
          event.preventDefault();
          window.location.hash = preview ? '' : 'design-preview';
          window.location.reload();
        }}>{preview ? 'Exit design preview' : 'Design preview'}</a>}
      </div>
    </footer>
  </div>;
}
