import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const rootDir = fileURLToPath(new URL('../', import.meta.url));
const logsDir = fileURLToPath(new URL('../logs/', import.meta.url));
mkdirSync(logsDir, { recursive: true });

const npmScript = (script) => (
  isWindows
    ? { command: `npm run ${script}`, args: [] }
    : { command: npmCommand, args: ['run', script] }
);

const processes = [
  {
    name: 'route-engine',
    color: '\x1b[36m',
    ...npmScript('start'),
    cwd: fileURLToPath(new URL('../route-engine/', import.meta.url)),
    healthUrl: 'http://localhost:8080/health',
  },
  {
    name: 'web',
    color: '\x1b[35m',
    ...npmScript('dev:web'),
    cwd: rootDir,
  },
];

const children = new Map();
let shuttingDown = false;

const prefix = (name, color, chunk) => {
  const reset = '\x1b[0m';
  return chunk
    .toString()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `${color}[${name}]${reset} ${line}`)
    .join('\n');
};

const stopAll = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children.values()) {
    if (!child.killed) child.kill('SIGTERM');
  }

  setTimeout(() => process.exit(exitCode), 250).unref();
};

const writeOutput = (stream, item, chunk) => {
  const output = prefix(item.name, item.color, chunk);
  const plain = prefix(item.name, '', chunk).replaceAll('\x1b[0m', '');
  if (output && stream.writable) stream.write(`${output}\n`);
  item.log.write(`${plain}\n`);
};

const startProcess = (item, restartCount = 0) => {
  if (shuttingDown) return;

  const child = spawn(item.command, item.args, {
    cwd: item.cwd,
    env: process.env,
    shell: isWindows,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  children.set(item.name, child);

  child.stdout.on('data', (chunk) => {
    writeOutput(process.stdout, item, chunk);
  });

  child.stderr.on('data', (chunk) => {
    writeOutput(process.stderr, item, chunk);
  });

  child.stdout.on('error', () => {});
  child.stderr.on('error', () => {});

  child.on('exit', (code, signal) => {
    children.delete(item.name);
    if (!shuttingDown) {
      const reason = signal || `exit code ${code ?? 0}`;
      const delay = Math.min(1000 + restartCount * 1000, 5000);
      console.error(`[dev] ${item.name} stopped with ${reason}. Restarting in ${delay / 1000}s.`);
      setTimeout(() => startProcess(item, restartCount + 1), delay).unref();
    }
  });
};

for (const item of processes) {
  item.log = createWriteStream(fileURLToPath(new URL(`../logs/${item.name}.log`, import.meta.url)), { flags: 'a' });
  startProcess(item);
}

setInterval(async () => {
  if (shuttingDown) return;

  for (const item of processes.filter((processItem) => processItem.healthUrl)) {
    try {
      const response = await fetch(item.healthUrl, { signal: AbortSignal.timeout(2500) });
      if (response.ok) continue;
    } catch {
      // Restart below if the process exists but no longer answers health checks.
    }

    const child = children.get(item.name);
    if (child && !child.killed) {
      console.error(`[dev] ${item.name} failed health check. Restarting.`);
      child.kill('SIGTERM');
    } else {
      console.error(`[dev] ${item.name} is not running. Starting.`);
      startProcess(item);
    }
  }
}, 5000).unref();

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
