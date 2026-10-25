import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { PresetSample, ClassifyResponse } from '../api/types';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { AlertBox } from '../components/ui/AlertBox';
import {
  Zap,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Info,
  Send,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const ClassifyPage: React.FC = () => {
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [presets, setPresets] = useState<PresetSample[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResponse | null>(null);

  useEffect(() => {
    api
      .getClassifyPresets()
      .then((data) => setPresets(data))
      .catch((err) => console.error('Failed to load presets:', err));
  }, []);

  const handleApplyPreset = (preset: PresetSample) => {
    setHeadline(preset.title);
    setBody(preset.body);
    setSelectedPreset(preset.label);
    setError(null);
    setResult(null);
  };

  const handleReset = () => {
    setHeadline('');
    setBody('');
    setSelectedPreset(null);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!headline.trim()) {
      setError('A headline or lead dispatch line is required to run classification.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.classifyArticle({
        title: headline.trim(),
        body: body.trim() || undefined,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Classification request failed. Please check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const wordCount = (headline + ' ' + body).trim().split(/\s+/).filter(Boolean).length;
  const charCount = headline.length + body.length;

  return (
    <div className="space-y-8 max-w-6xl animate-fadeIn">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-4 border-b border-border-light gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-forest" />
            <span className="text-xs uppercase tracking-wider font-semibold text-forest-dark font-sans">
              Real-Time Inference Workspace
            </span>
          </div>
          <h1 className="font-serif text-3xl font-normal tracking-tight text-ink">
            Classify Wire Story
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-1 leading-relaxed">
            Vectorized text tokenization and Softmax probability distribution via fitted Apache Spark MLlib Pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="font-mono text-[11px] bg-[#F4F4F0] px-2 py-0.5 rounded border border-border-light">
            Shortcut: Ctrl + Enter
          </span>
        </div>
      </div>

      {/* Preset Wire Stories */}
      {presets.length > 0 && (
        <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-forest" />
              <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                Benchmark Editorial Presets
              </span>
            </div>
            <span className="text-[11px] text-ink-muted">Click to populate workbench</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`text-left p-3 rounded-sm border transition-all text-xs ${
                  selectedPreset === p.label
                    ? 'border-forest bg-forest-light/50 text-forest-dark font-medium shadow-sm'
                    : 'border-border-light hover:border-ink-muted bg-white text-ink-muted hover:text-ink'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink text-xs">{p.desk}</span>
                  <span className="text-[9px] font-mono uppercase bg-[#F4F4F0] px-1 py-0.5 rounded text-ink-muted">
                    {p.label}
                  </span>
                </div>
                <div className="line-clamp-2 text-ink-secondary text-[11px] leading-snug">
                  {p.title}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Two-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Ingestion Input Form */}
        <div className="lg:col-span-7 bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-5">
          <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="space-y-4"
          >
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="headline-input"
                  className="text-xs font-semibold uppercase tracking-wider text-ink"
                >
                  News Headline / Lead <span className="text-crimson">*</span>
                </label>
                <span className="text-[11px] font-mono text-ink-muted tabular-nums">
                  {headline.length} chars
                </span>
              </div>
              <input
                id="headline-input"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. European Central Bank holds rates steady amid cooling inflation indicators..."
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-border-light rounded-sm focus:outline-none focus:border-forest text-ink placeholder-ink-muted/50 transition-colors font-sans"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="body-input"
                  className="text-xs font-semibold uppercase tracking-wider text-ink"
                >
                  Story Body / Wire Content{' '}
                  <span className="text-ink-muted font-normal lowercase">(optional)</span>
                </label>
                <span className="text-[11px] font-mono text-ink-muted tabular-nums">
                  {wordCount} words · {charCount} chars
                </span>
              </div>
              <textarea
                id="body-input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Paste the full dispatch, quotes, or article body text for higher-resolution term frequency weighting..."
                rows={7}
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-border-light rounded-sm focus:outline-none focus:border-forest text-ink placeholder-ink-muted/50 transition-colors font-sans leading-relaxed"
              />
            </div>

            {error && (
              <AlertBox
                variant="error"
                title="Classification Notice"
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border-light">
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading || (!headline && !body)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Draft
              </button>

              <button
                type="submit"
                disabled={isLoading || !headline.trim()}
                className="brutal-btn inline-flex items-center gap-2 px-6 py-2.5 bg-forest text-white text-xs font-semibold tracking-wide uppercase hover:bg-forest-dark disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Executing Spark Pipeline...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Classify Wire Story
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (5 cols): Floating Glass Inspector */}
        <div className="lg:col-span-5 space-y-4">
          {result ? (
            <div className="glass-floating brutal-accent rounded-sm p-6 space-y-6 animate-fadeIn">
              <div className="flex items-start justify-between pb-4 border-b border-border-light">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider mb-1">
                    Assigned Desk
                  </div>
                  <div className="flex items-center gap-3">
                    <CategoryBadge
                      category={result.predicted_category}
                      size="lg"
                    />
                    <span className="text-2xl font-serif font-medium text-ink tabular-nums">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                    Execution
                  </div>
                  <div className="text-xs font-mono font-medium text-ink tabular-nums mt-1 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3 text-ink-muted" />
                    {result.latency_ms.toFixed(1)} ms
                  </div>
                </div>
              </div>

              {/* Uncertainty Guidance Banner */}
              {result.is_uncertain ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Uncertain Classification:</span> The
                    highest class score ({(result.confidence * 100).toFixed(1)}%) is below
                    the 45% threshold. Manual editorial oversight is advised.
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-forest-light/40 border border-forest/20 rounded-sm flex items-start gap-2.5 text-xs text-forest-dark leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Decisive Match:</span> High-confidence
                    vocabulary projection matching the {result.predicted_category} desk.
                  </div>
                </div>
              )}

              {/* Softmax Probability Distribution */}
              <div>
                <div className="text-xs uppercase font-semibold text-ink mb-3 flex items-center justify-between">
                  <span>Class Probability Breakdown</span>
                  <span className="text-[10px] text-ink-muted font-mono font-normal">
                    Softmax
                  </span>
                </div>
                <div className="space-y-3">
                  {Object.entries(result.class_scores || {}).map(([cat, score]) => {
                    const isWinner = cat === result.predicted_category;
                    const pct = Math.round(score * 100);
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span
                            className={
                              isWinner ? 'font-bold text-forest-dark' : 'text-ink-secondary'
                            }
                          >
                            {cat}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-ink">
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-[#EAEAE5] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isWinner ? 'bg-forest' : 'bg-ink-muted/30'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Forensic Pipeline Explanation */}
              <div className="pt-4 border-t border-border-light space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                  <Info className="w-3.5 h-3.5 text-ink-muted" />
                  <span>Pipeline Explanation & Governance</span>
                </div>
                <p className="text-xs text-ink-secondary leading-relaxed bg-[#F4F4F0] p-3 rounded-sm border border-border-light">
                  {result.explanation}
                </p>
                <div className="flex items-center justify-between text-[10px] text-ink-muted font-mono pt-1">
                  <span>Model: {result.model_version}</span>
                  <span>Spark MLlib 4.2.0</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-subtle rounded-sm p-12 text-center text-ink-muted flex flex-col items-center justify-center min-h-[360px]">
              <Cpu className="w-10 h-10 text-ink-muted/40 mb-3" />
              <h3 className="font-serif text-base font-medium text-ink mb-1">
                Awaiting Wire Dispatch
              </h3>
              <p className="text-xs text-ink-muted max-w-xs leading-relaxed">
                Enter a news headline on the left or select an editorial preset above to execute real-time Spark MLlib inference.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
