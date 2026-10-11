import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import type { ProjectPresentation } from '../components/shell-types';

const projects: readonly ProjectPresentation[] = [
  { id: 'atlas', name: 'atlas-web', path: '~/Coding/atlas-web', languages: ['TypeScript'], ecosystem: 'Node.js', marker: 'package.json', packageManager: 'pnpm', commands: [
    { name: 'dev', invocation: 'pnpm run dev', body: 'vite' },
    { name: 'build', invocation: 'pnpm run build', body: 'tsc -b && vite build' },
    { name: 'test', invocation: 'pnpm run test', body: 'vitest run' },
  ] },
  { id: 'billing', name: 'billing-api', path: '~/Coding/billing-api', languages: ['TypeScript'], ecosystem: 'Node.js', marker: 'package.json', packageManager: 'npm', commands: [{ name: 'dev', invocation: 'npm run dev', body: 'tsx watch src/server.ts' }] },
  { id: 'notes', name: 'field-notes', path: '~/Coding/field-notes', languages: ['JavaScript'], ecosystem: 'Node.js', marker: 'package.json', packageManager: 'npm', commands: [{ name: 'dev', invocation: 'npm run dev', body: 'astro dev' }] },
  { id: 'image', name: 'image-pipeline', path: '~/Coding/image-pipeline', languages: ['Python'], ecosystem: 'Python', marker: 'pyproject.toml', commands: [] },
];
const longProject: ProjectPresentation = {
  id: 'long', name: 'customer-analytics-and-reporting-workspace-with-a-very-long-name',
  path: '/Users/developer/Coding/client-projects/Customer Success/Ứng dụng thử nghiệm/customer-analytics-and-reporting-workspace/packages/administration-dashboard',
  languages: ['TypeScript'], ecosystem: 'Node.js', marker: 'package.json', packageManager: 'pnpm',
  commands: [{ name: 'development:administration-dashboard', invocation: 'pnpm run development:administration-dashboard', body: 'vite --config config/development/administration-dashboard.vite.config.ts --host 127.0.0.1' }],
};

export function DesignPreview() {
  const [scenario, setScenario] = useState('populated');
  const [selectedId, setSelectedId] = useState('atlas');
  const displayed = (scenario === 'empty' ? [] : scenario === 'long' ? [longProject, ...projects] : projects)
    .toSorted((a, b) => a.name.localeCompare(b.name));
  const selection = displayed.some((p) => p.id === selectedId) ? selectedId : displayed[0]?.id ?? '';
  return <AppShell preview={{ projects: displayed, selectedId: selection, onSelect: setSelectedId }} previewToolbar={
    <section className="preview-toolbar" aria-label="Development design preview">
      <div><strong>Design preview</strong><span>Sample data only. No folders are read or commands run.</span></div>
      <label>Scenario<select value={scenario} onChange={(event) => { setScenario(event.target.value); setSelectedId(event.target.value === 'long' ? 'long' : 'atlas'); }}><option value="populated">Populated</option><option value="empty">First use</option><option value="long">Long names and paths</option></select></label>
    </section>
  } />;
}
