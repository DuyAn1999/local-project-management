import { Icon } from '../ui/Icon';
import type { DesignPreview } from './shell-types';
import type { DiscoveredProject, ScanSnapshot } from '../../shared/scanning';

export function ProjectBrowser({ preview, discovered, selectedId, onSelect }: { preview?: DesignPreview; discovered?: ScanSnapshot; selectedId?: string; onSelect?: (id: string) => void }) {
  const projects = preview?.projects ?? discovered?.projects ?? [];
  return (
    <section className="project-browser" aria-label="Projects">
      <div className="list-heading"><h2>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</h2><span>Name ↑</span></div>
      {projects.length ? <ul className="project-list">{projects.map((project) => <li key={project.id}>
        <button type="button" className="project-row" aria-pressed={(preview?.selectedId ?? selectedId) === project.id} onClick={() => preview ? preview.onSelect(project.id) : onSelect?.(project.id)}>
          <span className="project-row-title"><Icon name="folder" /><span>{project.name}</span></span>
          <span className="project-path">{project.path}</span>
          <span className="project-row-meta"><span>{project.languages.join(' · ') || 'Language not established'}</span><span>{preview ? 'Idle' : (project as DiscoveredProject).ecosystem}</span></span>
        </button>
      </li>)}</ul> : <div className="list-empty"><Icon name="folder" /><p>{discovered?.status === 'scanning' ? 'Looking for Node projects…' : discovered?.status === 'complete' ? 'No Node projects found' : 'No projects yet'}</p><p className="subtle">{discovered?.status === 'complete' ? 'Check your folders and scan exclusions. Other project types are not detected yet.' : 'Projects from your folders will appear here.'}</p></div>}
    </section>
  );
}
