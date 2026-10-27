import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import {
  GalaxyResponse,
  GalaxyNode,
  GalaxyEdge,
  GalaxyCluster,
  EmergingCandidate,
  CategoryMetadata,
  ArticleItem,
} from '../api/types';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { ArticleDetailDrawer } from '../components/ui/ArticleDetailDrawer';
import { getCategoryColor, hexToRgba } from '../utils/colors';
import {
  Orbit,
  LayoutGrid,
  Table as TableIcon,
  Search,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Eye,
  X,
  CheckCircle2,
  Tag,
  Flame,
  Layers,
  ArrowLeft,
  Volume2,
  VolumeX,
} from 'lucide-react';

type ViewMode = 'galaxy' | 'tiles' | 'table';

export const NewsGalaxyPage: React.FC = () => {
  // Visualization mode
  const [viewMode, setViewMode] = useState<ViewMode>('galaxy');

  // Main data state
  const [data, setData] = useState<GalaxyResponse | null>(null);
  const [categories, setCategories] = useState<CategoryMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All Subcategories');
  const [statusFilter, setStatusFilter] = useState<'all' | 'decisive' | 'uncertain'>('all');
  const [minConfidence, setMinConfidence] = useState(0.0);

  // Selected article for dossier drawer
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);

  // Cluster Focus Navigation
  const [focusedCluster, setFocusedCluster] = useState<GalaxyCluster | null>(null);

  // Emerging Topic Review Modal
  const [inspectingCandidate, setInspectingCandidate] = useState<EmergingCandidate | null>(null);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);

  // Visual preferences
  const [tileDensity, setTileDensity] = useState<'compact' | 'comfortable'>('compact');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showSimilarityEdges, setShowSimilarityEdges] = useState(true);

  // Canvas viewport state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hoveredNodeRef = useRef<GalaxyNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GalaxyNode | null>(null);

  // Fetch dynamic categories and galaxy graph
  const fetchData = useCallback(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.getCategories(),
      api.getGalaxyData({
        search: search.trim() || undefined,
        category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        subcategory: selectedSubcategory !== 'All Subcategories' ? selectedSubcategory : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        min_confidence: minConfidence > 0 ? minConfidence : undefined,
      }),
    ])
      .then(([cats, galaxy]) => {
        setCategories(cats);
        setData(galaxy);
      })
      .catch((err) => setError(err.message || 'Failed to initialize News Galaxy.'))
      .finally(() => setIsLoading(false));
  }, [search, selectedCategory, selectedSubcategory, statusFilter, minConfidence]);

  useEffect(() => {
    fetchData();
  }, [selectedCategory, selectedSubcategory, statusFilter, minConfidence]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('All Categories');
    setSelectedSubcategory('All Subcategories');
    setStatusFilter('all');
    setMinConfidence(0.0);
    setFocusedCluster(null);
  };

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (selectedCategory !== 'All Categories' ? 1 : 0) +
    (selectedSubcategory !== 'All Subcategories' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (minConfidence > 0 ? 1 : 0) +
    (focusedCluster ? 1 : 0);

  // Subcategory options derived from clusters
  const subcategoryOptions = useMemo(() => {
    if (!data || !data.clusters) return [];
    let list = data.clusters;
    if (selectedCategory !== 'All Categories') {
      list = list.filter(
        (c) => c.parent_category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    const names = Array.from(new Set(list.map((c) => c.name)));
    return ['All Subcategories', ...names];
  }, [data, selectedCategory]);

  // Filtered nodes based on focused cluster if active
  const displayedNodes = useMemo(() => {
    if (!data) return [];
    if (!focusedCluster) return data.nodes;
    return data.nodes.filter((n) => n.cluster_id === focusedCluster.cluster_id);
  }, [data, focusedCluster]);

  // Convert GalaxyNode to ArticleItem for the drawer
  const handleOpenArticle = (node: GalaxyNode) => {
    setSelectedArticle({
      article_id: node.article_id,
      title: node.title,
      description: node.description,
      combined_text: node.combined_text,
      predicted_category: node.predicted_category,
      predicted_id: 0,
      confidence: node.confidence,
      is_uncertain: node.is_uncertain,
      subcategory: node.subcategory,
    });
  };

  // Promote / Reject Candidate Action Handlers
  const handlePromoteCandidate = async (candidateId: string) => {
    try {
      const res = await api.promoteCategory(candidateId);
      setPromotionMessage(res.message);
      setInspectingCandidate(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Promotion failed.');
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    try {
      const res = await api.rejectCategory(candidateId);
      setPromotionMessage(res.message);
      setInspectingCandidate(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Rejection failed.');
    }
  };

  // Center / Fit to screen
  const handleFitToScreen = () => {
    if (!canvasRef.current || !data || data.nodes.length === 0) return;
    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    setPan({ x: width / 2, y: height / 2 });
    setZoom(0.85);
  };

  const handleResetLayout = () => {
    handleFitToScreen();
    setFocusedCluster(null);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(3.5, z * 1.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, z / 1.25));

  // Focus a specific cluster
  const handleFocusCluster = (cluster: GalaxyCluster) => {
    setFocusedCluster(cluster);
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    setPan({
      x: canvas.clientWidth / 2 - cluster.centroid_x * 1.4,
      y: canvas.clientHeight / 2 - cluster.centroid_y * 1.4,
    });
    setZoom(1.4);
  };

  // Canvas Drawing Engine (High-Performance 2D Canvas)
  useEffect(() => {
    if (viewMode !== 'galaxy' || !canvasRef.current || !data) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particlePulse = 0;

    const render = () => {
      // Resize handling for high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep Interstellar Slate Canvas Backdrop
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle celestial coordinate grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 80 * zoom;
      const offsetX = pan.x % gridSize;
      const offsetY = pan.y % gridSize;

      ctx.beginPath();
      for (let x = offsetX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Transform space for nodes
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      particlePulse += reducedMotion ? 0 : 0.02;

      // 1. Draw Cluster Nebular Halos
      data.clusters.forEach((cluster) => {
        const isFocused = !focusedCluster || focusedCluster.cluster_id === cluster.cluster_id;
        const alpha = isFocused ? 0.14 : 0.03;
        const color = cluster.color || '#3B82F6';

        const grad = ctx.createRadialGradient(
          cluster.centroid_x,
          cluster.centroid_y,
          10,
          cluster.centroid_x,
          cluster.centroid_y,
          130 + Math.sin(particlePulse) * 8
        );
        grad.addColorStop(0, hexToRgba(color, alpha));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cluster.centroid_x, cluster.centroid_y, 140, 0, Math.PI * 2);
        ctx.fill();

        // Cluster Centroid Ring
        ctx.strokeStyle = hexToRgba(color, isFocused ? 0.35 : 0.1);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cluster.centroid_x, cluster.centroid_y, 90, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cluster Title Marker
        ctx.fillStyle = isFocused ? '#F8FAFC' : '#64748B';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cluster.name, cluster.centroid_x, cluster.centroid_y - 100);

        // Cluster Meta Pill
        ctx.fillStyle = hexToRgba(color, 0.2);
        const pillText = `${cluster.parent_category} · ${cluster.size} stories`;
        ctx.font = '500 9px system-ui, sans-serif';
        const textWidth = ctx.measureText(pillText).width;
        ctx.fillRect(cluster.centroid_x - textWidth / 2 - 6, cluster.centroid_y - 94, textWidth + 12, 14);
        ctx.fillStyle = hexToRgba(color, 0.9);
        ctx.fillText(pillText, cluster.centroid_x, cluster.centroid_y - 83);
      });

      // 2. Draw Similarity Edges (meaningful similarity >= 0.48)
      if (showSimilarityEdges && data.edges) {
        const nodeMap = new Map<string, GalaxyNode>();
        data.nodes.forEach((n) => nodeMap.set(n.article_id, n));

        data.edges.forEach((edge) => {
          const sourceNode = nodeMap.get(edge.source);
          const targetNode = nodeMap.get(edge.target);
          if (!sourceNode || !targetNode) return;

          const isNodeFocused =
            !focusedCluster ||
            sourceNode.cluster_id === focusedCluster.cluster_id ||
            targetNode.cluster_id === focusedCluster.cluster_id;

          const edgeAlpha = isNodeFocused ? (edge.similarity - 0.4) * 1.5 : 0.05;
          const strokeAlpha = Math.max(0.08, Math.min(0.7, edgeAlpha));

          ctx.strokeStyle = `rgba(148, 163, 184, ${strokeAlpha})`;
          ctx.lineWidth = edge.similarity > 0.65 ? 1.5 : 0.8;
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        });
      }

      // 3. Draw Celestial Article Nodes
      data.nodes.forEach((node) => {
        const isHovered = hoveredNodeRef.current?.article_id === node.article_id;
        const isClusterActive =
          !focusedCluster || focusedCluster.cluster_id === node.cluster_id;

        const baseColor = getCategoryColor(node.predicted_category);
        const radius = 5 + node.confidence * 4 + (isHovered ? 4 : 0);

        // Outer Glow
        if (isHovered || isClusterActive) {
          const glowGrad = ctx.createRadialGradient(
            node.x,
            node.y,
            radius * 0.5,
            node.x,
            node.y,
            radius * 2.8
          );
          glowGrad.addColorStop(0, hexToRgba(baseColor, isHovered ? 0.8 : 0.3));
          glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core Node
        ctx.fillStyle = isClusterActive ? baseColor : '#334155';
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // White Center Specular Core
        ctx.fillStyle = isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Node Label (Visible if zoomed in or hovered)
        if (zoom >= 1.1 || isHovered) {
          ctx.font = isHovered ? '600 11px system-ui, sans-serif' : '500 10px system-ui, sans-serif';
          ctx.fillStyle = isHovered ? '#FFFFFF' : 'rgba(241, 245, 249, 0.85)';
          ctx.textAlign = 'center';
          const truncated =
            node.title.length > 28 ? node.title.slice(0, 26) + '...' : node.title;
          ctx.fillText(truncated, node.x, node.y + radius + 13);
        }
      });

      ctx.restore();

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [viewMode, data, pan, zoom, focusedCluster, showSimilarityEdges, reducedMotion]);

  // Canvas Mouse & Touch Interactivity Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !data) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
      return;
    }

    // World Coordinates detection
    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;

    // Check hit test for article nodes
    let foundNode: GalaxyNode | null = null;
    for (const node of data.nodes) {
      const dist = Math.hypot(node.x - worldX, node.y - worldY);
      const hitRadius = 12 + node.confidence * 4;
      if (dist <= hitRadius) {
        foundNode = node;
        break;
      }
    }

    if (foundNode !== hoveredNodeRef.current) {
      hoveredNodeRef.current = foundNode;
      setHoveredNode(foundNode);
    }
  };

  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prevZoom) => {
      const nextZoom = Math.min(3.5, Math.max(0.25, prevZoom * zoomFactor));
      return nextZoom;
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !data) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;

    // Check node click
    for (const node of data.nodes) {
      const dist = Math.hypot(node.x - worldX, node.y - worldY);
      if (dist <= 16) {
        handleOpenArticle(node);
        return;
      }
    }

    // Check cluster centroid click
    for (const cluster of data.clusters) {
      const dist = Math.hypot(cluster.centroid_x - worldX, cluster.centroid_y - worldY);
      if (dist <= 90) {
        handleFocusCluster(cluster);
        return;
      }
    }
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedArticle) return;
      if (e.key === 'ArrowLeft') setPan((p) => ({ ...p, x: p.x + 40 }));
      if (e.key === 'ArrowRight') setPan((p) => ({ ...p, x: p.x - 40 }));
      if (e.key === 'ArrowUp') setPan((p) => ({ ...p, y: p.y + 40 }));
      if (e.key === 'ArrowDown') setPan((p) => ({ ...p, y: p.y - 40 }));
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-' || e.key === '_') handleZoomOut();
      if (e.key === 'Escape' && focusedCluster) setFocusedCluster(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArticle, focusedCluster]);

  return (
    <div className="space-y-5 max-w-7xl animate-fadeIn relative">
      {/* Editorial Cosmic Masthead */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between pb-4 border-b border-border-light gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 bg-forest rounded-none animate-pulse" />
            <span className="text-xs uppercase tracking-wider font-semibold text-forest-dark font-sans">
              Spatial Newsroom Constellation
            </span>
            <span className="bg-[#EDEDE8] text-ink font-mono text-[10px] px-2 py-0.5 rounded">
              TF-IDF Cosine Graph
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-normal tracking-tight text-ink">
            News Galaxy & Dynamic Taxonomy
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">
            Pan and zoom across verified news clusters, explore dense animated article tiles, and discover emerging journalistic topics without generative AI.
          </p>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="flex items-center bg-[#EDEDE8] p-1 rounded-sm border border-border-light shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('galaxy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
              viewMode === 'galaxy'
                ? 'bg-ink text-white shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            Galaxy View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tiles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
              viewMode === 'tiles'
                ? 'bg-ink text-white shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Tile View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
              viewMode === 'table'
                ? 'bg-ink text-white shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Table View
          </button>
        </div>
      </div>

      {/* Emerging Topic Alert Banner (if discovered) */}
      {data?.emerging_candidates && data.emerging_candidates.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-3.5 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-subtle">
          <div className="flex items-center gap-2.5">
            <Flame className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-amber-900 flex items-center gap-2">
                <span>Emerging Topic Candidate Detected:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-800 font-bold">
                  {data.emerging_candidates[0].name}
                </span>
                <span className="text-[11px] font-normal text-amber-700">
                  ({data.emerging_candidates[0].size} stories · Cohesion {data.emerging_candidates[0].cohesion})
                </span>
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Identified via statistical TF-IDF word frequency cohesion. Review candidate to promote to permanent taxonomy.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInspectingCandidate(data.emerging_candidates[0])}
            className="brutal-btn px-3 py-1.5 bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 shrink-0"
          >
            Review Candidate
          </button>
        </div>
      )}

      {/* Promotion success banner */}
      {promotionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{promotionMessage}</span>
          </div>
          <button
            onClick={() => setPromotionMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Ribbon */}
      <div className="bg-surface border border-border-light rounded-sm p-4 shadow-subtle space-y-3.5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter galaxy by headline, keyword, or cluster theme..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-border-light rounded-sm focus:outline-none focus:border-forest text-ink placeholder-ink-muted/50 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory('All Subcategories');
              }}
              className="text-xs bg-white border border-border-light rounded-sm px-3 py-2 text-ink focus:outline-none focus:border-forest"
            >
              <option value="All Categories">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.article_count})
                </option>
              ))}
            </select>

            {/* Subcategory Select */}
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="text-xs bg-white border border-border-light rounded-sm px-3 py-2 text-ink focus:outline-none focus:border-forest"
            >
              {subcategoryOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs bg-white border border-border-light rounded-sm px-3 py-2 text-ink focus:outline-none focus:border-forest"
            >
              <option value="all">All Match Status</option>
              <option value="decisive">Decisive (≥ 45%)</option>
              <option value="uncertain">Uncertain Review (&lt; 45%)</option>
            </select>

            {/* Confidence Slider */}
            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-border-light rounded-sm text-xs">
              <span className="text-ink-muted text-[11px] whitespace-nowrap">
                Min Conf: {Math.round(minConfidence * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-16 accent-forest cursor-pointer"
              />
            </div>

            {/* Clear Button */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-crimson hover:bg-red-50 border border-red-200 rounded-sm transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </form>

        {/* Category Pills Strip */}
        <div className="flex items-center justify-between pt-1 border-t border-border-light/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-ink-muted text-[11px] font-semibold mr-1">DESKS:</span>
            <button
              onClick={() => setSelectedCategory('All Categories')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                selectedCategory === 'All Categories'
                  ? 'bg-ink text-white font-semibold'
                  : 'bg-white text-ink-secondary border border-border-light hover:text-ink'
              }`}
            >
              All Desks
            </button>
            {categories.map((c) => {
              const isSelected = selectedCategory.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.name)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'text-white font-bold shadow-sm'
                      : 'bg-white text-ink-secondary border border-border-light hover:text-ink'
                  }`}
                  style={{
                    backgroundColor: isSelected ? c.color : undefined,
                    borderColor: !isSelected ? hexToRgba(c.color, 0.4) : undefined,
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-ink-muted font-mono hidden md:block">
            {displayedNodes.length} nodes · {data?.clusters.length || 0} clusters
          </div>
        </div>
      </div>

      {/* Cluster Navigation Breadcrumb */}
      {focusedCluster && (
        <div className="bg-[#EDEDE8] border border-border-light px-4 py-2 rounded-sm flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-ink-muted">Cluster Isolation:</span>
            <span className="font-semibold text-ink">{focusedCluster.name}</span>
            <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-border-light">
              {displayedNodes.length} articles
            </span>
            <span className="text-[11px] text-ink-muted">
              (Keywords: {focusedCluster.keywords.join(', ')})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFocusedCluster(null)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:text-forest-dark"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Full Galaxy
          </button>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="bg-surface border border-border-light rounded-sm shadow-subtle overflow-hidden relative min-h-[580px]">
        {isLoading ? (
          <div className="p-24 text-center text-ink-muted flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
            <div className="font-serif text-base text-ink">Projecting News Constellation...</div>
            <div className="text-xs text-ink-muted">
              Extracting TF-IDF n-grams, calculating cosine similarities, and arranging spatial coordinates.
            </div>
          </div>
        ) : error ? (
          <div className="p-16 text-center text-crimson text-xs">
            <AlertTriangle className="w-8 h-8 text-crimson mx-auto mb-2" />
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 px-3 py-1.5 bg-crimson text-white rounded text-xs"
            >
              Retry Ingestion
            </button>
          </div>
        ) : displayedNodes.length === 0 ? (
          <div className="p-24 text-center text-ink-muted flex flex-col items-center justify-center space-y-2">
            <Search className="w-8 h-8 text-ink-muted/40 mb-1" />
            <p className="font-serif text-base text-ink">No Dispatches Match Criteria</p>
            <p className="text-xs text-ink-muted max-w-sm">
              Try adjusting your search query, clearing filters, or widening the confidence threshold.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-2 text-xs font-semibold text-forest underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            {/* 1. GALAXY VIEW */}
            {viewMode === 'galaxy' && (
              <div className="relative w-full h-[620px] bg-[#090D16] select-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onWheel={handleCanvasWheel}
                  onClick={handleCanvasClick}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                  title="Drag to pan, scroll to zoom. Click node to inspect story dossier."
                />

                {/* HUD Overlay Controls */}
                <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-[#141B2D]/90 backdrop-blur-md p-1.5 rounded-sm border border-slate-700/60 shadow-xl text-white text-xs">
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-4 h-4 text-slate-300" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-4 h-4 text-slate-300" />
                  </button>
                  <div className="w-[1px] h-4 bg-slate-700 mx-1" />
                  <button
                    onClick={handleFitToScreen}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Fit to Screen"
                  >
                    <Maximize2 className="w-4 h-4 text-slate-300" />
                  </button>
                  <button
                    onClick={handleResetLayout}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Reset Layout & Centroids"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-300" />
                  </button>
                  <div className="w-[1px] h-4 bg-slate-700 mx-1" />
                  <button
                    onClick={() => setShowSimilarityEdges((v) => !v)}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                      showSimilarityEdges ? 'bg-forest/80 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Toggle Similarity Links (cosine >= 0.48)"
                  >
                    Links
                  </button>
                  <button
                    onClick={() => setReducedMotion((v) => !v)}
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                    title={reducedMotion ? 'Enable Cosmic Animation' : 'Reduce Motion'}
                  >
                    {reducedMotion ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Floating Node Hover Tooltip */}
                {hoveredNode && (
                  <div
                    className="absolute top-4 right-4 max-w-sm bg-[#111827]/95 backdrop-blur-md p-4 rounded-sm border border-slate-700 shadow-2xl text-white space-y-2 pointer-events-none animate-fadeIn"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <CategoryBadge category={hoveredNode.predicted_category} size="sm" />
                      <span className="font-mono text-emerald-400 text-xs font-semibold tabular-nums">
                        {(hoveredNode.confidence * 100).toFixed(1)}% match
                      </span>
                    </div>
                    <h4 className="font-serif text-sm font-normal text-white leading-snug">
                      {hoveredNode.title}
                    </h4>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {hoveredNode.description || hoveredNode.combined_text}
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-700/60 text-[10px] text-slate-400">
                      <span>Subtopic: {hoveredNode.subcategory}</span>
                      <span className="text-forest-light font-semibold">Click to open dossier</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. TILE VIEW (Animated Rectangular Wall) */}
            {viewMode === 'tiles' && (
              <div className="p-6 space-y-4 bg-[#FBFBF9]">
                {/* Tile density switch */}
                <div className="flex items-center justify-between pb-3 border-b border-border-light text-xs text-ink-muted">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">Tile Wall Density:</span>
                    <button
                      type="button"
                      onClick={() => setTileDensity('compact')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        tileDensity === 'compact'
                          ? 'bg-ink text-white'
                          : 'bg-white border border-border-light text-ink-secondary'
                      }`}
                    >
                      Dense Wall
                    </button>
                    <button
                      type="button"
                      onClick={() => setTileDensity('comfortable')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        tileDensity === 'comfortable'
                          ? 'bg-ink text-white'
                          : 'bg-white border border-border-light text-ink-secondary'
                      }`}
                    >
                      Spacious Dossier
                    </button>
                  </div>
                  <div className="font-mono text-[11px]">
                    Displaying {displayedNodes.length} interactive cards
                  </div>
                </div>

                {/* Staggered Tile Grid */}
                <div
                  className={`grid gap-4 ${
                    tileDensity === 'compact'
                      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  }`}
                >
                  {displayedNodes.map((node, idx) => {
                    const color = getCategoryColor(node.predicted_category);
                    const pct = Math.round(node.confidence * 100);
                    return (
                      <div
                        key={node.article_id}
                        onClick={() => handleOpenArticle(node)}
                        className="bg-white border border-border-light rounded-sm p-4 shadow-subtle hover:shadow-md hover:border-ink/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                        style={{
                          borderLeftWidth: '3.5px',
                          borderLeftColor: color,
                        }}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <CategoryBadge category={node.predicted_category} size="sm" />
                            <span className="font-mono text-[11px] text-ink-secondary tabular-nums font-semibold">
                              {pct}%
                            </span>
                          </div>

                          <h3 className="font-serif text-sm font-normal text-ink group-hover:text-forest transition-colors leading-snug line-clamp-2">
                            {node.title}
                          </h3>

                          {tileDensity === 'comfortable' && node.description && (
                            <p className="text-xs text-ink-secondary line-clamp-3 leading-relaxed">
                              {node.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 mt-3 border-t border-border-light/60 flex items-center justify-between text-[10px] text-ink-muted">
                          <span className="truncate max-w-[130px] font-medium">
                            {node.subcategory}
                          </span>
                          <span className="group-hover:text-ink font-semibold flex items-center gap-1 transition-colors">
                            Inspect <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. TABLE VIEW (Synchronized Tabular List) */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F4F4F0] border-b border-border-light text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                    <tr>
                      <th className="p-3 w-28">Desk</th>
                      <th className="p-3">Headline & Excerpt</th>
                      <th className="p-3 w-40">Cluster / Subtopic</th>
                      <th className="p-3 w-32 text-right">Confidence</th>
                      <th className="p-3 w-24 text-center">Status</th>
                      <th className="p-3 w-20 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light bg-white">
                    {displayedNodes.map((node) => {
                      const pct = Math.round(node.confidence * 100);
                      return (
                        <tr
                          key={node.article_id}
                          onClick={() => handleOpenArticle(node)}
                          className="hover:bg-[#F9F9F7] cursor-pointer transition-colors"
                        >
                          <td className="p-3 align-top">
                            <CategoryBadge category={node.predicted_category} size="sm" />
                          </td>
                          <td className="p-3 align-top space-y-1">
                            <div className="font-serif text-xs font-medium text-ink leading-snug">
                              {node.title}
                            </div>
                            <div className="text-[11px] text-ink-muted line-clamp-1">
                              {node.description || node.combined_text}
                            </div>
                          </td>
                          <td className="p-3 align-top font-medium text-ink text-xs">
                            {node.subcategory}
                          </td>
                          <td className="p-3 align-top text-right">
                            <div className="font-mono text-xs font-semibold tabular-nums">
                              {pct}%
                            </div>
                            <div className="w-16 ml-auto bg-[#EAEAE5] h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-forest rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3 align-top text-center">
                            {node.is_uncertain ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Decisive
                              </span>
                            )}
                          </td>
                          <td className="p-3 align-top text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenArticle(node);
                              }}
                              className="text-forest hover:text-forest-dark font-semibold text-xs inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Emerging Topic Candidate Review Modal */}
      {inspectingCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center glass-overlay animate-fadeIn p-4"
          onClick={() => setInspectingCandidate(null)}
        >
          <div
            className="w-full max-w-lg bg-surface border border-border-light rounded-sm shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border-light">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif text-lg font-medium text-ink">
                  Candidate Topic Review
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingCandidate(null)}
                className="p-1 text-ink-muted hover:text-ink rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-ink-secondary leading-relaxed">
                A recurring group of related news stories has been detected using TF-IDF term frequency clustering. It meets minimum cluster size and cohesion thresholds without generative AI.
              </p>

              <div className="p-3.5 bg-white rounded-sm border border-border-light space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-ink-muted uppercase text-[10px]">
                    Candidate Category Name
                  </span>
                  <span className="font-bold text-ink text-sm font-serif">
                    {inspectingCandidate.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-ink-muted uppercase text-[10px]">
                    Cluster Support
                  </span>
                  <span className="font-mono text-xs font-semibold">
                    {inspectingCandidate.size} verified stories
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-ink-muted uppercase text-[10px]">
                    Cohesion Metric
                  </span>
                  <span className="font-mono text-xs text-forest font-semibold">
                    {inspectingCandidate.cohesion} (Cosine Similarity)
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-ink-muted uppercase text-[10px] block mb-1">
                    Characteristic Term N-Grams
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {inspectingCandidate.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 bg-[#EDEDE8] text-ink font-mono text-[10px] rounded"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {inspectingCandidate.sample_titles && (
                <div>
                  <div className="font-semibold text-ink-muted uppercase text-[10px] mb-1">
                    Sample Member Dispatches
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-ink-secondary text-[11px]">
                    {inspectingCandidate.sample_titles.map((t, idx) => (
                      <li key={idx} className="line-clamp-1">{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border-light flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleRejectCandidate(inspectingCandidate.id)}
                className="px-3 py-1.5 bg-red-100 text-crimson text-xs font-semibold rounded hover:bg-red-200 transition-colors"
              >
                Reject & Archive
              </button>
              <button
                type="button"
                onClick={() => handlePromoteCandidate(inspectingCandidate.id)}
                className="brutal-btn px-4 py-1.5 bg-forest text-white text-xs font-semibold hover:bg-forest-dark"
              >
                Promote to Active Taxonomy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Article Dossier Drawer */}
      <ArticleDetailDrawer
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
};
