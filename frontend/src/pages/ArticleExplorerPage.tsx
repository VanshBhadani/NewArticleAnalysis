import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ArticleItem, ArticlesListResponse } from '../api/types';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const ArticleExplorerPage: React.FC = () => {
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

  const categories = [
    'All Categories',
    'World',
    'Sports',
    'Business',
    'Sci/Tech',
  ];

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

        <a
          href={exportUrl}
          download="newspulse_articles_export.csv"
          className="brutal-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-forest hover:bg-forest-dark shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Export Filtered CSV
        </a>
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
              {categories.map((c) => (
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

      {/* Floating Glass Inspector Drawer */}
      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end glass-overlay animate-fadeIn"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="w-full max-w-xl h-full glass-floating border-l border-border-light shadow-2xl p-6 overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-border-light">
              <div>
                <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider mb-1">
                  Story Telemetry Dossier
                </div>
                <h2 className="font-serif text-xl font-normal text-ink leading-snug">
                  {selectedArticle.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="p-1.5 text-ink-muted hover:text-ink rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedArticle.description && (
              <div>
                <div className="text-xs uppercase font-semibold text-ink-muted tracking-wider mb-1.5">
                  Lead Dispatch & Summary
                </div>
                <p className="text-xs text-ink-secondary bg-white p-3.5 rounded-sm border border-border-light leading-relaxed">
                  {selectedArticle.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-sm border border-border-light">
                <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                  Assigned Category
                </div>
                <div className="mt-1">
                  <CategoryBadge category={selectedArticle.predicted_category} size="md" />
                </div>
              </div>
              <div className="p-3 bg-white rounded-sm border border-border-light">
                <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                  Model Confidence
                </div>
                <div className="text-xl font-serif font-medium text-ink tabular-nums mt-0.5">
                  {(selectedArticle.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Softmax Breakdown */}
            <div>
              <div className="text-xs uppercase font-semibold text-ink-muted tracking-wider mb-2">
                Calculated Softmax Scores
              </div>
              <div className="space-y-2.5 bg-white p-4 rounded-sm border border-border-light">
                {[
                  { label: 'World', val: selectedArticle.prob_world },
                  { label: 'Sports', val: selectedArticle.prob_sports },
                  { label: 'Business', val: selectedArticle.prob_business },
                  { label: 'Sci/Tech', val: selectedArticle.prob_scitech },
                ].map((item) => {
                  const pct = Math.round((item.val || 0) * 100);
                  const isWinner = item.label === selectedArticle.predicted_category;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={isWinner ? 'font-bold text-forest-dark' : 'text-ink-secondary'}>
                          {item.label}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums font-semibold">{pct}%</span>
                      </div>
                      <div className="w-full bg-[#EAEAE5] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isWinner ? 'bg-forest' : 'bg-ink-muted/30'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border-light flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="brutal-btn px-4 py-2 bg-ink text-white text-xs font-semibold tracking-wide uppercase hover:bg-ink-muted"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
