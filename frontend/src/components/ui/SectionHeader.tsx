import React from 'react';

interface Props {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<Props> = ({
  title,
  subtitle,
  badge,
  actions,
  action,
}) => {
  const renderedActions = actions || action;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-6 border-b border-border-light gap-3">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-ink leading-tight">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-forest-light text-forest-dark border border-forest/20">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs md:text-sm text-ink-muted leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {renderedActions && (
        <div className="flex items-center gap-2 pt-2 md:pt-0 shrink-0">
          {renderedActions}
        </div>
      )}
    </div>
  );
};
