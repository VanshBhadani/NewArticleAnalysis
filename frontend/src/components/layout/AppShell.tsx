import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, PageId } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '../ui/CommandPalette';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { HealthResponse } from '../../api/types';

interface Props {
  activePage: PageId;
  onSelectPage: (id: PageId) => void;
  pageTitle?: string;
  health?: HealthResponse;
  onRefresh?: () => void;
  isLoading?: boolean;
  children: React.ReactNode;
}

const pageTitles: Record<PageId, string> = {
  overview: 'Operations Cockpit & Telemetry',
  newsdesk: 'Daily News Desk & Edition Lineup',
  articles: 'Article Intelligence & Library',
  galaxy: 'News Galaxy & Dynamic Taxonomy',
  classify: 'Classify Wire Story',
  batches: 'Batch Ingestion & Processing',
  analytics: 'Editorial Analytics & Evaluation',
  jobs: 'Audit Trail & Job History',
  model: 'Model Lab & Governance',
  infrastructure: 'Cloud Infrastructure & Topology',
};

export const AppShell: React.FC<Props> = ({
  activePage,
  onSelectPage,
  pageTitle,
  health,
  onRefresh,
  isLoading,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const title = pageTitle || pageTitles[activePage] || 'Editorial Workspace';

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink font-sans">
      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={onSelectPage}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        onSelectPage={onSelectPage}
        isOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between p-3 bg-white border-b border-border-light">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-[#F4F4F0]"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-serif font-bold text-base text-ink">NewsPulse AI</div>
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-[#F4F4F0]"
            aria-label="Search"
          >
            <span className="text-xs font-mono font-semibold">⌘K</span>
          </button>
        </div>

        {/* Desktop Topbar */}
        <Topbar
          currentPageTitle={title}
          health={health}
          onRefresh={onRefresh}
          isLoading={isLoading}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        {/* Page Content with Error Boundary */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary fallbackTitle={`Error Loading ${title}`}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
