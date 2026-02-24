const { spawn } = require('child_process');
const path = require('path');

const root = path.dirname(process.execPath);
const child = spawn('npm', ['run', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' }
});

child.on('exit', (code) => process.exit(code || 0));
