import React from 'react';

interface Props {
  label: string;
  value: string | number;
  subtext?: string;
  description?: string;
  trend?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<Props> = ({
  label,
  value,
  subtext,
  description,
  trend,
  icon,
  className = '',
}) => {
  const detailText = description || subtext;

  return (
    <div
      className={`bg-surface border border-border-light rounded-sm p-4 shadow-subtle transition-all hover:border-ink-muted/40 ${className}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        {icon && <div className="text-ink-muted">{icon}</div>}
      </div>
      <div className="font-serif text-2xl md:text-3xl font-medium text-ink tabular-nums leading-tight">
        {value}
      </div>
      {(detailText || trend) && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-light/60 text-xs">
          {detailText && <span className="text-ink-muted">{detailText}</span>}
          {trend && (
            <span className="font-medium text-forest-dark bg-forest-light px-1.5 py-0.5 rounded text-[10px]">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
