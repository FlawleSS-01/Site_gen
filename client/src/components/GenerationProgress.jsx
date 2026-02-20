import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function GenerationProgress({ jobId, onComplete, onError }) {
  const [progress, setProgress] = useState({ step: 0, total: 1, message: 'Connecting...' });
  const [status, setStatus] = useState('connecting');
  const [logs, setLogs] = useState([]);
  const logsEnd = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`/api/progress/${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          setProgress(data.data);
          setStatus('processing');
          setLogs(prev => {
            const last = prev[prev.length - 1];
            if (last?.message === data.data.message) return prev;
            return [...prev, { ...data.data, time: new Date().toLocaleTimeString() }];
          });
        } else if (data.type === 'complete') {
          setStatus('complete');
          eventSource.close();
          setTimeout(() => onComplete(), 800);
        } else if (data.type === 'error') {
          setStatus('error');
          eventSource.close();
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    eventSource.onerror = () => {
      if (status !== 'complete') {
        setStatus('error');
        eventSource.close();
      }
    };

    return () => eventSource.close();
  }, [jobId]);

  useEffect(() => {
    logsEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const percent = progress.total > 0 ? Math.round((progress.step / progress.total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        {status === 'complete' ? (
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        ) : status === 'error' ? (
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        ) : (
          <div className="relative w-16 h-16 mx-auto mb-4">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-amber-500 absolute top-0 right-0 animate-pulse" />
          </div>
        )}

        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {status === 'complete' ? 'Generation Complete!' :
           status === 'error' ? 'Generation Failed' :
           'Generating Your Site...'}
        </h2>
        <p className="text-slate-500">
          {status === 'complete' ? 'Your React website is ready for download' :
           status === 'error' ? 'Something went wrong. Please try again.' :
           progress.message}
        </p>
      </div>

      {/* Progress bar */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Progress</span>
          <span className="text-sm font-bold text-indigo-600">{percent}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              status === 'complete' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
              status === 'error' ? 'bg-red-500' :
              'bg-gradient-to-r from-indigo-500 to-purple-500'
            }`}
            style={{ width: `${status === 'complete' ? 100 : percent}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Step {progress.step} of {progress.total}
        </p>
      </div>

      {/* Log */}
      <div className="glass-card p-4 max-h-64 overflow-y-auto">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Generation Log</h4>
        <div className="space-y-2">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {i < logs.length - 1 || status === 'complete' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin mt-0.5 flex-shrink-0" />
              )}
              <span className="text-slate-600">{log.message}</span>
              <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{log.time}</span>
            </div>
          ))}
          <div ref={logsEnd} />
        </div>
      </div>

      {status === 'error' && (
        <div className="mt-6 text-center">
          <button onClick={onError} className="btn-primary">
            Back to Editor
          </button>
        </div>
      )}
    </div>
  );
}
