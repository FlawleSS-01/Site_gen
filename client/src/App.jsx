import { useState } from 'react';
import ArchiveUpload from './components/ArchiveUpload';
import GenerationProgress from './components/GenerationProgress';
import SitePreview from './components/SitePreview';
import { Sparkles, Globe } from 'lucide-react';

export default function App() {
  const [phase, setPhase] = useState('upload');
  const [jobId, setJobId] = useState(null);
  const [generatedData, setGeneratedData] = useState(null);

  const handleGenerate = async (archiveFile, colorScheme) => {
    try {
      const formData = new FormData();
      formData.append('archive', archiveFile);
      formData.append('colorScheme', colorScheme);

      const res = await fetch('/api/generate-from-archive', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Generation failed');
        return;
      }

      if (data.jobId) {
        setJobId(data.jobId);
        setGeneratedData({ jobId: data.jobId });
        setPhase('generating');
      }
    } catch (err) {
      console.error('Failed to start generation:', err);
      alert('Failed to start generation. Please try again.');
    }
  };

  const handleComplete = () => {
    setGeneratedData(prev => ({ ...prev, jobId }));
    setPhase('preview');
  };

  const handleReset = () => {
    setPhase('upload');
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
              <p className="text-xs text-slate-500 -mt-0.5">Archive-Based Generation</p>
            </div>
          </div>
          {phase !== 'upload' && (
            <button onClick={handleReset} className="btn-secondary text-sm !py-2 !px-4">
              <Globe className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {phase === 'upload' && (
          <ArchiveUpload onGenerate={handleGenerate} />
        )}
        {phase === 'generating' && (
          <GenerationProgress jobId={jobId} onComplete={handleComplete} onError={() => setPhase('upload')} />
        )}
        {phase === 'preview' && (
          <SitePreview data={generatedData} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
