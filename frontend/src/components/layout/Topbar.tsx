import React from 'react';
import { Cloud, Server, Sparkles, RefreshCw, Search, Command } from 'lucide-react';
import { HealthResponse } from '../../api/types';

interface Props {
  currentPageTitle: string;
  health?: HealthResponse;
  onRefresh?: () => void;
  isLoading?: boolean;
  onOpenCommandPalette?: () => void;
}

export const Topbar: React.FC<Props> = ({
  currentPageTitle,
  health,
  onRefresh,
  isLoading,
  onOpenCommandPalette,
}) => {
  const isCloud = health?.execution_mode === 'aws' && health?.storage_mode.includes('S3');

  return (
    <header className="glass-subtle border-b border-border-light px-4 md:px-6 py-2.5 flex items-center justify-between sticky top-0 z-20">
      {/* Editorial Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs md:text-sm">
        <span className="font-serif font-bold tracking-tight text-ink uppercase text-[11px] md:text-xs">
          NewsPulse AI
        </span>
        <span className="text-ink-muted/40 font-light">/</span>
        <span className="font-medium text-ink-secondary text-xs truncate max-w-[180px] sm:max-w-none">
          {currentPageTitle}
        </span>
      </div>

      {/* Center Search / Command Palette Trigger */}
      {onOpenCommandPalette && (
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted bg-white border border-border-light rounded-sm hover:border-ink hover:text-ink transition-all shadow-subtle group"
          title="Open Command Palette (Ctrl+K or Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-ink-muted group-hover:text-ink transition-colors" />
          <span className="font-sans text-xs">Search actions or workspaces...</span>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#F4F4F0] border border-border-light rounded text-[10px] font-mono text-ink-muted">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      )}

      {/* Status Indicators & Controls */}
      <div className="flex items-center gap-2">
        {/* Mobile command palette trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="md:hidden p-1.5 rounded-sm border border-border-light bg-white text-ink-muted hover:text-ink"
            aria-label="Open command palette"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Environment Chip */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-sm border ${
            isCloud
              ? 'bg-emerald-50 text-forest-dark border-emerald-200'
              : 'bg-[#F4F4F0] text-ink-secondary border-border-light'
          }`}
          title={isCloud ? 'AWS S3 Cloud Mode Active' : 'Operating in local development fallback mode'}
        >
          {isCloud ? (
            <Cloud className="w-3 h-3 text-forest" />
          ) : (
            <Server className="w-3 h-3 text-ink-muted" />
          )}
          <span>{isCloud ? 'AWS S3 Cloud' : 'Local Storage'}</span>
        </span>

        {/* Spark Engine Chip with subtle live indicator */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-sm border bg-emerald-50/80 text-forest-dark border-forest/20">
          <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
          <Sparkles className="w-3 h-3 text-forest" />
          <span>Spark {health?.spark_version || '4.2.0'}</span>
        </span>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-sm text-ink-muted hover:text-ink hover:bg-white border border-transparent hover:border-border-light transition-all disabled:opacity-40"
            title="Refresh active state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </header>
  );
};
