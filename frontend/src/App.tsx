import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { PageId } from './components/layout/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { ArticleExplorerPage } from './pages/ArticleExplorerPage';
import { ClassifyPage } from './pages/ClassifyPage';
import { BatchProcessingPage } from './pages/BatchProcessingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { JobsPage } from './pages/JobsPage';
import { ModelLabPage } from './pages/ModelLabPage';
import { InfrastructurePage } from './pages/InfrastructurePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('overview');

  const renderActivePage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage onNavigate={(page) => setActivePage(page)} />;
      case 'articles':
        return <ArticleExplorerPage />;
      case 'classify':
        return <ClassifyPage />;
      case 'batches':
        return <BatchProcessingPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'jobs':
        return <JobsPage />;
      case 'model':
        return <ModelLabPage />;
      case 'infrastructure':
        return <InfrastructurePage />;
      default:
        return <OverviewPage onNavigate={(page) => setActivePage(page)} />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell activePage={activePage} onSelectPage={setActivePage}>
        {renderActivePage()}
      </AppShell>
    </QueryClientProvider>
  );
};

export default App;
