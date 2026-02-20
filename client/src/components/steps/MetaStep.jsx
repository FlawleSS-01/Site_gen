import { Search } from 'lucide-react';

export default function MetaStep({ config, update }) {
  const updateMeta = (key, value) => {
    update('meta', { ...config.meta, [key]: value });
  };

  const previewTitle = (config.meta.title || '')
    .replace(/\{\{brand\}\}/gi, config.brand || '[Brand]')
    .replace(/\{\{domain\}\}/gi, config.domain || '[Domain]')
    .replace(/\{\{page\}\}/gi, 'Home');

  const previewDesc = (config.meta.description || '')
    .replace(/\{\{brand\}\}/gi, config.brand || '[Brand]')
    .replace(/\{\{domain\}\}/gi, config.domain || '[Domain]')
    .replace(/\{\{page\}\}/gi, 'Home');

  return (
    <div className="space-y-6">
      <div>
        <label className="input-label">
          <Search className="w-4 h-4 inline mr-1.5 text-indigo-500" />
          Title Template
        </label>
        <input
          type="text"
          value={config.meta.title}
          onChange={e => updateMeta('title', e.target.value)}
          placeholder="{{page}} - {{brand}} | {{domain}}"
          className="input-field"
        />
      </div>

      <div>
        <label className="input-label">Meta Description Template</label>
        <textarea
          value={config.meta.description}
          onChange={e => updateMeta('description', e.target.value)}
          rows={3}
          placeholder="Discover {{page}} at {{brand}}. Visit {{domain}} for the best experience..."
          className="input-field resize-y"
        />
      </div>

      <div>
        <label className="input-label">Keywords</label>
        <input
          type="text"
          value={config.meta.keywords}
          onChange={e => updateMeta('keywords', e.target.value)}
          placeholder="{{brand}}, {{page}}, {{domain}}, your keywords..."
          className="input-field"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <span className="text-xs font-semibold text-slate-500 self-center mr-1">Variables:</span>
        {['{{brand}}', '{{domain}}', '{{page}}'].map(v => (
          <code key={v} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-mono rounded-lg border border-amber-200">
            {v}
          </code>
        ))}
      </div>

      {(previewTitle || previewDesc) && (
        <div>
          <label className="input-label">Search Engine Preview</label>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-blue-700 text-base font-medium truncate hover:underline cursor-pointer">
              {previewTitle || 'Page Title'}
            </p>
            <p className="text-green-700 text-xs mt-0.5">{config.domain || 'example.com'}</p>
            <p className="text-slate-500 text-sm mt-1 line-clamp-2">
              {previewDesc || 'Meta description will appear here...'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <h4 className="text-sm font-semibold text-indigo-800 mb-1">Auto-Generation</h4>
        <p className="text-sm text-indigo-600">
          Leave fields empty to have AI generate unique meta tags for each page.
          OpenGraph tags, canonical URLs, sitemap.xml, and robots.txt are always generated automatically.
        </p>
      </div>
    </div>
  );
}
