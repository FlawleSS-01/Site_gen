import { useState } from 'react';
import { Download, CheckCircle2, Archive, Package } from 'lucide-react';

export default function SitePreview({ data, onReset }) {
  const [downloading, setDownloading] = useState(false);
  const [building, setBuilding] = useState(false);
  const { jobId } = data;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/download/${jobId}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'site-project.zip';
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
      a.download = 'site-build.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Build download error:', err);
      alert(err.name === 'AbortError' ? 'Request timed out. Try again.' : (err.message || 'Build failed.'));
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
        <p className="text-slate-500 text-lg">The website has been generated from your archive.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-6 text-center">
          <Archive className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Source Project</h3>
          <p className="text-xs text-slate-500 mb-4">React + Vite source code</p>
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
          <p className="text-xs text-slate-500 mb-4">Built site (vite build), ready to deploy</p>
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

      <div className="glass-card p-5 mb-6">
        <h4 className="font-semibold text-slate-800 mb-3">Included in your site</h4>
        <ul className="text-sm text-slate-600 space-y-1.5">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> AI-generated hero images
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Logo in header & footer
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> SEO meta tags from content file
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sitemap, robots.txt, canonical URLs
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verification files (Bing, Google)
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Responsive design & animations
          </li>
        </ul>
      </div>

      <div className="text-center">
        <button onClick={onReset} className="btn-secondary">
          Generate Another Site
        </button>
      </div>
    </div>
  );
}
