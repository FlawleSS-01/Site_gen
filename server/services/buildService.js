import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === 'win32';

function runCmd(cmd, cwd) {
  try {
    execSync(cmd, {
      cwd,
      stdio: 'pipe',
      shell: isWin,
      maxBuffer: 10 * 1024 * 1024
    });
  } catch (err) {
    const msg = err.stderr?.toString() || err.stdout?.toString() || err.message;
    throw new Error(`${cmd} failed: ${msg || 'Unknown error'}`);
  }
}

export async function buildProject(zipBuffer) {
  const tempDir = path.join(os.tmpdir(), `site-gen-build-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const projectDir = path.join(tempDir, 'project');

  try {
    fs.mkdirSync(projectDir, { recursive: true });

    const zip = await JSZip.loadAsync(zipBuffer);
    const projectName = Object.keys(zip.files).find(k => !zip.files[k].dir)?.split('/')[0] || 'site';

    for (const [relativePath, file] of Object.entries(zip.files)) {
      const destPath = path.join(projectDir, relativePath.replace(/\//g, path.sep));
      if (file.dir) {
        fs.mkdirSync(destPath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        const content = await file.async('nodebuffer');
        fs.writeFileSync(destPath, content);
      }
    }

    const workDir = path.join(projectDir, projectName);
    if (!fs.existsSync(path.join(workDir, 'package.json'))) {
      throw new Error('Invalid project: package.json not found');
    }
    runCmd('npm install', workDir);
    runCmd('npm run build', workDir);

    const builtDist = path.join(workDir, 'dist');
    if (!fs.existsSync(builtDist)) {
      throw new Error('Build failed: dist folder not found');
    }
    const buildZip = new JSZip();

    function addDirToZip(dir, zipPath = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const zipName = zipPath ? `${zipPath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          addDirToZip(fullPath, zipName);
        } else {
          buildZip.file(zipName, fs.readFileSync(fullPath));
        }
      }
    }

    addDirToZip(builtDist);
    const buildBuffer = await buildZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { data: buildBuffer, projectName: `${projectName}-build` };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('[Build] Cleanup temp dir failed:', e.message);
    }
  }
}
