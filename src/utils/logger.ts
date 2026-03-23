import { promises as fs } from 'fs';
import * as path from 'path';

let logDirectory: string | null = null;
let logToStderr = true;

export async function configureLogger(options?: { logPath?: string; stderr?: boolean }) {
  if (options && options.logPath) {
    logDirectory = path.resolve(options.logPath);
    try {
      await fs.mkdir(logDirectory, { recursive: true });
    } catch {}
  }
  if (options && typeof options.stderr === 'boolean') logToStderr = options.stderr;
}

async function writeToFile(line: string) {
  if (!logDirectory) return;
  try {
    const file = path.join(logDirectory, `${new Date().toISOString().slice(0,10)}.log`);
    await fs.appendFile(file, line + '\n', 'utf8');
  } catch {}
}

function format(...args: any[]) {
  const ts = new Date().toISOString();
  return [ts, ...args].map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
}

export const info = (...args: any[]) => {
  const line = format('[info]', ...args);
  if (logToStderr) console.error(line);
  void writeToFile(line);
};

export const warn = (...args: any[]) => {
  const line = format('[warn]', ...args);
  if (logToStderr) console.error(line);
  void writeToFile(line);
};

export const error = (...args: any[]) => {
  const line = format('[error]', ...args);
  if (logToStderr) console.error(line);
  void writeToFile(line);
};

export const debug = (...args: any[]) => {
  if (!process.env.DEBUG) return;
  const line = format('[debug]', ...args);
  if (logToStderr) console.error(line);
  void writeToFile(line);
};
