import { config } from '../config.js';
const levels = { debug: 10, info: 20, warn: 30, error: 40 };
const enabled = (level) => levels[level] >= (levels[config.logLevel] || 20);
function out(level, message, meta = {}) {
  if (!enabled(level)) return;
  const record = { ts: new Date().toISOString(), level, message, ...meta };
  const line = JSON.stringify(record);
  if (level === 'error') console.error(line); else if (level === 'warn') console.warn(line); else console.log(line);
}
export const log = { debug:(m,x)=>out('debug',m,x), info:(m,x)=>out('info',m,x), warn:(m,x)=>out('warn',m,x), error:(m,x)=>out('error',m,x) };
