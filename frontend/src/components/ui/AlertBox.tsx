import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

interface Props {
  type?: 'info' | 'success' | 'warning' | 'error';
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message?: string;
  children?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const AlertBox: React.FC<Props> = ({
  type,
  variant,
  title,
  message,
  children,
  onDismiss,
  className = '',
}) => {
  const alertType = variant || type || 'info';

  const styles = {
    info: {
      bg: 'bg-blue-50/80',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />,
    },
    success: {
      bg: 'bg-emerald-50/80',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />,
    },
    warning: {
      bg: 'bg-amber-50/80',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />,
    },
    error: {
      bg: 'bg-rose-50/80',
      border: 'border-rose-200',
      text: 'text-rose-900',
      icon: <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />,
    },
  }[alertType];

  return (
    <div
      className={`flex items-start justify-between gap-2.5 p-3.5 rounded-sm border text-xs md:text-sm leading-relaxed ${styles.bg} ${styles.border} ${styles.text} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        {styles.icon}
        <div>
          {title && <div className="font-semibold mb-0.5">{title}</div>}
          <div>{message || children}</div>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 hover:opacity-75 transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
