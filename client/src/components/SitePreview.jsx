import { useState } from 'react';
import { Download, FolderTree, FileCode, Image, Search, CheckCircle2, Archive, Package } from 'lucide-react';

export default function SitePreview({ data, onReset }) {
  const [downloading, setDownloading] = useState(false);
  const [building, setBuilding] = useState(false);
  const { jobId, config } = data;
  const projectSlug = config.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/download/${jobId}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectSlug}-project.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadBuild = async () => {
    if (!jobId) {
      alert('Session expired. Please generate a new project.');
      return;
    }
    setBuilding(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180000);
      const res = await fetch(`/api/download-build/${jobId}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || (res.status === 404 ? 'Job not found or expired. Please generate a new project.' : 'Build failed');
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectSlug}-build.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Build download error:', err);
      alert(err.name === 'AbortError' ? 'Request timed out. Try again.' : (err.message || 'Build failed. Ensure npm and Node.js are installed on the server.'));
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Your Site is Ready!</h2>
        <p className="text-slate-500 text-lg">
          <span className="font-semibold text-slate-700">{config.brand}</span> website with {config.pages.length} pages has been generated.
        </p>
      </div>

      {/* Download cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-6 text-center">
          <Archive className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Source Project</h3>
          <p className="text-xs text-slate-500 mb-4">
            React + Vite source code
          </p>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary !px-6 !py-3 text-sm w-full"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Downloading...' : 'Download ZIP'}
          </button>
        </div>
        <div className="glass-card p-6 text-center">
          <Package className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Production Build</h3>
          <p className="text-xs text-slate-500 mb-4">
            Built site (vite build), ready to deploy
          </p>
          <button
            onClick={handleDownloadBuild}
            disabled={building}
            className="btn-primary !from-emerald-600 !to-teal-600 !shadow-emerald-500/25 !px-6 !py-3 text-sm w-full"
          >
            <Package className="w-4 h-4" />
            {building ? 'Building...' : 'Download Build'}
          </button>
        </div>
      </div>

      {/* Project summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <FolderTree className="w-4 h-4 text-indigo-600" />
            </div>
            <h4 className="font-semibold text-slate-800">Project Structure</h4>
          </div>
          <div className="text-sm text-slate-600 font-mono space-y-0.5 bg-slate-50 rounded-lg p-3">
            <p>/{config.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</p>
            <p className="pl-3">├── public/</p>
            <p className="pl-6">├── images/ ({config.pages.length} images)</p>
            <p className="pl-6">├── sitemap.xml</p>
            <p className="pl-6">└── robots.txt</p>
            <p className="pl-3">├── src/</p>
            <p className="pl-6">├── components/ (4 files)</p>
            <p className="pl-6">├── pages/ ({config.pages.length} files)</p>
            <p className="pl-6">├── App.jsx</p>
            <p className="pl-6">└── main.jsx</p>
            <p className="pl-3">├── package.json</p>
            <p className="pl-3">└── README.md</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileCode className="w-4 h-4 text-purple-600" />
              </div>
              <h4 className="font-semibold text-slate-800">Pages</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {config.pages.map(p => (
                <span key={p} className="tag-pill text-xs">{p}</span>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Image className="w-4 h-4 text-amber-600" />
              </div>
              <h4 className="font-semibold text-slate-800">Features</h4>
            </div>
            <ul className="text-sm text-slate-600 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> AI-generated images
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Custom logo in header & footer
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> SEO meta tags
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sitemap & robots.txt
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Responsive design
              </li>
            </ul>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Search className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-slate-800">Quick Start</h4>
            </div>
            <div className="text-sm font-mono bg-slate-900 text-slate-100 rounded-lg p-3 space-y-1">
              <p><span className="text-emerald-400">$</span> npm install</p>
              <p><span className="text-emerald-400">$</span> npm run dev</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button onClick={onReset} className="btn-secondary">
          Generate Another Site
        </button>
      </div>
    </div>
  );
}
