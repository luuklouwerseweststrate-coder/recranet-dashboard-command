import { spawn } from 'node:child_process';

const commands = [
  ['node', ['server/server.js']],
  ['npx', ['vite', '--host', '127.0.0.1', '--port', '5173']],
];

const children = commands.map(([command, args]) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${command} exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
});

function stop() {
  children.forEach((child) => {
    if (!child.killed) child.kill();
  });
}

process.on('SIGINT', () => {
  stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stop();
  process.exit(0);
});
