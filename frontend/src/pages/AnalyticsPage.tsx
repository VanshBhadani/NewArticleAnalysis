import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AnalyticsResponse } from '../api/types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import {
  BarChart3,
  TrendingUp,
  Percent,
  CheckCircle,
  HelpCircle,
  Clock,
  Layers,
  Activity,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api
      .getAnalytics()
      .then((res) => setData(res))
      .catch((err) => setError(err.message || 'Failed to fetch analytics metrics.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-ink-muted flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs">Aggregating analytical distributions across Spark jobs...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-sm text-crimson text-xs max-w-xl">
        {error || 'Analytics unavailable.'}
      </div>
    );
  }

  const benchmark = data.model_benchmark_metrics;
  const catEntries = Object.entries(data.category_distribution || {});
  const totalCatRecords = catEntries.reduce((sum, [, count]) => sum + count, 0);

  // Maximum count for confidence distribution to scale bars
  const maxConfCount = Math.max(...(data.confidence_distribution?.counts || [1]));

  return (
    <div className="space-y-8 max-w-7xl">
      <SectionHeader
        title="Editorial Analytics & Model Telemetry"
        subtitle="Distribution curves, throughput dynamics, and rigorous offline evaluation benchmarks."
        badge="Audit & Evaluation Suite"
      />

      {/* Top Benchmark KPI Grid */}
      {benchmark && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Benchmark Accuracy"
            value={`${(benchmark.accuracy * 100).toFixed(1)}%`}
            description="Verified against 7,600 held-out test articles"
            icon={<CheckCircle className="w-4 h-4 text-forest" />}
            trend="AG News Benchmark"
          />
          <MetricCard
            label="Weighted F1-Score"
            value={(benchmark.f1_score * 100).toFixed(1)}
            description="Harmonic mean of precision and recall"
            icon={<Percent className="w-4 h-4 text-teal" />}
          />
          <MetricCard
            label="Weighted Precision"
            value={`${(benchmark.weighted_precision * 100).toFixed(1)}%`}
            description="True positive proportion across all desks"
            icon={<TrendingUp className="w-4 h-4 text-cobalt" />}
          />
          <MetricCard
            label="Active Ingested News"
            value={data.total_active_records.toLocaleString()}
            description="Unlabeled records processed through Spark"
            icon={<Layers className="w-4 h-4 text-ink-muted" />}
          />
        </div>
      )}

      {/* Grid: Category Distribution & Confidence Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-light">
            <h3 className="font-serif text-base font-medium text-ink">
              Production Category Allocation
            </h3>
            <span className="text-xs text-ink-muted tabular-nums">
              {totalCatRecords.toLocaleString()} total items
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {catEntries.map(([cat, count]) => {
              const pct = totalCatRecords > 0 ? (count / totalCatRecords) * 100 : 0;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={cat} size="sm" />
                      <span className="text-ink-secondary text-xs">{count.toLocaleString()} stories</span>
                    </div>
                    <span className="font-mono text-ink tabular-nums font-semibold">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#F4F4F0] h-2.5 rounded-sm overflow-hidden border border-border-light">
                    <div
                      className="h-full bg-forest transition-all duration-500 rounded-sm"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-light">
            <h3 className="font-serif text-base font-medium text-ink">
              Inference Confidence Histogram
            </h3>
            <span className="text-xs text-ink-muted">Threshold: 45%</span>
          </div>

          <div className="space-y-3 pt-2">
            {data.confidence_distribution?.labels.map((binLabel, idx) => {
              const count = data.confidence_distribution.counts[idx] || 0;
              const barPct = maxConfCount > 0 ? (count / maxConfCount) * 100 : 0;
              return (
                <div key={binLabel} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-ink-muted text-[11px]">{binLabel}</span>
                    <span className="font-mono text-ink font-medium tabular-nums">
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-[#F4F4F0] h-2 rounded-sm overflow-hidden border border-border-light">
                    <div
                      className={`h-full transition-all duration-500 ${
                        binLabel.startsWith('0.2') || binLabel.startsWith('0.3')
                          ? 'bg-amber-500'
                          : 'bg-teal'
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confusion Matrix & Per-Class Evaluation */}
      {benchmark && benchmark.confusion_matrix && benchmark.per_class && (
        <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-light gap-2">
            <div>
              <h3 className="font-serif text-lg font-medium text-ink">
                Model Evaluation & Confusion Heatmap
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Evaluated on true AG News benchmark test partitions across all 4 news categories.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-ink-muted bg-[#F4F4F0] px-3 py-1.5 rounded-sm border border-border-light">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Rows = Ground Truth, Cols = Spark Predicted</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Confusion Matrix Table */}
            <div className="lg:col-span-6 overflow-x-auto">
              <div className="text-xs uppercase font-semibold text-ink-muted tracking-wider mb-2">
                Confusion Matrix Counts
              </div>
              <table className="w-full text-center border-collapse text-xs border border-border-light">
                <thead>
                  <tr className="bg-[#F4F4F0] text-[11px] font-semibold text-ink-muted uppercase">
                    <th className="p-2 border border-border-light text-left">Truth \ Pred</th>
                    {benchmark.confusion_matrix.labels.map((lbl) => (
                      <th key={lbl} className="p-2 border border-border-light">
                        {lbl}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benchmark.confusion_matrix.labels.map((rowLabel, rIdx) => (
                    <tr key={rowLabel} className="hover:bg-[#F9F9F7]">
                      <td className="p-2 border border-border-light text-left font-semibold text-ink">
                        {rowLabel}
                      </td>
                      {benchmark.confusion_matrix!.matrix[rIdx]?.map((val, cIdx) => {
                        const isDiagonal = rIdx === cIdx;
                        return (
                          <td
                            key={cIdx}
                            className={`p-2 border border-border-light font-mono tabular-nums ${
                              isDiagonal
                                ? 'bg-forest-light/60 font-bold text-forest-dark'
                                : val > 100
                                ? 'bg-amber-50 text-amber-900'
                                : 'text-ink-muted'
                            }`}
                          >
                            {val.toLocaleString()}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Per-Class Precision & Recall */}
            <div className="lg:col-span-6 space-y-4">
              <div className="text-xs uppercase font-semibold text-ink-muted tracking-wider mb-2">
                Per-Class Precision, Recall & F1
              </div>
              <div className="overflow-x-auto border border-border-light rounded-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F4F4F0] text-[11px] font-semibold text-ink-muted uppercase border-b border-border-light">
                    <tr>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Precision</th>
                      <th className="p-2.5 text-right">Recall</th>
                      <th className="p-2.5 text-right">F1-Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light bg-white">
                    {Object.entries(benchmark.per_class).map(([className, m]) => (
                      <tr key={className} className="hover:bg-[#F9F9F7]">
                        <td className="p-2.5 font-medium text-ink">{className}</td>
                        <td className="p-2.5 text-right font-mono tabular-nums text-ink">
                          {(m.precision * 100).toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-right font-mono tabular-nums text-ink">
                          {(m.recall * 100).toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-right font-mono tabular-nums font-semibold text-forest-dark">
                          {(m.f1 * 100).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Throughput History */}
      {data.throughput_history && data.throughput_history.length > 0 && (
        <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-light">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-forest" />
              <h3 className="font-serif text-base font-medium text-ink">
                Execution Throughput Log
              </h3>
            </div>
            <span className="text-xs text-ink-muted">Articles / Second</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F4F0] text-[11px] font-semibold text-ink-muted uppercase border-b border-border-light">
                <tr>
                  <th className="p-2.5">Job ID</th>
                  <th className="p-2.5 text-right">Records</th>
                  <th className="p-2.5 text-right">Duration</th>
                  <th className="p-2.5 text-right">Throughput</th>
                  <th className="p-2.5 text-right">Submission Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light bg-white">
                {data.throughput_history.map((j) => (
                  <tr key={j.job_id} className="hover:bg-[#F9F9F7]">
                    <td className="p-2.5 font-mono text-[11px] text-ink">{j.job_id}</td>
                    <td className="p-2.5 text-right font-mono tabular-nums text-ink">
                      {j.processed_records.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-mono tabular-nums text-ink">
                      {j.duration_seconds.toFixed(2)}s
                    </td>
                    <td className="p-2.5 text-right font-mono tabular-nums font-semibold text-forest-dark">
                      {Math.round(j.throughput)} art/s
                    </td>
                    <td className="p-2.5 text-right text-ink-muted text-[11px]">
                      {j.submission_time.replace('T', ' ').substring(0, 19)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
