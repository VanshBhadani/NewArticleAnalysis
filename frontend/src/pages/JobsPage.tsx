import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { BatchJobResponse } from '../api/types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  Clock,
  RotateCcw,
  Eye,
  X,
  FileText,
  AlertCircle,
  Database,
  Cpu,
} from 'lucide-react';

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<BatchJobResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState('All Jobs');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<BatchJobResponse | null>(null);

  const fetchJobs = () => {
    setIsLoading(true);
    setError(null);
    api
      .getJobs(statusFilter !== 'All Jobs' ? statusFilter : undefined)
      .then((res) => setJobs(res))
      .catch((err) => setError(err.message || 'Failed to retrieve job audit trail.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl">
      <SectionHeader
        title="Jobs & Audit History"
        subtitle="Persistent audit ledger recording every batch ingestion, Spark execution lifecycle, and throughput metric."
        badge="SQLite Persistent Ledger"
        actions={
          <button
            type="button"
            onClick={fetchJobs}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-ink bg-surface border border-border-light rounded-sm hover:border-ink-muted transition-colors shadow-subtle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh Audit Ledger
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Filter by Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-border-light rounded-sm px-3 py-1.5 text-ink focus:outline-none focus:border-forest"
          >
            <option value="All Jobs">All Jobs</option>
            <option value="succeeded">Succeeded</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>
        </div>

        <div className="text-xs text-ink-muted tabular-nums">
          Total Recorded: <span className="font-semibold text-ink">{jobs.length}</span> runs
        </div>
      </div>

      {/* Main Jobs Table */}
      <div className="bg-surface border border-border-light rounded-sm shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-ink-muted flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs">Reading immutable audit journal...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-crimson text-xs">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center text-ink-muted flex flex-col items-center justify-center">
            <Clock className="w-8 h-8 text-ink-muted/40 mb-2" />
            <p className="font-serif text-base text-ink font-medium">No Jobs Found</p>
            <p className="text-xs text-ink-muted mt-1 max-w-sm">
              No batch operations have been recorded yet or matched the filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F4F0] border-b border-border-light text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Job Identifier</th>
                  <th className="py-3 px-4">Dataset Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Processed</th>
                  <th className="py-3 px-4 text-right">Duration</th>
                  <th className="py-3 px-4 text-right">Throughput</th>
                  <th className="py-3 px-4 text-right">Submission Time</th>
                  <th className="py-3 px-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light bg-white">
                {jobs.map((job) => (
                  <tr
                    key={job.job_id}
                    className="hover:bg-[#F9F9F7] transition-colors cursor-pointer"
                    onClick={() => setSelectedJob(job)}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-ink">
                      {job.job_id}
                    </td>
                    <td className="py-3 px-4 font-medium text-ink-secondary truncate max-w-xs">
                      {job.dataset_name}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-ink">
                      {job.processed_records.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-ink">
                      {job.duration_seconds.toFixed(2)}s
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-forest-dark">
                      {Math.round(job.throughput)} art/s
                    </td>
                    <td className="py-3 px-4 text-right text-ink-muted text-[11px]">
                      {job.submission_time.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                        className="p-1.5 text-ink-muted hover:text-ink hover:bg-[#F4F4F0] rounded transition-colors"
                        title="View Detailed Job Metrics"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forensic Job Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-fadeIn">
          <div className="glass-floating brutal-accent rounded-sm shadow-2xl max-w-2xl w-full p-6 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-border-light">
              <div>
                <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider mb-1">
                  Job Audit Manifest
                </div>
                <div className="flex items-center gap-3">
                  <h3 className="font-mono text-base font-semibold text-ink">
                    {selectedJob.job_id}
                  </h3>
                  <StatusBadge status={selectedJob.status} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="p-1.5 text-ink-muted hover:text-ink rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#F4F4F0] rounded-sm border border-border-light">
                <span className="text-[10px] uppercase text-ink-muted font-semibold block">
                  Input Records
                </span>
                <span className="font-serif text-lg font-medium text-ink tabular-nums mt-0.5 block">
                  {selectedJob.input_records.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-forest-light/30 rounded-sm border border-forest/20">
                <span className="text-[10px] uppercase text-forest-dark font-semibold block">
                  Processed
                </span>
                <span className="font-serif text-lg font-medium text-forest-dark tabular-nums mt-0.5 block">
                  {selectedJob.processed_records.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-[#F4F4F0] rounded-sm border border-border-light">
                <span className="text-[10px] uppercase text-ink-muted font-semibold block">
                  Failed Records
                </span>
                <span className="font-serif text-lg font-medium text-crimson tabular-nums mt-0.5 block">
                  {selectedJob.failed_records.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-[#F4F4F0] rounded-sm border border-border-light">
                <span className="text-[10px] uppercase text-ink-muted font-semibold block">
                  Throughput
                </span>
                <span className="font-serif text-lg font-medium text-forest-dark tabular-nums mt-0.5 block">
                  {Math.round(selectedJob.throughput)} art/s
                </span>
              </div>
            </div>

            {/* Forensic Detail Rows */}
            <div className="bg-[#F4F4F0] p-4 rounded-sm border border-border-light space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink">Dataset Origin:</span>
                <span className="font-mono text-[11px] text-ink-secondary">
                  {selectedJob.dataset_name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink">Submission Timestamp:</span>
                <span className="font-mono text-[11px] text-ink-secondary">
                  {selectedJob.submission_time}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink">Engine & Execution Mode:</span>
                <span className="text-ink-secondary">{selectedJob.execution_mode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink">Fitted MLlib Model:</span>
                <span className="font-mono text-[11px] text-ink-secondary">
                  {selectedJob.model_version}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink">Storage Backend:</span>
                <span className="font-mono text-[11px] text-ink-secondary">
                  {selectedJob.storage_backend}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink">Artifact Location:</span>
                <span className="font-mono text-[11px] text-ink-secondary truncate max-w-sm">
                  {selectedJob.output_location}
                </span>
              </div>
              {selectedJob.error_summary && (
                <div className="pt-2 border-t border-border-light">
                  <span className="font-semibold text-crimson block mb-1">
                    Sanitized Error Trace:
                  </span>
                  <p className="text-[11px] text-crimson font-mono bg-red-50 p-2 rounded border border-red-200">
                    {selectedJob.error_summary}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 bg-ink text-white text-xs font-semibold rounded-sm hover:bg-ink-muted transition-colors"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
