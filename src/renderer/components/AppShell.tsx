import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useDesktopInfo } from '../hooks/useDesktopInfo';
import { useFolders } from '../hooks/useFolders';
import { useScan } from '../hooks/useScan';
import { DiscoveredProjectDetails } from './DiscoveredProjectDetails';
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
  const scan = useScan(!preview && folders.ready);
  const [projectId, setProjectId] = useState<string>();
  const discoveredProject = scan.projects.find((entry) => entry.id === projectId);
  const folderNavigation = { ...folders, select: (id: Parameters<typeof folders.select>[0]) => { setProjectId(undefined); folders.select(id); } };
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
      <Sidebar count={preview?.projects.length ?? scan.projects.length} preview={Boolean(preview?.projects.length)} folders={preview ? undefined : folderNavigation} onAdd={addFolder} />
      <main className="workspace" id="main-content" tabIndex={-1}>
        <header className="workspace-heading"><div><h1>All projects</h1><p className="subtle">A home for everything you’re building.</p></div><Button disabled aria-describedby="scan-availability"><Icon name="refresh" />Rescan</Button></header>
        <div className="project-toolbar">
          <label className="search-field"><Icon name="search" /><input type="search" placeholder="Search projects or paths…" aria-label="Search projects or paths" disabled aria-describedby="search-availability" /></label>
          <select aria-label="Filter by language" disabled aria-describedby="search-availability"><option>All languages</option></select>
          <span className="sr-only" id="search-availability">Search and filtering are coming in a later version.</span>
          <span className="sr-only" id="scan-availability">Folders are scanned when added and when the app opens. Manual rescanning is coming later.</span>
        </div>
        {!preview && <div className="folder-feedback">
          {folders.recoveryNotice && <p role="alert" className="recovery-notice">{folders.recoveryNotice}</p>}
          {folders.error && <div role="alert" className="folder-error"><p>{folders.error}</p><Button disabled={folders.busy} onClick={() => void folders.request({ protocolVersion: 1, action: 'list' })}>Retry loading folders</Button></div>}
          <p role="status" aria-label="Folder status">{folders.busy ? 'Updating folders…' : folders.notice}</p>
          {scan.status !== 'idle' && <p role="status" aria-label="Scan progress">{scan.status === 'scanning' ? 'Scanning folders' : scan.status === 'failed' ? 'Scan interrupted' : scan.issueCount ? 'Scan finished with warnings' : 'Scan complete'} · {scan.progress.directories} directories checked · {scan.progress.projects} projects found · {scan.progress.skipped} entries skipped</p>}
          {scan.error && <p role="alert">{scan.error}</p>}
          {scan.issueCount > 0 && <details className="scan-warnings"><summary>{scan.issueCount} scan warnings</summary><ul>{scan.issues.map((issue, index) => <li key={index}><span className="path-text">{issue.path}</span><p>{issue.message}</p></li>)}</ul>{scan.issueCount > scan.issues.length && <p>Showing the first {scan.issues.length} warnings.</p>}</details>}
        </div>}
        <div className="project-columns"><ProjectBrowser preview={preview} discovered={preview ? undefined : scan} selectedId={projectId} onSelect={setProjectId} />{discoveredProject && !preview ? <DiscoveredProjectDetails project={discoveredProject} /> : root && !preview
          ? <FolderDetails key={root.id} root={root} folders={folders} onRemoved={() => setFocusAddFolder(true)} />
          : <ProjectDetails project={project} onAdd={preview ? undefined : addFolder} folderBusy={folders.busy || !folders.ready} />}</div>
      </main>
    </div>
    <footer className="app-footer">
      <span>{preview ? 'Design preview · sample data only' : folders.roots.length ? `${folders.roots.length} saved folder${folders.roots.length === 1 ? '' : 's'} · Node project discovery` : 'No folder selected'}</span>
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
