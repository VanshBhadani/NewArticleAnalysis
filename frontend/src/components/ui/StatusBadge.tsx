import React from 'react';

interface Props {
  status: string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const s = status.toLowerCase();
  let dotColor = 'bg-slate-400';
  let badgeStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (s === 'succeeded' || s === 'verified' || s === 'healthy') {
    dotColor = 'bg-emerald-600';
    badgeStyles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (s === 'running') {
    dotColor = 'bg-blue-600 animate-pulse';
    badgeStyles = 'bg-blue-50 text-blue-800 border-blue-200';
  } else if (s === 'failed' || s.includes('error')) {
    dotColor = 'bg-rose-600';
    badgeStyles = 'bg-rose-50 text-rose-800 border-rose-200';
  } else if (s === 'queued') {
    dotColor = 'bg-amber-500';
    badgeStyles = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border ${badgeStyles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status.toUpperCase()}
    </span>
  );
};
