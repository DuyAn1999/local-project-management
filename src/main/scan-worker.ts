import { parentPort, workerData } from 'node:worker_threads';
import type { SavedRoot } from '../shared/folders';
import { scanRoots } from './scanner';

const port = parentPort;
if (!port) throw new Error('Scanner requires a worker thread');
void scanRoots(workerData as SavedRoot[], (batch) => port.postMessage({ type: 'batch', batch }))
  .then(() => port.postMessage({ type: 'complete' }))
  .catch(() => port.postMessage({ type: 'failed' }));
