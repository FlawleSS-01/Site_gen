import { useState } from 'react';
import Wizard from './components/Wizard';
import GenerationProgress from './components/GenerationProgress';
import SitePreview from './components/SitePreview';
import { Sparkles, Globe } from 'lucide-react';

const INITIAL_CONFIG = {
  brand: '',
  domain: '',
  pages: ['Casino', 'Games', 'Bonuses', 'Mobile App', 'Aviator', 'Betting', 'Login'],
  contentTemplate: '',
  logoData: null,
  meta: { title: '{{page}} - {{brand}} | {{domain}}', description: '', keywords: '' },
  offerUrl: '',
  imageStyle: 'modern',
  colorScheme: 'gold'
};

export default function App() {
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [phase, setPhase] = useState('wizard');
  const [jobId, setJobId] = useState(null);
  const [generatedData, setGeneratedData] = useState(null);

  const handleGenerate = async () => {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Generation failed');
        return;
      }
      if (data.jobId) {
        setJobId(data.jobId);
        setPhase('generating');
      }
    } catch (err) {
      console.error('Failed to start generation:', err);
      alert('Failed to start generation. Check that the logo is uploaded and try again.');
    }
  };

  const handleComplete = () => {
    setGeneratedData({ jobId, config });
    setPhase('preview');
  };

  const handleReset = () => {
    setConfig(INITIAL_CONFIG);
    setPhase('wizard');
    setJobId(null);
    setGeneratedData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Site Generator</h1>
              <p className="text-xs text-slate-500 -mt-0.5">SEO-Optimized React Websites</p>
            </div>
          </div>
          {phase !== 'wizard' && (
            <button onClick={handleReset} className="btn-secondary text-sm !py-2 !px-4">
              <Globe className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {phase === 'wizard' && (
          <Wizard config={config} setConfig={setConfig} onGenerate={handleGenerate} />
        )}
        {phase === 'generating' && (
          <GenerationProgress jobId={jobId} onComplete={handleComplete} onError={() => setPhase('wizard')} />
        )}
        {phase === 'preview' && (
          <SitePreview data={generatedData} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
