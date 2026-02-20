import { useState } from 'react';
import { Plus, X, Layout } from 'lucide-react';

const TEMPLATES = {
  casino: ['Casino', 'Games', 'Bonuses', 'Promotions', 'Contact'],
  casinoFull: ['Casino', 'Games', 'Bonuses', 'Mobile App', 'Aviator', 'Betting', 'Login'],
  business: ['Home', 'About', 'Services', 'Contact', 'FAQ'],
  blog: ['Home', 'Blog', 'About', 'Contact'],
  landing: ['Home', 'Pricing', 'Testimonials', 'FAQ', 'Contact']
};

export default function PagesStep({ config, update, errors }) {
  const [newPage, setNewPage] = useState('');

  const addPage = () => {
    const name = newPage.trim();
    if (name && !config.pages.includes(name)) {
      update('pages', [...config.pages, name]);
      setNewPage('');
    }
  };

  const removePage = (page) => {
    update('pages', config.pages.filter(p => p !== page));
  };

  const applyTemplate = (key) => {
    update('pages', [...TEMPLATES[key]]);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="input-label">Page Templates</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMPLATES).map(([key, pages]) => (
            <button
              key={key}
              onClick={() => applyTemplate(key)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200
                         bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600
                         hover:bg-indigo-50 transition-all duration-200 capitalize"
            >
              {key} ({pages.length})
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="input-label">
          <Layout className="w-4 h-4 inline mr-1.5 text-indigo-500" />
          Add Custom Page
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPage}
            onChange={e => setNewPage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPage()}
            placeholder="Page name, e.g. Pricing"
            className="input-field flex-1"
          />
          <button onClick={addPage} className="btn-primary !px-4" disabled={!newPage.trim()}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="input-label">Current Pages ({config.pages.length})</label>
        {config.pages.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-400">No pages added yet. Choose a template or add pages manually.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {config.pages.map(page => (
              <span key={page} className="tag-pill">
                {page}
                <button
                  onClick={() => removePage(page)}
                  className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center
                             hover:bg-red-200 hover:text-red-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.pages && <p className="text-red-500 text-sm mt-1">{errors.pages}</p>}
      </div>
    </div>
  );
}
