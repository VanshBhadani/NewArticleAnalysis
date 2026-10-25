import React from 'react';
import {
  Newspaper,
  Search,
  Zap,
  Layers,
  BarChart3,
  Clock,
  FlaskConical,
  Server,
  X,
  Compass,
  Cpu,
  ShieldAlert,
} from 'lucide-react';

export type PageId =
  | 'overview'
  | 'articles'
  | 'classify'
  | 'batches'
  | 'analytics'
  | 'jobs'
  | 'model'
  | 'infrastructure';

interface Props {
  activePage: PageId;
  onSelectPage: (id: PageId) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  onOpenCommandPalette?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activePage,
  onSelectPage,
  isOpen,
  onCloseMobile,
  onOpenCommandPalette,
}) => {
  const sections = [
    {
      group: 'Editorial Desk',
      items: [
        { id: 'overview' as PageId, label: 'Operations Cockpit', icon: Newspaper, tag: 'Live' },
        { id: 'classify' as PageId, label: 'Classify Wire Story', icon: Zap, tag: 'Realtime' },
        { id: 'articles' as PageId, label: 'Article Intelligence', icon: Search },
      ],
    },
    {
      group: 'Distributed Engine',
      items: [
        { id: 'batches' as PageId, label: 'Batch Processing', icon: Layers, tag: 'Spark' },
        { id: 'analytics' as PageId, label: 'Analytics & Trends', icon: BarChart3 },
        { id: 'jobs' as PageId, label: 'Audit & Job History', icon: Clock },
      ],
    },
    {
      group: 'Governance & Systems',
      items: [
        { id: 'model' as PageId, label: 'Model Lab', icon: FlaskConical },
        { id: 'infrastructure' as PageId, label: 'Cloud Infrastructure', icon: Server },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/40 z-30 md:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 w-60 bg-[#F4F4F0] border-r border-border-light z-40 transform transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col justify-between shrink-0 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Editorial Masthead */}
          <div className="p-4 border-b border-border-light relative bg-white/50">
            <button
              onClick={onCloseMobile}
              className="absolute right-3 top-3 p-1 rounded text-ink-muted hover:text-ink md:hidden"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-forest rounded-none" />
              <div className="font-serif text-lg font-bold tracking-tight text-ink">
                NewsPulse AI
              </div>
            </div>
            <div className="text-[11px] text-ink-muted mt-1 leading-snug">
              Newsroom intelligence & distributed Spark pipeline
            </div>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-5">
            {sections.map((section) => (
              <div key={section.group}>
                <div className="text-[11px] font-semibold text-ink-muted px-2.5 mb-1.5 flex items-center justify-between">
                  <span>{section.group}</span>
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectPage(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs transition-all text-left group ${
                          isActive
                            ? 'bg-forest text-white font-medium shadow-sm'
                            : 'text-ink-secondary hover:text-ink hover:bg-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-white' : 'text-ink-muted group-hover:text-forest'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.tag && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[#EAEAE5] text-ink-muted'
                            }`}
                          >
                            {item.tag}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footprint Status Banner */}
        <div className="p-3 border-t border-border-light bg-[#EDEDE8] text-[11px] text-ink-muted space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">Spark MLlib</span>
            <span className="font-mono text-[10px] text-forest font-semibold">4.2.0 local[*]</span>
          </div>
          <div className="text-[10px] text-ink-muted leading-tight">
            Dual-Mode AWS S3 / Local Persistence
          </div>
        </div>
      </aside>
    </>
  );
};
