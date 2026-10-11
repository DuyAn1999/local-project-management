import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import type { ProjectPresentation } from './shell-types';

export function ProjectDetails({ project }: { project?: ProjectPresentation }) {
  if (!project) {
    return <section className="project-detail welcome" aria-labelledby="welcome-heading"><div className="welcome-content">
      <div className="welcome-icon"><Icon name="folder" /><span className="welcome-plus"><Icon name="plus" /></span></div>
      <h2 id="welcome-heading">Your projects, in one place</h2>
      <p>Choose a folder to find projects<br className="desktop-break" /> and their run commands.</p>
      <Button variant="primary" disabled aria-describedby="folder-availability"><Icon name="plus" />Add folder</Button>
      <p className="availability-note" id="folder-availability">Folder selection and scanning are coming soon.</p>
      <div className="welcome-steps" aria-label="How Local Projects works"><span>Choose a folder</span><Icon name="chevron" /><span>Find a project</span><Icon name="chevron" /><span>Run a command</span></div>
    </div></section>;
  }
  return <section className="project-detail" aria-labelledby="selected-project-heading">
    <header className="project-detail-heading"><h2 id="selected-project-heading">{project.name}</h2><p className="path-text">{project.path}</p></header>
    <div className="tag-list" aria-label="Project technologies">{[...new Set([...project.languages, project.ecosystem, project.packageManager].filter(Boolean))].map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
    <section aria-labelledby="commands-heading">
      <div className="section-heading"><h3 id="commands-heading">Run commands</h3><span className="subtle small">From {project.marker}</span></div>
      <p className="availability-note" id="folder-availability">Preview only. Folder selection and scanning are unavailable.</p>
      {project.commands.length ? <>
        <ul className="command-list">{project.commands.map((command, index) => <li className="command-row" key={command.name}>
          <div className="command-info"><h4>{command.name}</h4><code>{command.invocation}</code><details><summary>Script details</summary><code>{command.body}</code></details></div>
          <Button variant={index === 0 ? 'primary' : 'secondary'} disabled aria-label={`Run ${command.name}`} aria-describedby="command-availability"><Icon name="play" />Run</Button>
        </li>)}</ul>
        <p className="availability-note" id="command-availability">Commands cannot run in this preview.</p>
        <section className="output-panel" aria-label="Run output"><div className="output-heading"><h3><Icon name="terminal" />Output</h3><span>No active run</span></div><div className="output-empty">Command output will appear here.</div></section>
      </> : <div className="detection-notice"><p>{project.ecosystem} project detected in this sample.</p><p className="subtle small">Command execution for this project type is planned for a later release.</p></div>}
    </section>
  </section>;
}
