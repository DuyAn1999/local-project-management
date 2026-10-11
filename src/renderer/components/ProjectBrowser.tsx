import { Icon } from '../ui/Icon';
import type { DesignPreview } from './shell-types';

export function ProjectBrowser({ preview }: { preview?: DesignPreview }) {
  const projects = preview?.projects ?? [];
  return (
    <section className="project-browser" aria-label="Projects">
      <div className="list-heading"><h2>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</h2><span>Name ↑</span></div>
      {projects.length ? <ul className="project-list">{projects.map((project) => <li key={project.id}>
        <button type="button" className="project-row" aria-pressed={preview?.selectedId === project.id} onClick={() => preview?.onSelect(project.id)}>
          <span className="project-row-title"><Icon name="folder" /><span>{project.name}</span></span>
          <span className="project-path">{project.path}</span>
          <span className="project-row-meta"><span>{project.languages.join(' · ')}</span><span>Idle</span></span>
        </button>
      </li>)}</ul> : <div className="list-empty"><Icon name="folder" /><p>No projects yet</p><p className="subtle">Projects from your folders<br />will appear here.</p></div>}
    </section>
  );
}
