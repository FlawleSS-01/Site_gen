import { useRef } from 'react';
import { FileText, Copy, Image, X } from 'lucide-react';

const EXAMPLE_TEMPLATE = `1. Casino (Homepage) – {{brand}} – Premier Online Casino
Welcome to {{brand}}, the ultimate hub for online gaming! Explore 1,500+ games, live dealers, and instant withdrawals.
✅ Instant Withdrawals – Receive winnings in under 90 seconds
✅ 1,500+ Games – Slots, live casino, sports betting
✅ Welcome Bonus 250% + 100 Free Spins
✅ Live Dealers – Roulette, Blackjack, and more
🎯 Join {{brand}} today — your winning journey begins here!

2. Bonuses – Boost Your Winnings at {{brand}}
At {{brand}}, bonuses are opportunities to win more every day.
🎁 Welcome Bonus 250% + 100 Free Spins
🔥 Friday Reload: 50% up to ৳20,000
🎯 VIP Club – Priority withdrawals and gifts
Sign up today and let {{brand}} multiply your rewards!`;

export default function ContentStep({ config, update, errors = {} }) {
  const fileInputRef = useRef(null);

  const applyExample = () => {
    update('contentTemplate', EXAMPLE_TEMPLATE);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, SVG, WebP)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo size must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update('logoData', { base64: reader.result, name: file.name, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    update('logoData', null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const preview = config.contentTemplate
    ? config.contentTemplate
        .replace(/\{\{brand\}\}/gi, config.brand || '[Brand]')
        .replace(/\{\{domain\}\}/gi, config.domain || '[Domain]')
        .replace(/\{\{page\}\}/gi, config.pages[0] || '[Page]')
    : '';

  return (
    <div className="space-y-6">
      <div>
        <label className="input-label block mb-2">
          <Image className="w-4 h-4 inline mr-1.5 text-indigo-500" />
          Logo (Header & Footer) <span className="text-red-500">*</span>
        </label>
        {errors?.logo && <p className="text-sm text-red-500 mb-2">{errors.logo}</p>}
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleLogoChange}
            className="hidden"
          />
          {config.logoData ? (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <img
                src={config.logoData.base64}
                alt="Logo preview"
                className="h-12 w-auto max-w-[120px] object-contain"
              />
              <span className="text-sm text-slate-600 truncate max-w-[140px]">{config.logoData.name}</span>
              <button
                type="button"
                onClick={removeLogo}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                title="Remove logo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary !py-2 !px-4 text-sm"
          >
            <Image className="w-4 h-4" />
            {config.logoData ? 'Change' : 'Upload Logo'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">PNG, JPG, SVG or WebP, max 2 MB. Used in header, footer and other places.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="input-label !mb-0">
            <FileText className="w-4 h-4 inline mr-1.5 text-indigo-500" />
            Content Template
          </label>
          <button onClick={applyExample} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <Copy className="w-3 h-3" />
            Use Example
          </button>
        </div>
        <textarea
          value={config.contentTemplate}
          onChange={e => update('contentTemplate', e.target.value)}
          rows={12}
          placeholder="Paste content by pages. Format:
1. PageName – Subtitle
Content for this page...
✅ Bullet points
🎯 Section headers

2. NextPage – Subtitle
More content..."
          className="input-field resize-y font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold text-slate-500 self-center mr-1">Format:</span>
        <code className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-mono rounded-lg border border-amber-200">
          1. PageName – Subtitle
        </code>
        <code className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-mono rounded-lg border border-amber-200">
          ✅ 🎯 🎁 (section headers)
        </code>
        <code className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-mono rounded-lg border border-amber-200">
          {'{{brand}}'} {'{{domain}}'}
        </code>
      </div>

      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <h4 className="text-sm font-semibold text-indigo-800 mb-1">Page-based content</h4>
        <p className="text-sm text-indigo-600">
          Split content by pages: <strong>1. Casino (Homepage) – ...</strong>, <strong>2. Bonuses – ...</strong>.
          Use emoji headers (✅ 🎯 🔥 🎁) for sections. Each page&apos;s content will appear on the matching generated page.
          Leave empty for AI-generated content.
        </p>
      </div>
    </div>
  );
}
