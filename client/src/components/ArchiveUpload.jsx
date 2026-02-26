import { useState, useRef, useCallback } from 'react';
import { Upload, FileArchive, Globe, Building2, Layout, FileCheck, Image, Palette, Rocket, X, AlertCircle, CheckCircle2 } from 'lucide-react';

const COLOR_SCHEMES = [
  { id: 'gold', label: 'Gold', color: 'bg-amber-500' },
  { id: 'red', label: 'Red', color: 'bg-red-500' },
  { id: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { id: 'neon', label: 'Neon', color: 'bg-emerald-500' },
  { id: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { id: 'orange', label: 'Orange', color: 'bg-orange-500' }
];

export default function ArchiveUpload({ onGenerate }) {
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [colorScheme, setColorScheme] = useState('gold');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (selectedFile) => {
    if (!selectedFile) return;

    const isZip = selectedFile.name.toLowerCase().endsWith('.zip') ||
      selectedFile.type === 'application/zip' ||
      selectedFile.type === 'application/x-zip-compressed';

    if (!isZip) {
      setError('Please upload a ZIP archive');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setParsing(true);
    setParsed(null);

    try {
      const formData = new FormData();
      formData.append('archive', selectedFile);

      const res = await fetch('/api/parse-archive', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse archive');
      setParsed(data);
    } catch (err) {
      setError(err.message);
      setFile(null);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleGenerate = () => {
    if (!file || !parsed) return;
    onGenerate(file, colorScheme);
  };

  const reset = () => {
    setFile(null);
    setParsed(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Generate Website</h2>
        <p className="text-slate-500">Upload a ZIP archive with content, logo, and verification files</p>
      </div>

      {!parsed ? (
        <div className="glass-card p-8">
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
              dragOver
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />

            {parsing ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center animate-pulse">
                  <FileArchive className="w-8 h-8 text-indigo-600" />
                </div>
                <p className="text-lg font-semibold text-slate-700">Parsing archive...</p>
                <p className="text-sm text-slate-500">Extracting files and reading content</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-700">
                    {dragOver ? 'Drop archive here' : 'Drag & drop your archive'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">or click to browse</p>
                </div>
                <p className="text-xs text-slate-400">
                  ZIP with: content.docx (or .txt), logo image, BingSiteAuth.xml, google*.html
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Archive Contents</h3>
              <button onClick={reset} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Brand</p>
                  <p className="font-semibold text-slate-800">{parsed.brand}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Domain</p>
                  <p className="font-semibold text-slate-800">{parsed.domain}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Layout className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-slate-700">Pages ({parsed.pages.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {parsed.pages.map(p => (
                  <span key={p} className="tag-pill">{p}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                <Image className={`w-4 h-4 ${parsed.filesFound.logo ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className="text-sm text-slate-600">
                  {parsed.filesFound.logo ? parsed.filesFound.logo : 'No logo'}
                </span>
                {parsed.filesFound.logo && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
              </div>

              {parsed.filesFound.verifications.map(v => (
                <div key={v} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-slate-600 truncate">{v}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-slate-700">Color Scheme</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {COLOR_SCHEMES.map(scheme => (
                  <button
                    key={scheme.id}
                    onClick={() => setColorScheme(scheme.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                      colorScheme === scheme.id
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
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              className="btn-primary !from-emerald-600 !to-teal-600 !shadow-emerald-500/25 !px-8 !py-3"
            >
              <Rocket className="w-5 h-5" />
              Generate Site
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
