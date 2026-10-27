import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ArticleItem, ArticlesListResponse, CategoryMetadata } from '../api/types';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { ArticleDetailDrawer } from '../components/ui/ArticleDetailDrawer';
import { PageId } from '../components/layout/Sidebar';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Orbit,
} from 'lucide-react';

interface Props {
  onNavigate?: (page: PageId) => void;
}

export const ArticleExplorerPage: React.FC<Props> = ({ onNavigate }) => {
  const [data, setData] = useState<ArticlesListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [status, setStatus] = useState('All Records');
  const [sortBy, setSortBy] = useState('confidence_desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected article for floating glass drawer
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);

  // Dynamic Categories from Registry
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    'All Categories',
    'World',
    'Sports',
    'Business',
    'Sci/Tech',
  ]);

  useEffect(() => {
    api
      .getCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          const names = ['All Categories', ...cats.map((c) => c.name)];
          setAvailableCategories(Array.from(new Set(names)));
        }
      })
      .catch(() => {});
  }, []);

  const fetchArticles = () => {
    setIsLoading(true);
    setError(null);
    api
      .getArticles({
        search: search.trim() || undefined,
        category: category !== 'All Categories' ? category : undefined,
        status: status !== 'All Records' ? status : undefined,
        sort_by: sortBy,
        page,
        page_size: pageSize,
      })
      .then((res) => setData(res))
      .catch((err) => setError(err.message || 'Failed to query classified articles.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchArticles();
  }, [category, status, sortBy, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchArticles();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('All Categories');
    setStatus('All Records');
    setSortBy('confidence_desc');
    setPage(1);
  };

  const exportUrl = api.getExportUrl({
    search: search.trim() || undefined,
    category: category !== 'All Categories' ? category : undefined,
    status: status !== 'All Records' ? status : undefined,
    sort_by: sortBy,
  });

  return (
    <div className="space-y-6 max-w-7xl animate-fadeIn relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-4 border-b border-border-light gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-forest" />
            <span className="text-xs uppercase tracking-wider font-semibold text-forest-dark font-sans">
              Editorial Wire Archives
            </span>
          </div>
          <h1 className="font-serif text-3xl font-normal tracking-tight text-ink">
            Article Intelligence & Ingestion Ledger
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-1 leading-relaxed">
            Search, filter, and inspect verified news stories processed across Apache Spark batch jobs.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('galaxy')}
              className="brutal-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-ink bg-white border border-border-light hover:bg-[#F4F4F0]"
            >
              <Orbit className="w-3.5 h-3.5 text-forest" />
              Launch News Galaxy
            </button>
          )}

          <a
            href={exportUrl}
            download="newspulse_articles_export.csv"
            className="brutal-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-forest hover:bg-forest-dark"
          >
            <Download className="w-3.5 h-3.5" />
            Export Filtered CSV
          </a>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle space-y-4">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col md:flex-row gap-3 items-stretch md:items-center"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search headline and dispatch body text..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-border-light rounded-sm focus:outline-none focus:border-forest text-ink placeholder-ink-muted/50 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-border-light rounded-sm px-3 py-2 text-ink focus:outline-none focus:border-forest"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-border-light rounded-sm px-3 py-2 text-ink focus:outline-none focus:border-forest"
            >
              <option value="All Records">All Statuses</option>
              <option value="Decisive (>= 45%)">Decisive (≥ 45%)</option>
              <option value="Uncertain (< 45%)">Uncertain (&lt; 45%)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-border-light rounded-sm px-3 py-2 text-ink focus:outline-none focus:border-forest"
            >
              <option value="confidence_desc">Highest Confidence</option>
              <option value="confidence_asc">Lowest Confidence</option>
              <option value="title_asc">Title (A-Z)</option>
            </select>

            <button
              type="submit"
              className="brutal-btn px-4 py-2 bg-ink text-white text-xs font-semibold tracking-wide uppercase hover:bg-ink-muted"
            >
              Filter
            </button>

            {(search || category !== 'All Categories' || status !== 'All Records') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2 text-ink-muted hover:text-ink transition-colors"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-xs text-ink-muted pt-2 border-t border-border-light">
          <div>
            Showing <span className="font-semibold text-ink tabular-nums">{data ? data.items.length : 0}</span> of{' '}
            <span className="font-semibold text-ink tabular-nums">{data ? data.total.toLocaleString() : 0}</span> matching stories
          </div>
          {data && data.total_pages > 1 && (
            <div className="text-[11px] font-mono">
              Page {data.page} of {data.total_pages}
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface border border-border-light rounded-sm shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-ink-muted flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs">Querying article index...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-crimson text-xs">{error}</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-16 text-center text-ink-muted flex flex-col items-center justify-center">
            <BookOpen className="w-8 h-8 text-ink-muted/40 mb-2" />
            <h3 className="font-serif text-base text-ink font-medium">No Articles Found</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-sm">
              No stories matched your filter criteria. Try clearing query filters or adjusting category desks.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-3 py-1.5 text-xs bg-[#F4F4F0] border border-border-light rounded-sm text-ink hover:border-ink transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F4F0] border-b border-border-light text-[11px] font-semibold text-ink-muted uppercase">
                <tr>
                  <th className="py-3 px-4">Headline / Story</th>
                  <th className="py-3 px-4">Desk</th>
                  <th className="py-3 px-4 text-right">Confidence</th>
                  <th className="py-3 px-4 text-center">Quality State</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light bg-white">
                {data.items.map((art) => (
                  <tr
                    key={art.article_id}
                    className="hover:bg-[#F9F9F7] transition-colors cursor-pointer"
                    onClick={() => setSelectedArticle(art)}
                  >
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-medium text-ink line-clamp-1">{art.title}</div>
                      {art.description && (
                        <div className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">
                          {art.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <CategoryBadge category={art.predicted_category} />
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono whitespace-nowrap">
                      {(art.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {art.is_uncertain ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          Uncertain
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-forest-dark bg-forest-light px-2 py-0.5 rounded border border-forest/20">
                          Decisive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArticle(art);
                        }}
                        className="p-1.5 text-ink-muted hover:text-ink hover:bg-[#F4F4F0] rounded transition-colors"
                        title="Open Glass Inspector Drawer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {data && data.total_pages > 1 && (
          <div className="p-4 bg-[#F4F4F0] border-t border-border-light flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink bg-white border border-border-light rounded-sm disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="text-xs text-ink-secondary tabular-nums">
              Page {data.page} of {data.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink bg-white border border-border-light rounded-sm disabled:opacity-40 transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Shared Article Dossier Drawer */}
      <ArticleDetailDrawer
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
};
