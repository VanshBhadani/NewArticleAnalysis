import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ModelLabResponse } from '../api/types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { AlertBox } from '../components/ui/AlertBox';
import {
  FlaskConical,
  GitBranch,
  Sliders,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Layers,
  FileCode,
} from 'lucide-react';

export const ModelLabPage: React.FC = () => {
  const [model, setModel] = useState<ModelLabResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Retrain state
  const [numFeatures, setNumFeatures] = useState(10000);
  const [regParam, setRegParam] = useState(0.01);
  const [maxIter, setMaxIter] = useState(50);
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState<string | null>(null);

  const fetchModel = () => {
    setIsLoading(true);
    setError(null);
    api
      .getModelDetails()
      .then((res) => setModel(res))
      .catch((err) => setError(err.message || 'Failed to retrieve model specifications.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchModel();
  }, []);

  const handleRetrain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRetraining(true);
    setError(null);
    setRetrainSuccess(null);

    try {
      const updated = await api.retrainModel({
        num_features: numFeatures,
        reg_param: regParam,
        max_iter: maxIter,
      });
      setModel(updated);
      setRetrainSuccess(
        `Successfully retrained model ${updated.model_version}. Spark MLlib pipeline fitted and serialized.`
      );
    } catch (err: any) {
      setError(err.message || 'Model training failed.');
    } finally {
      setIsRetraining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-ink-muted flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs">Inspecting fitted Spark MLlib pipeline stages...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <SectionHeader
        title="Model Lab & Governance"
        subtitle="Full transparency into the Spark MLlib feature extraction pipeline, hyperparameters, and offline evaluation."
        badge="Spark MLlib 4.2.0"
        actions={
          <button
            type="button"
            onClick={fetchModel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-ink bg-surface border border-border-light rounded-sm hover:border-ink-muted transition-colors shadow-subtle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload Specs
          </button>
        }
      />

      {error && (
        <AlertBox
          variant="error"
          title="Model Operation Notice"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {retrainSuccess && (
        <AlertBox
          variant="success"
          title="Training Completed"
          message={retrainSuccess}
          onDismiss={() => setRetrainSuccess(null)}
        />
      )}

      {model && (
        <>
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Model Identifier
              </div>
              <div className="font-mono text-sm font-semibold text-ink mt-1 truncate">
                {model.model_version}
              </div>
            </div>
            <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Algorithm Family
              </div>
              <div className="font-serif text-sm font-medium text-ink mt-1">
                {model.algorithm}
              </div>
            </div>
            <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Vocabulary Dimension
              </div>
              <div className="font-serif text-sm font-medium text-forest-dark tabular-nums mt-1">
                {model.hyperparameters?.num_features?.toLocaleString() || '10,000'} features
              </div>
            </div>
            <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle">
              <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Training Dataset
              </div>
              <div className="font-serif text-sm font-medium text-ink mt-1">
                AG News Benchmark
              </div>
            </div>
          </div>

          {/* Pipeline Stages Architecture */}
          <div className="bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border-light">
              <GitBranch className="w-4 h-4 text-forest" />
              <h3 className="font-serif text-base font-medium text-ink">
                Spark MLlib Pipeline DAG & Transformers
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F4F4F0] border-b border-border-light text-[11px] font-semibold text-ink-muted uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Stage #</th>
                    <th className="py-2.5 px-3">Component / Class</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Parameter Specifications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light bg-white">
                  {model.pipeline_stages.map((stg) => (
                    <tr key={stg.stage} className="hover:bg-[#F9F9F7]">
                      <td className="py-2.5 px-3 font-mono text-ink-muted font-semibold">
                        {stg.stage}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-ink font-mono">
                        {stg.type}
                      </td>
                      <td className="py-2.5 px-3 text-ink-secondary">
                        <span className="bg-[#F4F4F0] px-2 py-0.5 rounded text-[10px] font-mono">
                          {stg.type.includes('IDF') || stg.type.includes('Logistic')
                            ? 'Estimator (Fitted)'
                            : 'Transformer'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-ink-secondary">
                        {stg.parameters}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grid: Hyperparameters Retrain & Governance */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Controlled Retraining Form */}
            <div className="lg:col-span-7 bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-border-light">
                <Sliders className="w-4 h-4 text-forest" />
                <h3 className="font-serif text-base font-medium text-ink">
                  Retrain Model & Hyperparameter Tuning
                </h3>
              </div>

              <form onSubmit={handleRetrain} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">
                    HashingTF Feature Dimension: <span className="text-forest font-mono">{numFeatures.toLocaleString()}</span>
                  </label>
                  <input
                    type="range"
                    min={5000}
                    max={25000}
                    step={1000}
                    value={numFeatures}
                    onChange={(e) => setNumFeatures(Number(e.target.value))}
                    disabled={isRetraining}
                    className="w-full accent-forest"
                  />
                  <div className="flex justify-between text-[10px] text-ink-muted font-mono mt-0.5">
                    <span>5,000 (Compact)</span>
                    <span>10,000 (Default)</span>
                    <span>25,000 (High-Dim)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">
                      L2 Regularization (regParam)
                    </label>
                    <input
                      type="number"
                      step={0.005}
                      min={0.001}
                      max={0.5}
                      value={regParam}
                      onChange={(e) => setRegParam(Number(e.target.value))}
                      disabled={isRetraining}
                      className="w-full px-3 py-2 text-xs bg-white border border-border-light rounded-sm focus:outline-none focus:border-forest text-ink font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">
                      Max Iterations
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={maxIter}
                      onChange={(e) => setMaxIter(Number(e.target.value))}
                      disabled={isRetraining}
                      className="w-full px-3 py-2 text-xs bg-white border border-border-light rounded-sm focus:outline-none focus:border-forest text-ink font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-sm text-xs text-amber-900 leading-relaxed">
                  <span className="font-semibold">Resource Notice:</span> Training executes
                  distributed PySpark MLlib optimization over 120,000 training records. Local
                  multi-threading will utilize available CPU cores.
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isRetraining}
                    className="brutal-btn inline-flex items-center gap-2 px-6 py-2.5 bg-forest text-white text-xs font-semibold tracking-wide uppercase hover:bg-forest-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isRetraining ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Fitting Spark Pipeline...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Trigger Spark Retrain
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Model Governance & Limitations */}
            <div className="lg:col-span-5 bg-surface border border-border-light rounded-sm p-6 shadow-subtle space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border-light">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <h3 className="font-serif text-base font-medium text-ink">
                  Editorial Governance & Disclaimers
                </h3>
              </div>

              <div className="space-y-3">
                {model.limitations.map((lim, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#F4F4F0] border border-border-light rounded-sm text-xs text-ink-secondary leading-relaxed flex items-start gap-2"
                  >
                    <span className="font-mono text-ink-muted text-[10px] mt-0.5">
                      [{idx + 1}]
                    </span>
                    <span>{lim}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
