import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { OverviewResponse } from '../api/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { PageId } from '../components/layout/Sidebar';
import {
  ArrowRight,
  Layers,
  Zap,
  RotateCcw,
  Sparkles,
  Server,
  Cloud,
  CheckCircle2,
  TrendingUp,
  Percent,
  Compass,
} from 'lucide-react';

interface Props {
  onNavigate: (page: PageId) => void;
}

export const OverviewPage: React.FC<Props> = ({ onNavigate }) => {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await api.getOverview();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load newsroom telemetry.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-[#EAEAE5] rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-64 bg-[#EAEAE5] rounded" />
          <div className="lg:col-span-5 h-64 bg-[#EAEAE5] rounded" />
        </div>
      </div>
    );
  }

  const categoryEntries = data?.category_distribution
    ? Object.entries(data.category_distribution)
    : [];

  const totalCatArticles = categoryEntries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="space-y-8 max-w-7xl animate-fadeIn">
      {/* Editorial Cockpit Masthead */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-border-light gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-forest" />
            <span className="text-xs uppercase tracking-wider font-semibold text-forest-dark font-sans">
              Newsroom Operations & Intelligence
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-normal tracking-tight text-ink">
            Editorial Dispatch Cockpit
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-1.5 max-w-2xl leading-relaxed">
            Real-time wire ingestion, distributed Spark MLlib classification throughput, and multi-desk editorial analytics.
          </p>
        </div>

        {/* Primary Neo-Brutalist Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('classify')}
            className="brutal-btn inline-flex items-center gap-1.5 px-4 py-2 bg-surface text-ink text-xs font-semibold tracking-wide uppercase hover:bg-[#F4F4F0]"
          >
            <Zap className="w-3.5 h-3.5 text-forest" />
            Classify Wire Story
          </button>
          <button
            type="button"
            onClick={() => onNavigate('batches')}
            className="brutal-btn inline-flex items-center gap-1.5 px-4 py-2 bg-forest text-white text-xs font-semibold tracking-wide uppercase hover:bg-forest-dark"
          >
            <Layers className="w-3.5 h-3.5" />
            Ingest News Archive
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-crimson text-xs rounded-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadOverview} className="underline font-semibold ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Asymmetric Core Telemetry Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Section (7 cols): Operational Console & Category Allocation */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dense Operational Data Block */}
          <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <h2 className="font-serif text-lg font-medium text-ink">
                Pipeline Processing Metrics
              </h2>
              <span className="text-[11px] font-mono text-ink-muted">
                Spark Context: Active
              </span>
            </div>

            {/* Dense 4-way Operational Stats without generic card wrappers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-1">
              <div className="space-y-0.5">
                <div className="text-[11px] text-ink-muted font-medium">Active Articles</div>
                <div className="font-serif text-2xl font-medium text-ink tabular-nums">
                  {data?.active_dataset_records.toLocaleString() || '0'}
                </div>
                <div className="text-[10px] text-ink-muted">Loaded in session</div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[11px] text-ink-muted font-medium">Cumulative Processed</div>
                <div className="font-serif text-2xl font-medium text-ink tabular-nums">
                  {data?.cumulative_processed_records.toLocaleString() || '0'}
                </div>
                <div className="text-[10px] text-ink-muted">
                  {data?.cumulative_rejected_records || 0} rejected rows
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[11px] text-ink-muted font-medium">Spark Throughput</div>
                <div className="font-serif text-2xl font-medium text-forest-dark tabular-nums">
                  {data?.avg_throughput_art_per_sec
                    ? `${data.avg_throughput_art_per_sec.toFixed(1)} art/s`
                    : '—'}
                </div>
                <div className="text-[10px] text-ink-muted">
                  Avg {data?.avg_processing_duration_sec.toFixed(2)}s / run
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[11px] text-ink-muted font-medium">Mean Confidence</div>
                <div className="font-serif text-2xl font-medium text-ink tabular-nums">
                  {data?.average_confidence
                    ? `${(data.average_confidence * 100).toFixed(1)}%`
                    : '—'}
                </div>
                <div className="text-[10px] text-ink-muted">Softmax normalized</div>
              </div>
            </div>

            {/* Live Editorial Desk Distribution Spectrum */}
            <div className="pt-4 border-t border-border-light space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">Editorial Desk Breakdown</span>
                <button
                  onClick={() => onNavigate('articles')}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-forest hover:text-forest-dark transition-colors"
                >
                  Explore in library <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Segmented Proportional Spectrum Bar */}
              {totalCatArticles > 0 ? (
                <div>
                  <div className="h-3 w-full rounded-sm overflow-hidden flex bg-border-light">
                    {categoryEntries.map(([cat, count]) => {
                      const pct = (count / totalCatArticles) * 100;
                      if (pct <= 0) return null;
                      const colors: Record<string, string> = {
                        World: 'bg-[#1E3A8A]',
                        Sports: 'bg-[#047857]',
                        Business: 'bg-[#B45309]',
                        'Sci/Tech': 'bg-[#4338CA]',
                      };
                      return (
                        <div
                          key={cat}
                          style={{ width: `${pct}%` }}
                          className={`${colors[cat] || 'bg-forest'} h-full transition-all duration-500`}
                          title={`${cat}: ${count} articles (${pct.toFixed(1)}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* Desk Legend */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                    {categoryEntries.map(([cat, count]) => {
                      const pct = totalCatArticles > 0 ? (count / totalCatArticles) * 100 : 0;
                      return (
                        <div key={cat} className="flex items-center justify-between p-2 bg-[#F9F9F7] rounded-sm border border-border-light/60">
                          <span className="font-medium text-ink">{cat}</span>
                          <span className="font-mono text-[11px] tabular-nums text-ink-secondary">
                            {count} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#F4F4F0] rounded-sm text-center text-xs text-ink-muted">
                  No articles classified yet in the current session.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section (5 cols): Model Governance & Storage Architecture */}
        <div className="lg:col-span-5 space-y-6">
          {/* Offline Benchmark Snapshot */}
          {data?.benchmark_snapshot && (
            <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-light">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest" />
                  <h3 className="font-serif text-base font-medium text-ink">
                    Benchmark Evaluation
                  </h3>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-forest-light text-forest-dark border border-forest/20">
                  AG News Test Split
                </span>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                Offline evaluation verified against 7,600 held-out test articles using Spark’s MulticlassClassificationEvaluator.
              </p>

              <div className="grid grid-cols-3 gap-3 text-center py-1">
                <div className="p-2.5 bg-[#F9F9F7] rounded-sm border border-border-light">
                  <div className="text-[10px] text-ink-muted font-medium uppercase">Accuracy</div>
                  <div className="font-serif text-xl font-medium text-ink tabular-nums mt-0.5">
                    {(data.benchmark_snapshot.accuracy * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="p-2.5 bg-[#F9F9F7] rounded-sm border border-border-light">
                  <div className="text-[10px] text-ink-muted font-medium uppercase">Weighted F1</div>
                  <div className="font-serif text-xl font-medium text-forest-dark tabular-nums mt-0.5">
                    {(data.benchmark_snapshot.f1_score * 100).toFixed(1)}
                  </div>
                </div>

                <div className="p-2.5 bg-[#F9F9F7] rounded-sm border border-border-light">
                  <div className="text-[10px] text-ink-muted font-medium uppercase">Precision</div>
                  <div className="font-serif text-xl font-medium text-ink tabular-nums mt-0.5">
                    {(data.benchmark_snapshot.weighted_precision * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-ink-muted border-t border-border-light flex justify-between items-center">
                <span>Model: {data.benchmark_snapshot.model_version}</span>
                <button
                  onClick={() => onNavigate('model')}
                  className="text-forest hover:underline font-medium"
                >
                  View ML DAG specs
                </button>
              </div>
            </div>
          )}

          {/* Storage & Persistence Mode Glass Panel */}
          <div className="glass-subtle rounded-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-ink-muted" />
                <h3 className="font-serif text-sm font-medium text-ink">
                  Storage & Persistence Engine
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-border-light text-ink-secondary">
                Zero-Leakage
              </span>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              Predictions, input dispatches, and serialized MLlib artifacts are saved with dual-mode transparent persistence. In local development mode, artifacts write to <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-border-light">data/processed/</code>.
            </p>

            <div className="pt-2 border-t border-border-light/60 flex items-center justify-between text-xs text-ink-muted">
              <span>Engine: <span className="font-mono text-ink">PySpark 4.2.0</span></span>
              <span>Ledger: <span className="font-mono text-ink">SQLite</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Ingestion Batch Jobs */}
      <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-light">
          <div>
            <h2 className="font-serif text-lg font-medium text-ink">
              Recent Ingestion Batch Jobs
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Verified executions recorded in the transactional SQLite audit journal.
            </p>
          </div>
          <button
            onClick={() => onNavigate('jobs')}
            className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-forest-dark transition-colors"
          >
            View Full Audit History <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {data?.recent_jobs && data.recent_jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F4F0] border-b border-border-light text-[11px] font-semibold text-ink-muted uppercase">
                <tr>
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Dataset Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Processed Records</th>
                  <th className="py-2.5 px-3 text-right">Duration</th>
                  <th className="py-2.5 px-3 text-right">Throughput</th>
                  <th className="py-2.5 px-3 text-right">Submission Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light bg-white">
                {data.recent_jobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-[#F9F9F7] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-ink">
                      {job.job_id}
                    </td>
                    <td className="py-2.5 px-3 text-ink-secondary truncate max-w-xs">
                      {job.dataset_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-ink">
                      {job.processed_records.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-ink">
                      {job.duration_seconds.toFixed(2)}s
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-forest-dark">
                      {Math.round(job.throughput)} art/s
                    </td>
                    <td className="py-2.5 px-3 text-right text-ink-muted text-[11px]">
                      {job.submission_time.replace('T', ' ').substring(0, 19)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-ink-muted bg-[#F4F4F0] rounded-sm">
            No batch jobs recorded in the journal yet. Ingest an archive from the Batch Processing page to see execution traces here.
          </div>
        )}
      </div>
    </div>
  );
};
