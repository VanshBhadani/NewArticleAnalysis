import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import { ValidationSummaryResponse, BatchJobResponse } from '../api/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AlertBox } from '../components/ui/AlertBox';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertOctagon,
  Download,
  Play,
  RotateCcw,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export const BatchProcessingPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationSummaryResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deduplicate, setDeduplicate] = useState(true);
  const [activeJob, setActiveJob] = useState<BatchJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Invalid file format. Please upload a standard CSV file (.csv).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File exceeds maximum upload threshold of 25MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setValidation(null);
    setActiveJob(null);
    setIsValidating(true);

    try {
      const summary = await api.validateBatchCsv(file);
      setValidation(summary);
    } catch (err: any) {
      setError(err.message || 'CSV schema inspection failed.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmitBatch = async () => {
    if (!selectedFile || !validation) return;
    if (validation.accepted_records === 0) {
      setError('Cannot submit batch: no records met schema quality standards.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const job = await api.submitBatchJob(selectedFile, deduplicate);
      setActiveJob(job);
    } catch (err: any) {
      setError(err.message || 'Failed to submit batch processing job to Spark engine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setValidation(null);
    setActiveJob(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentStep = activeJob ? 4 : validation ? 2 : 1;

  return (
    <div className="space-y-8 max-w-6xl animate-fadeIn">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-4 border-b border-border-light gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-forest" />
            <span className="text-xs uppercase tracking-wider font-semibold text-forest-dark font-sans">
              Distributed Data Engine
            </span>
          </div>
          <h1 className="font-serif text-3xl font-normal tracking-tight text-ink">
            Batch Ingestion & Processing
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-1 leading-relaxed">
            Scalable news archive ingestion, schema auto-detection, quality filtering, and parallel Spark MLlib execution.
          </p>
        </div>

        <a
          href={api.getBatchTemplateUrl()}
          download="newspulse_template.csv"
          className="brutal-btn inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-ink bg-white hover:bg-[#F4F4F0] shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-forest" />
          Download Sample Template
        </a>
      </div>

      {/* Step Sequence Indicator */}
      <div className="grid grid-cols-3 gap-2 text-xs font-sans">
        <div
          className={`p-2.5 border rounded-sm flex items-center gap-2 transition-all ${
            currentStep === 1
              ? 'border-forest bg-forest-light/60 text-forest-dark font-medium shadow-sm'
              : currentStep > 1
              ? 'border-border-light bg-white text-ink'
              : 'border-border-light bg-[#F4F4F0] text-ink-muted'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-forest text-white text-[10px] flex items-center justify-center font-bold">
            1
          </span>
          <span>Upload Archive</span>
        </div>

        <div
          className={`p-2.5 border rounded-sm flex items-center gap-2 transition-all ${
            currentStep === 2
              ? 'border-forest bg-forest-light/60 text-forest-dark font-medium shadow-sm'
              : currentStep > 2
              ? 'border-border-light bg-white text-ink'
              : 'border-border-light bg-[#F4F4F0] text-ink-muted'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-forest text-white text-[10px] flex items-center justify-center font-bold">
            2
          </span>
          <span>Schema Quality Audit</span>
        </div>

        <div
          className={`p-2.5 border rounded-sm flex items-center gap-2 transition-all ${
            currentStep === 4
              ? 'border-forest bg-forest-light/60 text-forest-dark font-medium shadow-sm'
              : 'border-border-light bg-[#F4F4F0] text-ink-muted'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-forest text-white text-[10px] flex items-center justify-center font-bold">
            3
          </span>
          <span>Execution Receipt</span>
        </div>
      </div>

      {error && (
        <AlertBox
          variant="error"
          title="Batch Notice"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Step 1: Upload Dropzone */}
      {!validation && !activeJob && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-sm p-14 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-forest bg-forest-light/30 scale-[0.99]'
              : 'border-border-light hover:border-forest/60 bg-surface'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-forest-light flex items-center justify-center text-forest-dark">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="font-serif text-lg font-medium text-ink">
                Drop your news archive CSV here, or{' '}
                <span className="text-forest underline underline-offset-2">browse files</span>
              </p>
              <p className="text-xs text-ink-muted mt-1.5 max-w-md mx-auto leading-relaxed">
                Accepts RFC 4180 CSV files up to 25MB. Columns will be auto-mapped to title, description, and body fields.
              </p>
            </div>
            {isValidating && (
              <div className="flex items-center gap-2 text-xs text-forest font-medium pt-3">
                <div className="w-4 h-4 border-2 border-forest border-t-transparent rounded-full animate-spin" />
                Validating schema and record integrity...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Quality Review & Configuration */}
      {validation && !activeJob && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-light gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-forest-light/60 border border-forest/20 rounded text-forest-dark">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-medium text-ink text-base">
                    {selectedFile?.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <span>{((selectedFile?.size || 0) / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>Detected {validation.detected_columns.length} columns</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Upload Different File
              </button>
            </div>

            {/* Validation Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#F4F4F0] rounded-sm border border-border-light">
                <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                  Total Parsed
                </div>
                <div className="text-xl font-serif font-medium text-ink tabular-nums mt-0.5">
                  {validation.total_records.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-forest-light/40 rounded-sm border border-forest/20">
                <div className="text-[10px] uppercase font-semibold text-forest-dark tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-forest" />
                  Valid for Spark
                </div>
                <div className="text-xl font-serif font-medium text-forest-dark tabular-nums mt-0.5">
                  {validation.accepted_records.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-sm border border-amber-200">
                <div className="text-[10px] uppercase font-semibold text-amber-900 tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-700" />
                  Duplicates
                </div>
                <div className="text-xl font-serif font-medium text-amber-900 tabular-nums mt-0.5">
                  {validation.duplicate_records.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-sm border border-red-200">
                <div className="text-[10px] uppercase font-semibold text-crimson tracking-wider flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3 text-crimson" />
                  Rejected Rows
                </div>
                <div className="text-xl font-serif font-medium text-crimson tabular-nums mt-0.5">
                  {validation.rejected_records.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Column Mapping Preview */}
            <div>
              <h4 className="text-xs uppercase font-semibold text-ink-muted tracking-wider mb-2">
                Fuzzy Column Mapping Resolution
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {Object.entries(validation.column_mapping).map(([target, source]) => (
                  <div
                    key={target}
                    className="p-2.5 bg-[#F9F9F7] border border-border-light rounded-sm flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-ink-muted font-medium">{target}</span>
                    <ArrowRight className="w-3 h-3 text-ink-muted" />
                    <span className="font-semibold text-forest-dark bg-forest-light px-1.5 py-0.5 rounded">
                      {source || 'Not Found'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingestion Configuration Controls */}
            <div className="pt-4 border-t border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deduplicate}
                  onChange={(e) => setDeduplicate(e.target.checked)}
                  className="rounded border-border-light text-forest focus:ring-forest"
                />
                <span className="text-xs text-ink">
                  Deduplicate records by headline fingerprint before classification
                </span>
              </label>

              <button
                type="button"
                onClick={handleSubmitBatch}
                disabled={isSubmitting || validation.accepted_records === 0}
                className="brutal-btn inline-flex items-center gap-2 px-6 py-2.5 bg-forest text-white text-xs font-semibold tracking-wide uppercase hover:bg-forest-dark disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Executing Spark Pipeline...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Submit {validation.accepted_records.toLocaleString()} Articles to Spark
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Execution Receipt Banner */}
      {activeJob && (
        <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-light gap-3">
            <div>
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider mb-1">
                Batch Job Execution Receipt
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-ink">
                  {activeJob.job_id}
                </span>
                <StatusBadge status={activeJob.status} />
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="brutal-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-ink bg-white hover:bg-[#F4F4F0]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ingest Another Batch
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-[#F4F4F0] rounded-sm border border-border-light">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Processed Articles
              </div>
              <div className="text-xl font-serif font-medium text-ink tabular-nums mt-0.5">
                {activeJob.processed_records.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-[#F4F4F0] rounded-sm border border-border-light">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Execution Duration
              </div>
              <div className="text-xl font-serif font-medium text-ink tabular-nums mt-0.5">
                {activeJob.duration_seconds.toFixed(2)}s
              </div>
            </div>
            <div className="p-3 bg-[#F4F4F0] rounded-sm border border-border-light">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Spark Throughput
              </div>
              <div className="text-xl font-serif font-medium text-forest-dark tabular-nums mt-0.5">
                {Math.round(activeJob.throughput)} art/s
              </div>
            </div>
            <div className="p-3 bg-[#F4F4F0] rounded-sm border border-border-light">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Storage Destination
              </div>
              <div className="text-xs font-mono font-medium text-ink truncate mt-1">
                {activeJob.storage_backend}
              </div>
            </div>
          </div>

          <div className="bg-[#F4F4F0] p-4 rounded-sm border border-border-light space-y-2 text-xs">
            <div className="flex justify-between items-center text-ink-secondary">
              <span className="font-semibold text-ink">Artifact Location:</span>
              <span className="font-mono text-[11px] truncate max-w-md">
                {activeJob.output_location}
              </span>
            </div>
            <div className="flex justify-between items-center text-ink-secondary">
              <span className="font-semibold text-ink">Fitted MLlib Model:</span>
              <span className="font-mono text-[11px]">{activeJob.model_version}</span>
            </div>
            <div className="flex justify-between items-center text-ink-secondary">
              <span className="font-semibold text-ink">Execution Engine:</span>
              <span>{activeJob.execution_mode}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
