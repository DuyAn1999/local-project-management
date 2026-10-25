export const SCAN_CHANNEL = 'projects:scan';
export const SCAN_UPDATE_CHANNEL = 'projects:scan-update';

export interface DiscoveredProject {
  id: string;
  path: string;
  name: string;
  rootIds: string[];
  ecosystem: 'Node';
  languages: string[];
  evidence: string[];
}
export interface ScanProgress { directories: number; projects: number; skipped: number }
export interface ScanIssue { path: string; message: string }
export interface ScanUpdate {
  scanId: string;
  revision: number;
  status: 'idle' | 'scanning' | 'complete' | 'failed';
  projects: DiscoveredProject[];
  progress: ScanProgress;
  issues: ScanIssue[];
  issueCount: number;
  error?: string;
}
// Updates contain batches; request responses contain the full current project list.
export type ScanSnapshot = ScanUpdate;
