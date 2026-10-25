import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import type { SavedRoot } from '../shared/folders';
import type { DiscoveredProject, ScanSnapshot, ScanUpdate } from '../shared/scanning';
import type { ScannerBatch } from './scanner';

export class ScanService {
  private worker?: Worker;
  private configuration?: string;
  private projects = new Map<string, DiscoveredProject>();
  private state: ScanSnapshot = { scanId: '', revision: 0, status: 'idle', projects: [], progress: { directories: 0, projects: 0, skipped: 0 }, issues: [], issueCount: 0 };
  constructor(private readonly workerFile: string, private readonly publish: (update: ScanUpdate) => void) {}

  ensure(roots: readonly SavedRoot[]): ScanSnapshot {
    const configuration = JSON.stringify(roots.map(({ id, path, exclusions }) => ({ id, path, exclusions })));
    if (configuration === this.configuration) return this.snapshot();
    this.configuration = configuration;
    this.dispose(); this.projects.clear();
    const scanId = randomUUID();
    this.state = { scanId, revision: this.state.revision + 1, status: roots.length ? 'scanning' : 'idle', projects: [], progress: { directories: 0, projects: 0, skipped: 0 }, issues: [], issueCount: 0 };
    this.publish(this.state);
    if (!roots.length) return this.snapshot();
    const finish = (status: 'complete' | 'failed') => {
      if (this.state.scanId !== scanId || this.state.status !== 'scanning') return;
      this.state = { ...this.state, revision: this.state.revision + 1, status, projects: [], ...(status === 'failed' ? { error: 'Project scanning stopped unexpectedly. Reopen the app to try again.' } : {}) };
      this.publish(this.state);
    };
    try {
      const worker = new Worker(this.workerFile, { workerData: structuredClone(roots) });
      this.worker = worker;
      worker.on('message', (message: { type: 'batch'; batch: ScannerBatch } | { type: 'complete' | 'failed' }) => {
        if (this.state.scanId !== scanId || this.state.status !== 'scanning') return;
        if (message.type === 'batch') {
          for (const project of message.batch.projects) this.projects.set(project.id, project);
          this.state = { ...this.state, ...message.batch, revision: this.state.revision + 1 };
          this.publish(this.state);
        } else finish(message.type);
      });
      worker.on('error', () => finish('failed'));
      worker.on('exit', () => {
        if (this.worker === worker) this.worker = undefined;
        // A worker exiting before its completion message is always an incomplete scan.
        finish('failed');
      });
    } catch { finish('failed'); }
    return this.snapshot();
  }

  snapshot(): ScanSnapshot { return { ...this.state, projects: [...this.projects.values()] }; }
  dispose(): void { const worker = this.worker; this.worker = undefined; if (worker) void worker.terminate(); }
}
