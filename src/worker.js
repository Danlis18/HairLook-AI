import { assertProductionConfig } from './config.js';
import { startWorker } from './services/workerLoop.js';
import { log } from './lib/log.js';

assertProductionConfig();
const controller = new AbortController();
for (const sig of ['SIGINT','SIGTERM']) process.on(sig, () => controller.abort());
startWorker({ signal: controller.signal }).catch(error => { log.error('worker_crash', { error: error.stack || error.message }); process.exitCode = 1; });
