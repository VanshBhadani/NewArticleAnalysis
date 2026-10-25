import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { InfrastructureResponse } from '../api/types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { AlertBox } from '../components/ui/AlertBox';
import {
  Server,
  Cloud,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Activity,
  ShieldCheck,
  Cpu,
  Layers,
} from 'lucide-react';

export const InfrastructurePage: React.FC = () => {
  const [infra, setInfra] = useState<InfrastructureResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live S3 Ping state
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<Record<string, any> | null>(null);

  const fetchInfra = () => {
    setIsLoading(true);
    setError(null);
    api
      .getInfrastructure()
      .then((res) => setInfra(res))
      .catch((err) => setError(err.message || 'Failed to inspect infrastructure status.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchInfra();
  }, []);

  const handlePingS3 = async () => {
    setIsPinging(true);
    try {
      const res = await api.pingS3();
      setPingResult(res);
      fetchInfra(); // refresh storage diagnostics
    } catch (err: any) {
      setPingResult({ status: 'error', message: err.message || 'S3 ping failed' });
    } finally {
      setIsPinging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-ink-muted flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs">Inspecting Spark execution context and cloud connectors...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <SectionHeader
        title="Infrastructure & Cloud Topology"
        subtitle="Operational diagnostics across the Apache Spark cluster engine, AWS S3 storage adapters, and local environment."
        badge="Zero-Hallucination Telemetry"
        actions={
          <button
            type="button"
            onClick={fetchInfra}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-ink bg-surface border border-border-light rounded-sm hover:border-ink-muted transition-colors shadow-subtle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh Diagnostics
          </button>
        }
      />

      {error && (
        <AlertBox
          variant="error"
          title="Telemetry Exception"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {infra && (
        <>
          {/* Top Diagnostics KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Execution Mode
              </div>
              <div className="font-serif text-sm font-medium text-ink mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-forest" />
                {infra.execution_mode}
              </div>
            </div>
            <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Spark Engine
              </div>
              <div className="font-mono text-sm font-medium text-ink mt-1">
                PySpark {infra.spark_diagnostics.spark_version || '4.2.0'}
              </div>
            </div>
            <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Storage Adapter
              </div>
              <div className="font-serif text-sm font-medium text-forest-dark mt-1">
                {infra.storage_diagnostics.storage_mode}
              </div>
            </div>
            <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Python Runtime
              </div>
              <div className="font-mono text-xs font-medium text-ink-secondary mt-1">
                {infra.python_version}
              </div>
            </div>
          </div>

          {/* Grid: Spark Diagnostics & S3 Storage Cloud Adapter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Spark Engine Diagnostics */}
            <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border-light">
                <Cpu className="w-4 h-4 text-forest" />
                <h3 className="font-serif text-base font-medium text-ink">
                  Spark Context & Worker Topology
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {Object.entries(infra.spark_diagnostics).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between items-center py-1.5 border-b border-border-light/60 last:border-0"
                  >
                    <span className="text-ink-secondary font-medium capitalize">
                      {k.replace(/_/g, ' ')}:
                    </span>
                    <span className="font-mono text-ink text-[11px] max-w-xs truncate">
                      {typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AWS S3 Adapter & Diagnostics */}
            <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-light">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-cobalt" />
                  <h3 className="font-serif text-base font-medium text-ink">
                    AWS S3 Object Storage State
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handlePingS3}
                  disabled={isPinging}
                  className="brutal-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-forest hover:bg-forest-dark disabled:opacity-50"
                >
                  {isPinging ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Activity className="w-3 h-3" />
                  )}
                  Ping Storage
                </button>
              </div>

              {pingResult && (
                <div
                  className={`p-3 rounded-sm border text-xs ${
                    pingResult.status === 'succeeded'
                      ? 'bg-forest-light/40 border-forest/30 text-forest-dark'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    {pingResult.status === 'succeeded' ? (
                      <CheckCircle2 className="w-4 h-4 text-forest" />
                    ) : (
                      <XCircle className="w-4 h-4 text-amber-700" />
                    )}
                    Storage Test: {pingResult.status.toUpperCase()}
                  </div>
                  <div className="text-[11px] mt-1 font-mono">{pingResult.message}</div>
                </div>
              )}

              <div className="space-y-3 text-xs">
                {Object.entries(infra.storage_diagnostics).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between items-center py-1.5 border-b border-border-light/60 last:border-0"
                  >
                    <span className="text-ink-secondary font-medium capitalize">
                      {k.replace(/_/g, ' ')}:
                    </span>
                    <span className="font-mono text-ink text-[11px] max-w-xs truncate">
                      {typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sanitized Environment Configuration */}
          <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-forest" />
                <h3 className="font-serif text-base font-medium text-ink">
                  Sanitized Runtime Configuration Manifest
                </h3>
              </div>
              <span className="text-[11px] text-ink-muted">Secrets securely redacted</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(infra.sanitized_config).map(([key, val]) => (
                <div
                  key={key}
                  className="p-3 bg-[#F4F4F0] border border-border-light rounded-sm space-y-1"
                >
                  <div className="text-[10px] font-mono font-semibold text-ink-muted uppercase">
                    {key}
                  </div>
                  <div className="text-xs font-mono text-ink truncate font-medium">
                    {val || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
