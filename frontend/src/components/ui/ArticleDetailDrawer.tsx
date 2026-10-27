import React, { useEffect } from 'react';
import { ArticleItem } from '../../api/types';
import { CategoryBadge } from './CategoryBadge';
import { getCategoryColor } from '../../utils/colors';
import { X, Calendar, Globe, AlertTriangle, ShieldCheck, Tag, ExternalLink } from 'lucide-react';

interface Props {
  article: ArticleItem | null;
  onClose: () => void;
}

export const ArticleDetailDrawer: React.FC<Props> = ({ article, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!article) return null;

  const color = getCategoryColor(article.predicted_category);
  const confidencePct = (article.confidence * 100).toFixed(1);
  const isDecisive = article.confidence >= 0.45 && !article.is_uncertain;

  // Extract softmax probabilities if present
  const classScores: Array<{ label: string; val: number }> = [
    { label: 'World', val: article.prob_world ?? 0 },
    { label: 'Sports', val: article.prob_sports ?? 0 },
    { label: 'Business', val: article.prob_business ?? 0 },
    { label: 'Sci/Tech', val: article.prob_scitech ?? 0 },
  ].filter((item) => item.val > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end glass-overlay animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-dossier-title"
    >
      <div
        className="w-full max-w-xl h-full glass-floating border-l border-border-light shadow-2xl p-6 overflow-y-auto space-y-6 bg-surface/95 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border-light gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Story Dossier & Telemetry
              </span>
            </div>
            <h2
              id="article-dossier-title"
              className="font-serif text-xl font-normal text-ink leading-snug"
            >
              {article.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-[#EAEAE5] rounded transition-colors shrink-0"
            aria-label="Close story dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted py-1 border-b border-border-light/60">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Editorial Wire Services</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Recent Ingestion</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span>ID:</span>
            <span className="text-ink font-semibold">{article.article_id}</span>
          </div>
        </div>

        {/* Lead Dispatch Excerpt */}
        {article.description && (
          <div>
            <div className="text-xs uppercase font-semibold text-ink-muted tracking-wider mb-1.5">
              Lead Dispatch & Summary
            </div>
            <p className="text-xs text-ink-secondary bg-white p-3.5 rounded-sm border border-border-light leading-relaxed shadow-subtle">
              {article.description}
            </p>
          </div>
        )}

        {/* Classification KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3.5 bg-white rounded-sm border border-border-light shadow-subtle space-y-1">
            <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
              Assigned Category
            </div>
            <div className="pt-0.5">
              <CategoryBadge category={article.predicted_category} size="md" />
            </div>
            {article.subcategory && (
              <div className="flex items-center gap-1 text-[11px] text-ink-secondary mt-1">
                <Tag className="w-3 h-3 text-ink-muted" />
                <span className="font-medium text-ink">{article.subcategory}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 bg-white rounded-sm border border-border-light shadow-subtle space-y-1">
            <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
              Model Confidence
            </div>
            <div className="text-2xl font-serif font-medium text-ink tabular-nums">
              {confidencePct}%
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              {isDecisive ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                  <span className="text-forest font-semibold">Decisive Match</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-700 font-semibold">Requires Review</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Calculated Softmax Distribution */}
        {classScores.length > 0 && (
          <div>
            <div className="text-xs uppercase font-semibold text-ink-muted tracking-wider mb-2">
              Calculated Softmax Scores
            </div>
            <div className="space-y-2.5 bg-white p-4 rounded-sm border border-border-light shadow-subtle">
              {classScores.map((item) => {
                const pct = Math.round((item.val || 0) * 100);
                const isWinner = item.label.toLowerCase() === article.predicted_category.toLowerCase();
                const itemColor = getCategoryColor(item.label);
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={isWinner ? 'font-bold text-ink' : 'text-ink-secondary'}>
                        {item.label}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums font-semibold">{pct}%</span>
                    </div>
                    <div className="w-full bg-[#EAEAE5] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isWinner ? itemColor : '#94A3B8',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Combined Text Ingestion Excerpt */}
        {article.combined_text && (
          <div>
            <div className="text-xs uppercase font-semibold text-ink-muted tracking-wider mb-1.5">
              Full Journalistic Ingestion Text
            </div>
            <div className="text-[11px] font-mono text-ink-secondary bg-[#F9F9F7] p-3 rounded-sm border border-border-light leading-relaxed max-h-40 overflow-y-auto">
              {article.combined_text}
            </div>
          </div>
        )}

        {/* Drawer Action Bar */}
        <div className="pt-4 border-t border-border-light flex justify-between items-center">
          <div className="text-[11px] text-ink-muted font-mono">
            Model: <span className="text-ink font-semibold">Spark MLlib v1.0.0-lr</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="brutal-btn px-4 py-2 bg-ink text-white text-xs font-semibold tracking-wide uppercase hover:bg-ink-muted"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
