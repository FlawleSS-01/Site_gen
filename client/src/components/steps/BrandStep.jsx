import { Globe, Building2 } from 'lucide-react';

export default function BrandStep({ config, update, errors }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="input-label">
          <Building2 className="w-4 h-4 inline mr-1.5 text-indigo-500" />
          Brand Name
        </label>
        <input
          type="text"
          value={config.brand}
          onChange={e => update('brand', e.target.value)}
          placeholder="e.g. TechVision, GreenLeaf, BlueStar"
          className={`input-field ${errors.brand ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : ''}`}
        />
        {errors.brand && <p className="text-red-500 text-sm mt-1">{errors.brand}</p>}
      </div>

      <div>
        <label className="input-label">
          <Globe className="w-4 h-4 inline mr-1.5 text-indigo-500" />
          Domain
        </label>
        <input
          type="text"
          value={config.domain}
          onChange={e => update('domain', e.target.value)}
          placeholder="e.g. techvision.com"
          className={`input-field ${errors.domain ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : ''}`}
        />
        {errors.domain && <p className="text-red-500 text-sm mt-1">{errors.domain}</p>}
      </div>

      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <h4 className="text-sm font-semibold text-indigo-800 mb-1">Tip</h4>
        <p className="text-sm text-indigo-600">
          The brand name will be used throughout the generated website — in the header, footer,
          meta tags, and content. The domain is used for canonical URLs, sitemap, and SEO tags.
        </p>
      </div>
    </div>
  );
}
