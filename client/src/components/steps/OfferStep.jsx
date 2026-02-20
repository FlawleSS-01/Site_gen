import { Megaphone, Palette, Image } from 'lucide-react';

const IMAGE_STYLES = [
  { id: 'business', label: 'Business', desc: 'Corporate & professional' },
  { id: 'modern', label: 'Modern', desc: 'Tech-forward & sleek' },
  { id: 'creative', label: 'Creative', desc: 'Artistic & vibrant' },
  { id: 'nature', label: 'Nature', desc: 'Organic & earthy' },
  { id: 'minimalist', label: 'Minimalist', desc: 'Clean & simple' }
];

const COLOR_SCHEMES = [
  { id: 'gold', label: 'Gold', color: 'bg-amber-500' },
  { id: 'red', label: 'Red', color: 'bg-red-500' },
  { id: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { id: 'neon', label: 'Neon', color: 'bg-emerald-500' },
  { id: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { id: 'orange', label: 'Orange', color: 'bg-orange-500' }
];

export default function OfferStep({ config, update, errors }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="input-label">
          <Megaphone className="w-4 h-4 inline mr-1.5 text-indigo-500" />
          Offer URL
        </label>
        <input
          type="url"
          value={config.offerUrl}
          onChange={e => update('offerUrl', e.target.value)}
          placeholder="https://your-offer-link.com"
          className={`input-field ${errors.offerUrl ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : ''}`}
        />
        {errors.offerUrl && <p className="text-red-500 text-sm mt-1">{errors.offerUrl}</p>}
        <p className="text-xs text-slate-400 mt-1">This link will be used for all CTA buttons on the site.</p>
      </div>

      <div>
        <label className="input-label">
          <Image className="w-4 h-4 inline mr-1.5 text-indigo-500" />
          Image Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {IMAGE_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => update('imageStyle', style.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                config.imageStyle === style.id
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}
            >
              <p className="text-sm font-semibold text-slate-800">{style.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{style.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="input-label">
          <Palette className="w-4 h-4 inline mr-1.5 text-indigo-500" />
          Color Scheme
        </label>
        <div className="flex flex-wrap gap-3">
          {COLOR_SCHEMES.map(scheme => (
            <button
              key={scheme.id}
              onClick={() => update('colorScheme', scheme.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                config.colorScheme === scheme.id
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}
            >
              <span className={`w-5 h-5 rounded-full ${scheme.color} shadow-sm`} />
              <span className="text-sm font-medium text-slate-700">{scheme.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
        <h4 className="text-sm font-semibold text-emerald-800 mb-1">Ready to Generate</h4>
        <p className="text-sm text-emerald-600">
          Images are generated uniquely for each page using AI (max 500KB each).
          Click "Generate Site" to create your complete React project with all pages,
          images, SEO markup, and a downloadable ZIP archive.
        </p>
      </div>
    </div>
  );
}
