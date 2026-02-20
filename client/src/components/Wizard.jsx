import { useState } from 'react';
import { ChevronRight, ChevronLeft, Rocket, Globe, FileText, Layout, Search, Megaphone } from 'lucide-react';
import BrandStep from './steps/BrandStep';
import PagesStep from './steps/PagesStep';
import ContentStep from './steps/ContentStep';
import MetaStep from './steps/MetaStep';
import OfferStep from './steps/OfferStep';

const STEPS = [
  { id: 'brand', label: 'Brand', icon: Globe, desc: 'Brand & Domain' },
  { id: 'pages', label: 'Pages', icon: Layout, desc: 'Site Structure' },
  { id: 'content', label: 'Content', icon: FileText, desc: 'Text Template' },
  { id: 'meta', label: 'SEO', icon: Search, desc: 'Meta Tags' },
  { id: 'offer', label: 'Settings', icon: Megaphone, desc: 'Offer & Style' }
];

export default function Wizard({ config, setConfig, onGenerate }) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});

  const update = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!config.brand.trim()) e.brand = 'Brand name is required';
      if (!config.domain.trim()) e.domain = 'Domain is required';
    }
    if (step === 1 && config.pages.length === 0) {
      e.pages = 'Add at least one page';
    }
    if (step === 2 && !config.logoData) {
      e.logo = 'Logo is required';
    }
    if (step === 4 && !config.offerUrl.trim()) {
      e.offerUrl = 'Offer URL is required';
    }
    if (step === 4 && !config.logoData) {
      e.logo = 'Logo is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const prev = () => step > 0 && setStep(step - 1);

  const handleGenerate = () => {
    if (!validate()) return;
    onGenerate();
  };

  const renderStep = () => {
    const props = { config, update, errors };
    switch (step) {
      case 0: return <BrandStep {...props} />;
      case 1: return <PagesStep {...props} />;
      case 2: return <ContentStep {...props} />;
      case 3: return <MetaStep {...props} />;
      case 4: return <OfferStep {...props} />;
      default: return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Create Your Website</h2>
        <p className="text-slate-500">Fill in the details and we'll generate a complete React site for you</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center mb-10 gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : isDone
                      ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer'
                      : 'bg-slate-100 text-slate-400'
                }`}
                disabled={i > step}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className={`w-4 h-4 mx-1 ${i < step ? 'text-indigo-400' : 'text-slate-300'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="glass-card p-6 sm:p-8 mb-6 animate-slide-up" key={step}>
        <div className="mb-6">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
            Step {step + 1} of {STEPS.length}
          </span>
          <h3 className="text-xl font-bold text-slate-800 mt-1">{STEPS[step].desc}</h3>
        </div>
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prev} disabled={step === 0} className="btn-secondary">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={next} className="btn-primary">
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleGenerate} className="btn-primary !from-emerald-600 !to-teal-600 !shadow-emerald-500/25">
            <Rocket className="w-4 h-4" />
            Generate Site
          </button>
        )}
      </div>
    </div>
  );
}
