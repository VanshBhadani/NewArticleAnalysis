import React, { useState, useEffect, useRef } from 'react';
import { PageId } from '../layout/Sidebar';
import {
  Search,
  Zap,
  Layers,
  FileText,
  BarChart3,
  Clock,
  FlaskConical,
  Server,
  Download,
  X,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Action';
  description?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open triggered from shell
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const commands: CommandItem[] = [
    {
      id: 'nav-overview',
      title: 'Editorial Operations Overview',
      category: 'Navigation',
      description: 'View active dataset metrics, Spark throughput, and recent batches',
      icon: <FileText className="w-4 h-4 text-forest" />,
      action: () => {
        onNavigate('overview');
        onClose();
      },
    },
    {
      id: 'nav-classify',
      title: 'Classify News Wire',
      category: 'Navigation',
      description: 'Real-time inference workspace with editorial presets',
      icon: <Zap className="w-4 h-4 text-forest" />,
      action: () => {
        onNavigate('classify');
        onClose();
      },
    },
    {
      id: 'nav-batches',
      title: 'Batch Ingestion & Processing',
      category: 'Navigation',
      description: 'Upload news archive CSV for distributed Spark classification',
      icon: <Layers className="w-4 h-4 text-forest" />,
      action: () => {
        onNavigate('batches');
        onClose();
      },
    },
    {
      id: 'nav-articles',
      title: 'Article Intelligence Explorer',
      category: 'Navigation',
      description: 'Search, filter by confidence, and inspect categorized stories',
      icon: <Search className="w-4 h-4 text-forest" />,
      action: () => {
        onNavigate('articles');
        onClose();
      },
    },
    {
      id: 'nav-analytics',
      title: 'Analytics & Evaluation Telemetry',
      category: 'Navigation',
      description: 'Category distribution, confidence histogram, and confusion matrix',
      icon: <BarChart3 className="w-4 h-4 text-forest" />,
      action: () => {
        onNavigate('analytics');
        onClose();
      },
    },
    {
      id: 'nav-jobs',
      title: 'Jobs & Audit Ledger',
      category: 'Navigation',
      description: 'Review persistent SQLite execution history and durations',
      icon: <Clock className="w-4 h-4 text-forest" />,
      action: () => {
        onNavigate('jobs');
        onClose();
      },
    },
    {
      id: 'nav-model',
      title: 'Model Lab & Governance',
      category: 'Navigation',
      description: 'Inspect fitted MLlib DAG stages, hyperparameters, and retraining',
      icon: <FlaskConical className="w-4 h-4 text-forest" />,
      action: () => {
        onNavigate('model');
        onClose();
      },
    },
    {
      id: 'nav-infra',
      title: 'Infrastructure & Cloud Topology',
      category: 'Navigation',
      description: 'Spark JVM diagnostics, Python platform, and live S3 ping test',
      icon: <Server className="w-4 h-4 text-forest" />,
      action: () => {
        onNavigate('infrastructure');
        onClose();
      },
    },
    {
      id: 'act-template',
      title: 'Download Sample Batch CSV',
      category: 'Action',
      description: 'Save 60-article demonstration template formatted for Spark',
      icon: <Download className="w-4 h-4 text-cobalt" />,
      action: () => {
        window.location.href = api.getBatchTemplateUrl();
        onClose();
      },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(query.toLowerCase()))
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 glass-overlay animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl glass-floating brutal-accent rounded-sm overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light bg-white/60">
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or navigate to a workspace..."
            className="w-full bg-transparent text-sm text-ink focus:outline-none placeholder-ink-muted/50 font-sans"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-1.5 py-0.5 bg-[#F4F4F0] border border-border-light rounded text-[10px] font-mono text-ink-muted">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#F4F4F0] rounded text-ink-muted hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-border-light/40">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted">
              No matching commands or navigation routes found for "{query}".
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-2.5 rounded-sm cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-forest text-white'
                      : 'hover:bg-white/80 text-ink'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-surface text-ink-muted border border-border-light'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-white' : 'text-ink'
                        }`}
                      >
                        {item.title}
                      </div>
                      {item.description && (
                        <div
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-white/80' : 'text-ink-muted'
                          }`}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span
                      className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                        isSelected
                          ? 'border-white/30 text-white/90 bg-white/10'
                          : 'border-border-light text-ink-muted bg-[#F4F4F0]'
                      }`}
                    >
                      {item.category}
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 ${
                        isSelected ? 'text-white opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-3 py-2 bg-[#F4F4F0]/80 border-t border-border-light flex items-center justify-between text-[11px] text-ink-muted">
          <span>Navigate with <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd></span>
          <span>Select with <kbd className="font-mono">↵</kbd></span>
        </div>
      </div>
    </div>
  );
};
