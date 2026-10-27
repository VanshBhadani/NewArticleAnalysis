import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  DailyNewsDeskResponse,
  RankedStory,
  CategoryHighlightGroup,
} from '../api/types';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AlertBox } from '../components/ui/AlertBox';
import { PageId } from '../components/layout/Sidebar';
import {
  Sparkles,
  Star,
  CheckCircle2,
  Bookmark,
  XCircle,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileText,
  Info,
  Clock,
  Check,
} from 'lucide-react';

interface Props {
  onNavigate?: (page: PageId) => void;
}

export const DailyNewsDeskPage: React.FC<Props> = ({ onNavigate }) => {
  const [data, setData] = useState<DailyNewsDeskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'curate' | 'edition' | 'saved' | 'dismissed'>('curate');

  // Filters & Controls
  const [balancedMode, setBalancedMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [sortBy, setSortBy] = useState<'score_desc' | 'confidence_desc' | 'coverage_desc'>('score_desc');

  // Interactive Modals & Actions
  const [selectedStoryForModal, setSelectedStoryForModal] = useState<RankedStory | null>(null);
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
  const [weights, setWeights] = useState({
    coverage: 0.30,
    impact: 0.30,
    depth: 0.15,
    cohesion: 0.15,
    recency: 0.10,
  });

  // Action status feedback
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const fetchData = async (overrideBalanced?: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const isBal = overrideBalanced !== undefined ? overrideBalanced : balancedMode;
      const res = await api.getDailyNewsDesk({
        balance_categories: isBal,
        w_coverage: weights.coverage,
        w_impact: weights.impact,
        w_depth: weights.depth,
        w_cohesion: weights.cohesion,
        w_recency: weights.recency,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Daily News Desk. Please check backend status.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [balancedMode]);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Editorial Actions
  const handleSelectStory = async (story: RankedStory, isLead: boolean = false) => {
    try {
      await api.selectStory({
        story_id: story.story_id,
        is_lead: isLead,
        publication_section: isLead ? 'Front Page Lead' : 'Front Page',
      });
      showFeedback(`Selected "${story.headline.slice(0, 45)}..." for the daily edition.`);
      await fetchData();
    } catch (err: any) {
      alert(`Error selecting story: ${err.message}`);
    }
  };

  const handleDeselectStory = async (storyId: string) => {
    try {
      await api.deselectStory(storyId);
      showFeedback("Story removed from today's edition.");
      await fetchData();
    } catch (err: any) {
      alert(`Error removing story: ${err.message}`);
    }
  };

  const handleSetLead = async (storyId: string) => {
    try {
      await api.setLeadStory(storyId);
      showFeedback('Designated as Primary Lead Headline!');
      await fetchData();
    } catch (err: any) {
      alert(`Error designating lead: ${err.message}`);
    }
  };

  const handleSaveLater = async (story: RankedStory) => {
    try {
      await api.saveStoryLater(story.story_id);
      showFeedback('Saved story to future backlog.');
      await fetchData();
    } catch (err: any) {
      alert(`Error saving story: ${err.message}`);
    }
  };

  const handleDismissStory = async (storyId: string) => {
    try {
      await api.dismissStory(storyId);
      showFeedback('Story dismissed from recommendations.');
      await fetchData();
    } catch (err: any) {
      alert(`Error dismissing story: ${err.message}`);
    }
  };

  const handleRestoreStory = async (storyId: string) => {
    try {
      await api.restoreStory(storyId);
      showFeedback('Story restored to recommendations.');
      await fetchData();
    } catch (err: any) {
      alert(`Error restoring story: ${err.message}`);
    }
  };

  const handleReorder = async (currentIndex: number, direction: 'up' | 'down') => {
    if (!data?.selected_edition) return;
    const items = [...data.selected_edition];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Swap
    const temp = items[currentIndex];
    items[currentIndex] = items[targetIndex];
    items[targetIndex] = temp;

    const payload = items.map((item, idx) => ({
      story_id: item.story_id,
      edition_order: idx + 1,
    }));

    try {
      await api.reorderEditionStories(payload);
      await fetchData();
    } catch (err: any) {
      alert(`Error reordering stories: ${err.message}`);
    }
  };

  const handleAssignSection = async (storyId: string, section: string) => {
    try {
      await api.assignStorySection(storyId, section);
      showFeedback(`Assigned to section "${section}".`);
      await fetchData();
    } catch (err: any) {
      alert(`Error assigning section: ${err.message}`);
    }
  };

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Filtered stories in Curation Bench
  const filteredTopStories = (data?.top_stories || [])
    .filter(story => {
      if (selectedCategory !== 'All Categories' && story.main_category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return story.headline.toLowerCase().includes(q) || story.excerpt.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'confidence_desc') {
        return b.classification_confidence - a.classification_confidence;
      }
      if (sortBy === 'coverage_desc') {
        return b.related_articles_count - a.related_articles_count;
      }
      return b.editorial_score - a.editorial_score;
    });

  const categoriesList = ['All Categories', ...Array.from(new Set(data?.top_stories.map(s => s.main_category) || []))];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-border-light gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">
              Newsroom Editorial Operations
            </span>
            <span className="text-border-medium">•</span>
            <span className="text-xs text-ink-muted flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {data?.date || 'Today'}
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink leading-tight">
            Daily News Desk & Edition Lineup
          </h1>
          <p className="text-sm text-ink-muted mt-1 max-w-3xl">
            Deterministic importance scoring, story cluster grouping, and human-in-the-loop edition curation.
            Zero generative AI or LLMs.
          </p>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setIsWeightsModalOpen(true)}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            title="Adjust deterministic ranking component weights"
          >
            <Sliders className="w-3.5 h-3.5 text-ink-muted" />
            <span>Score Weights</span>
          </button>
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            title="Re-cluster and refresh editorial intelligence"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-sm text-xs font-medium flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <AlertBox
          type="error"
          title="Daily News Desk Service Error"
          message={error}
        >
          <button onClick={() => fetchData()} className="btn btn-secondary text-xs mt-2">
            Retry Connection
          </button>
        </AlertBox>
      )}

      {/* 2. Top Metric KPI Badges */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-surface border border-border-light rounded-sm p-3.5 shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
              Active Ingested
            </span>
            <div className="font-serif text-2xl font-medium text-ink tabular-nums">
              {data.stats.total_articles_ingested}
            </div>
            <span className="text-[11px] text-ink-muted">Raw dispatches</span>
          </div>

          <div className="bg-surface border border-border-light rounded-sm p-3.5 shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
              Story Clusters
            </span>
            <div className="font-serif text-2xl font-medium text-ink tabular-nums">
              {data.stats.total_stories_clustered}
            </div>
            <span className="text-[11px] text-ink-muted">Coherent events</span>
          </div>

          <div className="bg-surface border border-emerald-200 bg-emerald-50/20 rounded-sm p-3.5 shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
              Selected in Edition
            </span>
            <div className="font-serif text-2xl font-medium text-emerald-900 tabular-nums">
              {data.stats.total_selected}
            </div>
            <span className="text-[11px] text-emerald-700">Published lineup</span>
          </div>

          <div className="bg-surface border border-border-light rounded-sm p-3.5 shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
              Saved for Later
            </span>
            <div className="font-serif text-2xl font-medium text-ink tabular-nums">
              {data.stats.total_saved}
            </div>
            <span className="text-[11px] text-ink-muted">Future review</span>
          </div>

          <div className="bg-surface border border-border-light rounded-sm p-3.5 shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
              Dismissed
            </span>
            <div className="font-serif text-2xl font-medium text-ink-muted tabular-nums">
              {data.stats.total_dismissed}
            </div>
            <span className="text-[11px] text-ink-muted">Excluded items</span>
          </div>
        </div>
      )}

      {/* 3. Main Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border-medium">
        <button
          onClick={() => setActiveTab('curate')}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'curate'
              ? 'border-ink text-ink bg-surface-muted/50'
              : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted/30'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-700" />
          <span>Daily Curation Bench</span>
        </button>

        <button
          onClick={() => setActiveTab('edition')}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'edition'
              ? 'border-emerald-700 text-emerald-950 bg-emerald-50/50'
              : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted/30'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>Today's Selected Edition</span>
          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
            {data?.selected_edition?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'saved'
              ? 'border-ink text-ink bg-surface-muted/50'
              : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted/30'
          }`}
        >
          <Bookmark className="w-4 h-4 text-amber-600" />
          <span>Saved for Later</span>
          <span className="px-1.5 py-0.2 bg-surface-muted text-ink-muted rounded-full text-[10px] font-bold">
            {data?.saved_stories?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dismissed')}
          className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'dismissed'
              ? 'border-ink text-ink bg-surface-muted/50'
              : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted/30'
          }`}
        >
          <XCircle className="w-4 h-4 text-slate-500" />
          <span>Dismissed Queue</span>
          <span className="px-1.5 py-0.2 bg-surface-muted text-ink-muted rounded-full text-[10px] font-bold">
            {data?.dismissed_stories?.length || 0}
          </span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="py-24 text-center space-y-3">
          <RotateCcw className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
          <p className="text-sm font-medium text-ink">Running TF-IDF clustering and calculating editorial importance...</p>
          <p className="text-xs text-ink-muted">Processing active news dispatches with deterministic signals.</p>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 1: DAILY CURATION BENCH                                */}
      {/* ========================================================== */}
      {activeTab === 'curate' && data && (
        <div className="space-y-8">
          {/* A. Hero Lead Story Candidate Banner */}
          {data.lead_story && (
            <div className="bg-surface border-2 border-emerald-900/15 rounded-sm p-6 shadow-md relative overflow-hidden bg-gradient-to-br from-surface via-surface to-emerald-50/20">
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-sm text-xs font-bold uppercase tracking-wider">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                      {data.lead_story.is_lead ? 'Designated Lead Headline' : 'Top Lead Candidate'}
                    </span>
                    <CategoryBadge category={data.lead_story.main_category} size="md" />
                    <span className="px-2 py-0.5 text-xs font-semibold bg-surface-muted border border-border-medium rounded-sm text-ink-muted">
                      {data.lead_story.subcategory}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {data.lead_story.source} • {data.lead_story.published_date}
                    </span>
                  </div>

                  <h2
                    onClick={() => setSelectedStoryForModal(data.lead_story)}
                    className="font-serif text-2xl lg:text-3xl font-medium text-ink hover:text-emerald-900 transition-colors cursor-pointer leading-snug"
                  >
                    {data.lead_story.headline}
                  </h2>

                  <p className="text-sm text-ink-muted leading-relaxed line-clamp-3">
                    {data.lead_story.excerpt}
                  </p>

                  {/* Transparent Explanation Banner */}
                  <div className="bg-surface-muted/60 border border-border-light rounded-sm p-2.5 text-xs text-ink-muted flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-ink">Score Rationale: </span>
                      <span>{data.lead_story.score_explanation}</span>
                    </div>
                  </div>
                </div>

                {/* Score Dial & Curation Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0 lg:min-w-[220px]">
                  <div className="flex items-center gap-3">
                    {/* Editorial Score */}
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                        Editorial Importance
                      </span>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="font-serif text-3xl font-bold text-emerald-900">
                          {data.lead_story.editorial_score}
                        </span>
                        <span className="text-xs text-ink-muted">/100</span>
                      </div>
                    </div>

                    {/* ML Confidence */}
                    <div className="pl-3 border-l border-border-medium text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                        ML Confidence
                      </span>
                      <span className="font-sans text-lg font-bold text-ink">
                        {data.lead_story.classification_confidence}%
                      </span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap lg:flex-col gap-2 w-full">
                    {!data.lead_story.is_lead && (
                      <button
                        onClick={() => handleSetLead(data.lead_story!.story_id)}
                        className="btn btn-primary text-xs flex items-center justify-center gap-1.5 py-1.5 px-3 w-full"
                      >
                        <Star className="w-3.5 h-3.5 fill-white text-white" />
                        <span>Confirm Lead Story</span>
                      </button>
                    )}

                    {data.lead_story.status !== 'selected' ? (
                      <button
                        onClick={() => handleSelectStory(data.lead_story!)}
                        className="btn btn-secondary text-xs flex items-center justify-center gap-1.5 py-1.5 px-3 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Select for Edition</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-1 text-xs text-emerald-800 font-semibold py-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>In Today's Lineup</span>
                      </span>
                    )}

                    <div className="flex items-center gap-2 w-full">
                      <button
                        onClick={() => handleSaveLater(data.lead_story!)}
                        className="btn btn-secondary text-xs flex items-center justify-center gap-1 py-1 px-2.5 flex-1"
                        title="Save for later"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => setSelectedStoryForModal(data.lead_story)}
                        className="btn btn-secondary text-xs flex items-center justify-center gap-1 py-1 px-2.5 flex-1"
                        title="Inspect all dispatches and score breakdown"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Coverage</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. Controls Bar: Category Balancing & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface border border-border-light rounded-sm p-3.5 shadow-subtle">
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Category Balancing Switch */}
              <label className="flex items-center gap-2 cursor-pointer pr-3 border-r border-border-medium select-none">
                <input
                  type="checkbox"
                  checked={balancedMode}
                  onChange={(e) => setBalancedMode(e.target.checked)}
                  className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4"
                />
                <span className="text-xs font-semibold text-ink">
                  Balanced Desks
                </span>
                <span className="text-[10px] text-ink-muted">
                  (Prevents one category from monopolizing top slots)
                </span>
              </label>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input py-1 px-2.5 text-xs max-w-[170px]"
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input py-1 px-2.5 text-xs max-w-[170px]"
              >
                <option value="score_desc">Sort: Highest Importance</option>
                <option value="confidence_desc">Sort: Highest ML Confidence</option>
                <option value="coverage_desc">Sort: Most Dispatches</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search headlines or excerpt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input py-1 pl-8 text-xs w-full"
              />
            </div>
          </div>

          {/* C. Ranked Top Stories Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-medium text-ink flex items-center gap-2">
                <span>Top Recommended Stories</span>
                <span className="text-xs font-sans text-ink-muted">
                  ({filteredTopStories.length} curated clusters)
                </span>
              </h3>
              <span className="text-xs text-ink-muted">
                Showing top stories ranked by deterministic score
              </span>
            </div>

            {filteredTopStories.length === 0 ? (
              <div className="p-8 text-center bg-surface border border-dashed border-border-medium rounded-sm">
                <p className="text-sm text-ink-muted">No stories matched the current search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTopStories.map((story) => (
                  <div
                    key={story.story_id}
                    className={`bg-surface border rounded-sm p-4.5 shadow-subtle transition-all hover:border-ink-muted/50 flex flex-col justify-between ${
                      story.is_lead ? 'border-amber-400 bg-amber-50/10' : 'border-border-light'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top Badges & Category */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <CategoryBadge category={story.main_category} size="sm" />
                          <span className="px-2 py-0.5 text-[11px] font-medium bg-surface-muted rounded-sm text-ink-muted border border-border-light">
                            {story.subcategory}
                          </span>
                          {story.is_lead && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded-sm text-[10px] font-bold">
                              LEAD
                            </span>
                          )}
                          {story.status === 'selected' && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-sm text-[10px] font-bold">
                              SELECTED
                            </span>
                          )}
                        </div>

                        {/* Scores pill */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-sm"
                            title="Editorial Importance Score (0-100)"
                          >
                            <span>Score:</span>
                            <span>{story.editorial_score}</span>
                          </span>

                          <span
                            className="font-mono text-[11px] text-ink-muted bg-surface-muted px-1.5 py-0.5 rounded-sm border border-border-light"
                            title="ML Classification Confidence"
                          >
                            ML {story.classification_confidence}%
                          </span>
                        </div>
                      </div>

                      {/* Headline */}
                      <h4
                        onClick={() => setSelectedStoryForModal(story)}
                        className="font-serif text-lg font-medium text-ink hover:text-emerald-800 transition-colors cursor-pointer leading-snug line-clamp-2"
                      >
                        {story.headline}
                      </h4>

                      {/* Excerpt */}
                      <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                        {story.excerpt}
                      </p>

                      {/* Rationale Snippet */}
                      <p className="text-[11px] text-ink-muted/90 bg-surface-muted/40 p-2 rounded-sm border border-border-light/60">
                        <span className="font-semibold text-ink">Signals: </span>
                        {story.score_explanation}
                      </p>
                    </div>

                    {/* Footer & Action Buttons */}
                    <div className="pt-3 mt-3 border-t border-border-light flex items-center justify-between gap-2">
                      <span className="text-[11px] text-ink-muted truncate max-w-[180px]">
                        {story.related_articles_count} dispatch{story.related_articles_count > 1 ? 'es' : ''} • {story.distinct_sources_count} source{story.distinct_sources_count > 1 ? 's' : ''}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!story.is_lead && (
                          <button
                            onClick={() => handleSetLead(story.story_id)}
                            className="p-1.5 text-ink-muted hover:text-amber-600 hover:bg-amber-50 rounded-sm transition-colors"
                            title="Mark as Lead Story"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {story.status !== 'selected' ? (
                          <button
                            onClick={() => handleSelectStory(story)}
                            className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1 bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                            title="Select for today's edition"
                          >
                            <Check className="w-3 h-3" />
                            <span>Select</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeselectStory(story.story_id)}
                            className="btn btn-secondary text-xs py-1 px-2 text-rose-800 border-rose-200 hover:bg-rose-50"
                            title="Remove from edition"
                          >
                            Remove
                          </button>
                        )}

                        <button
                          onClick={() => handleSaveLater(story)}
                          className="p-1.5 text-ink-muted hover:text-amber-700 hover:bg-surface-muted rounded-sm transition-colors"
                          title="Save for later"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDismissStory(story.story_id)}
                          className="p-1.5 text-ink-muted hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors"
                          title="Dismiss recommendation"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedStoryForModal(story)}
                          className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted rounded-sm transition-colors"
                          title="View complete cluster coverage & full scoring breakdown"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* D. Category Highlights Section (Dynamic Taxonomy) */}
          <div className="space-y-4 pt-4 border-t border-border-medium">
            <div>
              <h3 className="font-serif text-2xl font-medium text-ink">
                Dynamic Category Highlights
              </h3>
              <p className="text-xs text-ink-muted">
                Guaranteed coverage across every active desk in the dynamic taxonomy registry.
              </p>
            </div>

            <div className="space-y-3">
              {data.category_highlights.map((catGroup) => {
                const isCollapsed = collapsedCategories[catGroup.category_id];
                return (
                  <div
                    key={catGroup.category_id}
                    className="bg-surface border border-border-light rounded-sm shadow-subtle overflow-hidden"
                  >
                    {/* Collapsible Category Header */}
                    <div
                      onClick={() => toggleCategoryCollapse(catGroup.category_id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-muted/30 transition-colors"
                      style={{ borderLeft: `4px solid ${catGroup.color || '#0F766E'}` }}
                    >
                      <div className="flex items-center gap-2.5">
                        <CategoryBadge category={catGroup.category_name} size="sm" />
                        <span className="font-serif text-base font-medium text-ink">
                          {catGroup.category_name} Desk
                        </span>
                        <span className="text-xs text-ink-muted">
                          ({catGroup.total_stories} story cluster{catGroup.total_stories !== 1 ? 's' : ''})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-ink-muted">
                        <span className="text-xs">{isCollapsed ? 'Expand' : 'Collapse'}</span>
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Stories in this category */}
                    {!isCollapsed && (
                      <div className="p-4 border-t border-border-light bg-surface-muted/15 space-y-2.5">
                        {catGroup.stories.length === 0 ? (
                          <p className="text-xs text-ink-muted italic py-2">
                            No active story clusters currently available under this category.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {catGroup.stories.map((story) => (
                              <div
                                key={story.story_id}
                                className="bg-surface border border-border-light rounded-sm p-3 shadow-sm hover:border-ink-muted/50 transition-all flex flex-col justify-between"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-ink-muted">
                                      {story.subcategory}
                                    </span>
                                    <span className="font-mono text-[11px] font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                      Score: {story.editorial_score}
                                    </span>
                                  </div>

                                  <h5
                                    onClick={() => setSelectedStoryForModal(story)}
                                    className="font-serif text-sm font-medium text-ink hover:text-emerald-800 transition-colors cursor-pointer line-clamp-2 leading-snug"
                                  >
                                    {story.headline}
                                  </h5>

                                  <p className="text-[11px] text-ink-muted line-clamp-2">
                                    {story.excerpt}
                                  </p>
                                </div>

                                <div className="pt-2 mt-2 border-t border-border-light flex items-center justify-between">
                                  <span className="text-[10px] text-ink-muted">
                                    {story.related_articles_count} dispatch{story.related_articles_count > 1 ? 'es' : ''}
                                  </span>

                                  {story.status !== 'selected' ? (
                                    <button
                                      onClick={() => handleSelectStory(story)}
                                      className="btn btn-secondary text-[11px] py-0.5 px-2 bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                                    >
                                      Select
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-emerald-800">
                                      Selected
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 2: TODAY'S SELECTED EDITION LINEUP                     */}
      {/* ========================================================== */}
      {activeTab === 'edition' && data && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border-light">
            <div>
              <h2 className="font-serif text-2xl font-medium text-ink">
                Today's Curated Edition Lineup
              </h2>
              <p className="text-xs text-ink-muted">
                Order stories, designate the lead headline, and assign stories to publication sections.
                Decisions are persisted durably in SQLite.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-sm">
                {data.selected_edition.length} stories ready for publishing
              </span>
            </div>
          </div>

          {data.selected_edition.length === 0 ? (
            <div className="p-12 text-center bg-surface border-2 border-dashed border-border-medium rounded-sm space-y-3">
              <CheckCircle2 className="w-10 h-10 text-ink-muted mx-auto" />
              <h4 className="font-serif text-lg font-medium text-ink">No Stories Selected for Today's Edition Yet</h4>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                Navigate back to the Curation Bench and click "Select" on stories you want to feature in today's daily newsroom edition.
              </p>
              <button
                onClick={() => setActiveTab('curate')}
                className="btn btn-primary text-xs py-1.5 px-4 mt-2 inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Go to Curation Bench</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.selected_edition.map((story, index) => (
                <div
                  key={story.story_id}
                  className={`bg-surface border rounded-sm p-4 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    story.is_lead ? 'border-amber-400 bg-amber-50/15' : 'border-border-light'
                  }`}
                >
                  {/* Left: Order badge & story info */}
                  <div className="flex items-start gap-3 max-w-2xl">
                    <span className="w-7 h-7 rounded-full bg-ink text-surface font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      #{index + 1}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        {story.is_lead && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-sm text-[10px] font-bold">
                            LEAD HEADLINE
                          </span>
                        )}
                        <CategoryBadge category={story.main_category} size="sm" />
                        <span className="text-xs text-ink-muted font-medium">
                          {story.subcategory}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-1.5 rounded">
                          Score: {story.editorial_score}
                        </span>
                      </div>

                      <h4
                        onClick={() => setSelectedStoryForModal(story)}
                        className="font-serif text-base font-medium text-ink hover:text-emerald-800 transition-colors cursor-pointer leading-snug"
                      >
                        {story.headline}
                      </h4>

                      <p className="text-xs text-ink-muted line-clamp-1">
                        {story.excerpt}
                      </p>
                    </div>
                  </div>

                  {/* Right: Section Selector, Reordering, and Removal */}
                  <div className="flex items-center flex-wrap gap-3 shrink-0">
                    {/* Publication Section Dropdown */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-0.5">
                        Publication Section
                      </span>
                      <select
                        value={story.publication_section || 'Front Page'}
                        onChange={(e) => handleAssignSection(story.story_id, e.target.value)}
                        className="input py-1 px-2 text-xs min-w-[150px]"
                      >
                        <option value="Front Page Lead">Front Page Lead</option>
                        <option value="Front Page">Front Page</option>
                        <option value="World Wire">World Wire</option>
                        <option value="Business Briefing">Business Briefing</option>
                        <option value="Sports Digest">Sports Digest</option>
                        <option value="Sci & Innovation">Sci & Innovation</option>
                        <option value="Analysis & Opinion">Analysis & Opinion</option>
                      </select>
                    </div>

                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReorder(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 border border-border-medium rounded-sm text-ink-muted hover:text-ink disabled:opacity-30 disabled:hover:text-ink-muted transition-colors"
                        title="Move Up in Lineup"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleReorder(index, 'down')}
                        disabled={index === data.selected_edition.length - 1}
                        className="p-1.5 border border-border-medium rounded-sm text-ink-muted hover:text-ink disabled:opacity-30 disabled:hover:text-ink-muted transition-colors"
                        title="Move Down in Lineup"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Remove from Edition */}
                    <button
                      onClick={() => handleDeselectStory(story.story_id)}
                      className="p-1.5 text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-sm transition-colors"
                      title="Remove from edition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 3: SAVED FOR LATER                                     */}
      {/* ========================================================== */}
      {activeTab === 'saved' && data && (
        <div className="space-y-4">
          <div>
            <h3 className="font-serif text-2xl font-medium text-ink">
              Saved for Later & Editorial Backlog
            </h3>
            <p className="text-xs text-ink-muted">
              Stories bookmarked for upcoming editions, follow-up reporting, or feature development.
            </p>
          </div>

          {data.saved_stories.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-dashed border-border-medium rounded-sm text-xs text-ink-muted">
              No stories are currently saved for later.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.saved_stories.map((story) => (
                <div key={story.story_id} className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <CategoryBadge category={story.main_category} size="sm" />
                    <span className="font-mono text-xs font-bold text-ink-muted">
                      Score: {story.editorial_score}
                    </span>
                  </div>
                  <h4
                    onClick={() => setSelectedStoryForModal(story)}
                    className="font-serif text-base font-medium text-ink hover:text-emerald-800 transition-colors cursor-pointer leading-snug"
                  >
                    {story.headline}
                  </h4>
                  <p className="text-xs text-ink-muted line-clamp-2">{story.excerpt}</p>
                  <div className="pt-2 border-t border-border-light flex items-center justify-between">
                    <span className="text-[11px] text-ink-muted">{story.source}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectStory(story)}
                        className="btn btn-secondary text-xs py-1 px-2.5 bg-emerald-50 text-emerald-900 border-emerald-300"
                      >
                        Move to Edition
                      </button>
                      <button
                        onClick={() => handleRestoreStory(story.story_id)}
                        className="text-xs text-ink-muted hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 4: DISMISSED QUEUE                                     */}
      {/* ========================================================== */}
      {activeTab === 'dismissed' && data && (
        <div className="space-y-4">
          <div>
            <h3 className="font-serif text-2xl font-medium text-ink">
              Dismissed Recommendations Queue
            </h3>
            <p className="text-xs text-ink-muted">
              Stories dismissed from active suggestions. Underlying articles remain intact in the database and can be restored anytime.
            </p>
          </div>

          {data.dismissed_stories.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-dashed border-border-medium rounded-sm text-xs text-ink-muted">
              The dismissed queue is currently empty.
            </div>
          ) : (
            <div className="space-y-2">
              {data.dismissed_stories.map((story) => (
                <div
                  key={story.story_id}
                  className="bg-surface border border-border-light rounded-sm p-3 shadow-subtle flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={story.main_category} size="sm" />
                      <span className="font-serif text-sm font-medium text-ink line-clamp-1">
                        {story.headline}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-muted line-clamp-1">
                      {story.excerpt}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRestoreStory(story.story_id)}
                    className="btn btn-secondary text-xs py-1 px-3 flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* STORY DETAIL & RELATED COVERAGE MODAL                      */}
      {/* ========================================================== */}
      {selectedStoryForModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border-medium rounded-sm shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-light flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={selectedStoryForModal.main_category} size="md" />
                  <span className="text-xs font-semibold text-ink-muted bg-surface-muted px-2 py-0.5 rounded">
                    {selectedStoryForModal.subcategory}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {selectedStoryForModal.source}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-medium text-ink leading-snug">
                  {selectedStoryForModal.headline}
                </h3>
              </div>

              <button
                onClick={() => setSelectedStoryForModal(null)}
                className="p-1 text-ink-muted hover:text-ink rounded-sm"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-sm">
              {/* Score Breakdown Cards */}
              <div className="bg-surface-muted/40 border border-border-light rounded-sm p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border-light">
                  <span className="font-serif text-base font-medium text-ink">
                    Transparent Editorial Importance Score: {selectedStoryForModal.editorial_score}/100
                  </span>
                  <span className="text-xs font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    ML Confidence: {selectedStoryForModal.classification_confidence}%
                  </span>
                </div>

                {/* Component dimensions */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-surface p-2 rounded border border-border-light">
                    <span className="text-[10px] text-ink-muted block uppercase">Coverage</span>
                    <span className="font-bold text-ink font-mono">{selectedStoryForModal.score_breakdown.coverage_breadth_score}</span>
                    <span className="text-[10px] text-ink-muted block">w=30%</span>
                  </div>
                  <div className="bg-surface p-2 rounded border border-border-light">
                    <span className="text-[10px] text-ink-muted block uppercase">Impact</span>
                    <span className="font-bold text-ink font-mono">{selectedStoryForModal.score_breakdown.public_impact_score}</span>
                    <span className="text-[10px] text-ink-muted block">w=30%</span>
                  </div>
                  <div className="bg-surface p-2 rounded border border-border-light">
                    <span className="text-[10px] text-ink-muted block uppercase">Depth</span>
                    <span className="font-bold text-ink font-mono">{selectedStoryForModal.score_breakdown.lexical_depth_score}</span>
                    <span className="text-[10px] text-ink-muted block">w=15%</span>
                  </div>
                  <div className="bg-surface p-2 rounded border border-border-light">
                    <span className="text-[10px] text-ink-muted block uppercase">Cohesion</span>
                    <span className="font-bold text-ink font-mono">{selectedStoryForModal.score_breakdown.cluster_cohesion_score}</span>
                    <span className="text-[10px] text-ink-muted block">w=15%</span>
                  </div>
                  <div className="bg-surface p-2 rounded border border-border-light">
                    <span className="text-[10px] text-ink-muted block uppercase">Recency</span>
                    <span className="font-bold text-ink font-mono">{selectedStoryForModal.score_breakdown.recency_score}</span>
                    <span className="text-[10px] text-ink-muted block">w=10%</span>
                  </div>
                </div>

                {/* Impact Keywords Detected */}
                {selectedStoryForModal.score_breakdown.matched_impact_keywords?.length > 0 && (
                  <div className="text-xs">
                    <span className="text-ink-muted font-semibold">Matched Public Impact Keywords: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedStoryForModal.score_breakdown.matched_impact_keywords.map(kw => (
                        <span key={kw} className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[11px] font-medium border border-amber-300">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-ink-muted italic">
                  {selectedStoryForModal.score_explanation}
                </p>
              </div>

              {/* Lead Article Excerpt */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Lead Article Content
                </h4>
                <div className="p-3 bg-surface border border-border-light rounded-sm text-xs leading-relaxed text-ink">
                  {selectedStoryForModal.excerpt}
                </div>
              </div>

              {/* Related Articles in this Cluster */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center justify-between">
                  <span>Related Dispatches in Story Cluster ({selectedStoryForModal.articles?.length || 1})</span>
                  <span className="text-[11px] font-normal lowercase">Identified via TF-IDF & Cosine Similarity</span>
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(selectedStoryForModal.articles || []).map((art, idx) => (
                    <div key={art.article_id || idx} className="p-2.5 bg-surface-muted/30 border border-border-light rounded-sm text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{art.title}</span>
                        <span className="text-[11px] font-mono text-ink-muted">{art.source}</span>
                      </div>
                      <p className="text-[11px] text-ink-muted line-clamp-1">{art.description || art.combined_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border-light bg-surface-muted/20 flex items-center justify-between">
              <span className="text-xs text-ink-muted">
                Story ID: {selectedStoryForModal.story_id}
              </span>

              <div className="flex items-center gap-2">
                {selectedStoryForModal.status !== 'selected' ? (
                  <button
                    onClick={() => {
                      handleSelectStory(selectedStoryForModal);
                      setSelectedStoryForModal(null);
                    }}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Select for Edition</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleDeselectStory(selectedStoryForModal.story_id);
                      setSelectedStoryForModal(null);
                    }}
                    className="btn btn-secondary text-xs py-1.5 px-3 text-rose-800"
                  >
                    Remove from Edition
                  </button>
                )}
                <button
                  onClick={() => setSelectedStoryForModal(null)}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* WEIGHTS CONFIGURATION MODAL                                */}
      {/* ========================================================== */}
      {isWeightsModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border-medium rounded-sm shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <div>
                <h3 className="font-serif text-lg font-medium text-ink">
                  Tune Editorial Ranking Weights
                </h3>
                <p className="text-xs text-ink-muted">
                  Configure the deterministic signal weights. Default weights must sum to 100%.
                </p>
              </div>
              <button
                onClick={() => setIsWeightsModalOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-ink">Coverage Breadth (Dispatches & Sources)</span>
                  <span className="font-mono">{Math.round(weights.coverage * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={weights.coverage * 100}
                  onChange={(e) => setWeights({ ...weights, coverage: Number(e.target.value) / 100 })}
                  className="w-full accent-emerald-800"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-ink">Public Impact (Governance, Macro, Safety Keywords)</span>
                  <span className="font-mono">{Math.round(weights.impact * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={weights.impact * 100}
                  onChange={(e) => setWeights({ ...weights, impact: Number(e.target.value) / 100 })}
                  className="w-full accent-emerald-800"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-ink">Lexical Depth & Detail Density</span>
                  <span className="font-mono">{Math.round(weights.depth * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={weights.depth * 100}
                  onChange={(e) => setWeights({ ...weights, depth: Number(e.target.value) / 100 })}
                  className="w-full accent-emerald-800"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-ink">Cluster Cohesion (Cosine Similarity)</span>
                  <span className="font-mono">{Math.round(weights.cohesion * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={weights.cohesion * 100}
                  onChange={(e) => setWeights({ ...weights, cohesion: Number(e.target.value) / 100 })}
                  className="w-full accent-emerald-800"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-ink">Publication Recency</span>
                  <span className="font-mono">{Math.round(weights.recency * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={weights.recency * 100}
                  onChange={(e) => setWeights({ ...weights, recency: Number(e.target.value) / 100 })}
                  className="w-full accent-emerald-800"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border-light flex items-center justify-between">
              <button
                onClick={() => setWeights({ coverage: 0.30, impact: 0.30, depth: 0.15, cohesion: 0.15, recency: 0.10 })}
                className="btn btn-secondary text-xs py-1 px-3"
              >
                Reset Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsWeightsModalOpen(false)}
                  className="btn btn-secondary text-xs py-1 px-3"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsWeightsModalOpen(false);
                    fetchData();
                  }}
                  className="btn btn-primary text-xs py-1 px-4"
                >
                  Apply & Recalculate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
