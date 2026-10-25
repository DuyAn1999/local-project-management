import type { DiscoveredProject } from '../../shared/scanning';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function DiscoveredProjectDetails({ project }: { project: DiscoveredProject }) {
  return <section className="project-detail" aria-labelledby="discovered-project-heading">
    <header className="project-detail-heading"><h2 id="discovered-project-heading">{project.name}</h2><p className="path-text">{project.path}</p></header>
    <div className="tag-list" aria-label="Project technologies"><span className="tag">Node</span>{project.languages.map((language) => <span className="tag" key={language}>{language}</span>)}</div>
    <section className="detection-notice"><h3>Discovery evidence</h3><p className="subtle small">Detected from package.json. Language hints use source files directly in this project folder; deeper source inspection is coming later.</p>
      {!project.languages.length && <p className="subtle small">Source language not established. A Node manifest alone does not identify the source language.</p>}
      <details><summary>Detected files</summary><ul className="evidence-list">{project.evidence.map((entry) => <li key={entry}><code>{entry}</code></li>)}</ul></details>
    </section>
    <section className="discovery-commands"><h3>Run commands</h3><p className="subtle small" id="discovery-run-availability">Command discovery and execution are not available yet. No project code has been run.</p><Button disabled aria-describedby="discovery-run-availability"><Icon name="play" />Run</Button></section>
  </section>;
}
