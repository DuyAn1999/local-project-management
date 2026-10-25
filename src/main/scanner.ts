import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, opendir, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { SavedRoot } from '../shared/folders';
import type { DiscoveredProject, ScanIssue, ScanProgress } from '../shared/scanning';

export const MAX_MANIFEST_BYTES = 1024 * 1024;
export const SCAN_CONCURRENCY = 8;
const MAX_PENDING_DIRECTORIES = 100_000;
const MAX_PROJECTS = 50_000;
const MAX_EVIDENCE_FILES = 200;
export interface ScannerBatch { projects: DiscoveredProject[]; progress: ScanProgress; issues: ScanIssue[]; issueCount: number }

export async function scanRoots(roots: readonly SavedRoot[], emit: (batch: ScannerBatch) => void): Promise<void> {
  const progress: ScanProgress = { directories: 0, projects: 0, skipped: 0 };
  const projects = new Map<string, DiscoveredProject>();
  let batch: DiscoveredProject[] = [];
  const issues: ScanIssue[] = [];
  let issueCount = 0;
  let lastEmission = 0;
  const report = (location: string, message: string) => {
    issueCount++;
    if (issues.length < 100) issues.push({ path: location, message });
  };
  const flush = (force = false) => {
    if (!force && batch.length < 50 && Date.now() - lastEmission < 100) return;
    emit({ projects: batch, progress: { ...progress }, issues: [...issues], issueCount });
    batch = []; lastEmission = Date.now();
  };
  const timer = setInterval(() => flush(), 100);
  try {
    for (const root of roots) {
      const exclusions = new Set(root.exclusions);
      const pending = [root.path];
      const visited = new Set<string>();
      const inspect = async (directory: string) => {
        try {
          // Recheck queued entries: a directory may have become a symlink since enumeration.
          if (!(await lstat(directory)).isDirectory()) { progress.skipped++; return; }
          const canonical = await realpath(directory);
          const relative = path.relative(root.path, canonical);
          if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) { progress.skipped++; return; }
          if (visited.has(canonical)) return;
          visited.add(canonical);
          const files: string[] = [];
          let manifest = false;
          const entries = await opendir(canonical);
          for await (const entry of entries) {
            if (entry.isSymbolicLink()) { progress.skipped++; continue; }
            if (entry.isDirectory()) {
              if (exclusions.has(entry.name)) { progress.skipped++; continue; }
              if (pending.length >= MAX_PENDING_DIRECTORIES) {
                progress.skipped++; report(canonical, 'Directory queue limit reached; some directories were skipped.'); continue;
              }
              pending.push(path.join(canonical, entry.name));
            } else if (entry.isFile()) {
              if (entry.name === 'package.json') manifest = true;
              // CP04 uses direct source files only; recursive language evidence arrives in CP06.
              if (files.length < MAX_EVIDENCE_FILES && /\.(?:[cm]?jsx?|[cm]?tsx?)$/.test(entry.name)) files.push(entry.name);
            }
          }
          progress.directories++;
          if (!manifest) { flush(); return; }
          const marker = path.join(canonical, 'package.json');
          let data: unknown;
          try {
            const file = await open(marker, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
            try {
              const metadata = await file.stat();
              if (!metadata.isFile()) { report(marker, 'Manifest is not a regular file.'); return; }
              if (metadata.size > MAX_MANIFEST_BYTES) { report(marker, 'Manifest exceeds the 1 MiB limit.'); return; }
              // One extra byte detects growth after stat without an unbounded readFile allocation.
              const buffer = Buffer.alloc(MAX_MANIFEST_BYTES + 1);
              let length = 0;
              while (length < buffer.length) {
                const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
                if (bytesRead === 0) break;
                length += bytesRead;
              }
              if (length > MAX_MANIFEST_BYTES) { report(marker, 'Manifest exceeds the 1 MiB limit.'); return; }
              data = JSON.parse(buffer.toString('utf8', 0, length));
              if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('Invalid manifest');
            } finally { await file.close(); }
          } catch { report(marker, 'Manifest could not be read as a JSON object.'); return; }
          const previous = projects.get(canonical);
          if (previous) {
            if (!previous.rootIds.includes(root.id)) { previous.rootIds.push(root.id); batch.push({ ...previous, rootIds: [...previous.rootIds] }); }
          } else {
            if (projects.size >= MAX_PROJECTS) { report(marker, 'Project limit reached; additional projects were skipped.'); return; }
            const declaredName = (data as Record<string, unknown>).name;
            const languages = new Set<string>();
            for (const name of files) languages.add(/\.[cm]?tsx?$/.test(name) ? 'TypeScript' : 'JavaScript');
            const project: DiscoveredProject = {
              id: createHash('sha256').update(canonical).digest('hex'), path: canonical,
              name: typeof declaredName === 'string' && declaredName.trim() ? declaredName.trim().slice(0, 256) : path.basename(canonical) || canonical,
              rootIds: [root.id], ecosystem: 'Node', languages: [...languages].sort(), evidence: ['package.json', ...files.sort()],
            };
            projects.set(canonical, project); batch.push(project); progress.projects++;
          }
          flush();
        } catch { report(directory, 'Directory could not be read. It may have moved or lost access.'); }
      };
      // At most eight directory tasks (and eight manifest handles) run at once.
      const active = new Set<Promise<void>>();
      while (pending.length || active.size) {
        while (pending.length && active.size < SCAN_CONCURRENCY) {
          const directory = pending.pop()!;
          const task = inspect(directory).finally(() => active.delete(task));
          active.add(task);
        }
        if (active.size) await Promise.race(active);
      }
    }
    flush(true);
  } finally { clearInterval(timer); }
}
