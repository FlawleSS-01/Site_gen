import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { generateProject } from './services/projectGenerator.js';
import { buildProject } from './services/buildService.js';
import { parseArchive } from './services/archiveParser.js';

console.log('API Key loaded:', process.env.POLLINATIONS_API_KEY ? 'YES' : 'NO');
const app = express();
const PORT = process.env.PORT || 3001;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const jobs = new Map();

function createJob() {
  const jobId = uuidv4();
  const job = {
    id: jobId,
    status: 'pending',
    progress: { step: 0, total: 0, message: 'Initializing...' },
    listeners: [],
    zipBuffer: null,
    error: null,
    createdAt: Date.now()
  };
  jobs.set(jobId, job);
  return { jobId, job };
}

function runGeneration(job, config) {
  setImmediate(async () => {
    try {
      job.status = 'processing';
      const emitProgress = (step, total, message) => {
        job.progress = { step, total, message };
        job.listeners.forEach(cb => cb({ type: 'progress', data: job.progress }));
      };

      const zipBuffer = await generateProject(config, emitProgress);
      job.zipBuffer = zipBuffer;
      job.status = 'complete';
      job.listeners.forEach(cb => cb({ type: 'complete' }));
    } catch (err) {
      console.error('Generation error:', err);
      job.status = 'error';
      job.error = err.message;
      job.listeners.forEach(cb => cb({ type: 'error', data: err.message }));
    }
  });
}

// Parse archive to preview extracted data (no generation)
app.post('/api/parse-archive', upload.single('archive'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No archive file uploaded' });
    }

    const parsed = await parseArchive(req.file.buffer);

    res.json({
      brand: parsed.brand,
      domain: parsed.domain,
      offerUrl: parsed.offerUrl,
      pages: parsed.pages,
      pageMeta: parsed.pageMeta,
      filesFound: parsed.filesFound
    });
  } catch (err) {
    console.error('[Parse] Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Generate site from archive
app.post('/api/generate-from-archive', upload.single('archive'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No archive file uploaded' });
    }

    const parsed = await parseArchive(req.file.buffer);
    const colorScheme = req.body?.colorScheme || 'gold';
    const imageStyle = req.body?.imageStyle || 'modern';

    const config = {
      brand: parsed.brand,
      domain: parsed.domain,
      pages: parsed.pages,
      contentTemplate: parsed.contentTemplate,
      offerUrl: parsed.offerUrl,
      imageStyle,
      colorScheme,
      logoBuffer: parsed.logoBuffer,
      logoFilename: parsed.logoFilename,
      pageMeta: parsed.pageMeta,
      verificationFiles: parsed.verificationFiles,
      meta: { title: '', description: '', keywords: '' }
    };

    console.log(`[API] Archive parsed: brand=${config.brand}, domain=${config.domain}, pages=${config.pages.join(', ')}`);

    const { jobId, job } = createJob();
    runGeneration(job, config);
    res.json({ jobId });
  } catch (err) {
    console.error('[Generate] Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Legacy endpoint (kept for backward compatibility)
app.post('/api/generate', (req, res) => {
  const config = req.body;

  if (!config.brand || !config.domain || !config.pages?.length) {
    return res.status(400).json({ error: 'Brand, domain, and at least one page are required' });
  }

  const { jobId, job } = createJob();
  runGeneration(job, config);
  res.json({ jobId });
});

app.get('/api/progress/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  if (job.status === 'complete') {
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    return res.end();
  }
  if (job.status === 'error') {
    res.write(`data: ${JSON.stringify({ type: 'error', data: job.error })}\n\n`);
    return res.end();
  }

  res.write(`data: ${JSON.stringify({ type: 'progress', data: job.progress })}\n\n`);

  const listener = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.type === 'complete' || event.type === 'error') {
      cleanup();
    }
  };

  job.listeners.push(listener);

  const cleanup = () => {
    const idx = job.listeners.indexOf(listener);
    if (idx !== -1) job.listeners.splice(idx, 1);
  };

  req.on('close', cleanup);
});

app.get('/api/download/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'complete' || !job.zipBuffer) {
    return res.status(400).json({ error: 'Job is not complete yet' });
  }

  const filename = `${job.zipBuffer.projectName || 'site'}-project.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(job.zipBuffer.data);
});

app.get('/api/download-build/:jobId', async (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'complete' || !job.zipBuffer) {
    return res.status(400).json({ error: 'Job is not complete yet' });
  }

  try {
    const buildResult = await buildProject(job.zipBuffer.data);
    const filename = `${buildResult.projectName || 'site-build'}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buildResult.data);
  } catch (err) {
    console.error('Build error:', err);
    res.status(500).json({ error: err.message || 'Build failed' });
  }
});

setInterval(() => {
  const oneHour = 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (Date.now() - job.createdAt > oneHour) {
      jobs.delete(id);
    }
  }
}, 10 * 60 * 1000);

const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
