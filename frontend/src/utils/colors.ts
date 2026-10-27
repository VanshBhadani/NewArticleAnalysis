/**
 * NewsPulse AI — Centralized Deterministic Color Utility
 * Ensures consistent, accessible color assignment for categories across
 * badges, charts, tiles, and galaxy visualization.
 */

export const CANONICAL_CATEGORY_COLORS: Record<string, string> = {
  world: '#1E3A8A',    // Deep Navy
  sports: '#047857',   // Forest Emerald
  business: '#B45309', // Warm Amber
  scitech: '#4338CA',  // Deep Indigo
  'sci/tech': '#4338CA',
};

export const EDITORIAL_PALETTE = [
  '#1E3A8A', // Deep Navy
  '#047857', // Forest Emerald
  '#B45309', // Warm Amber
  '#4338CA', // Deep Indigo
  '#7C3AED', // Royal Violet
  '#B91C1C', // Crimson
  '#0F766E', // Dark Teal
  '#0E7490', // Cerulean
  '#BE123C', // Rose Madder
  '#92400E', // Burnt Bronze
  '#475569', // Slate
  '#D97706', // Ochre
  '#2563EB', // Electric Cobalt
  '#059669', // Sea Green
];

/**
 * Returns a stable hex color for any category name or ID.
 */
export function getCategoryColor(categoryNameOrId: string): string {
  if (!categoryNameOrId) return '#475569';
  const norm = categoryNameOrId.toLowerCase().replace(/[\s\-_/]/g, '');
  if (norm in CANONICAL_CATEGORY_COLORS) {
    return CANONICAL_CATEGORY_COLORS[norm];
  }

  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % EDITORIAL_PALETTE.length;
  return EDITORIAL_PALETTE[idx];
}

/**
 * Computes whether text over the given hex color should be light or dark.
 */
export function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // YIQ luminance formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? '#0F172A' : '#FFFFFF';
}

/**
 * Converts hex to rgba string.
 */
export function hexToRgba(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return `rgba(71, 85, 105, ${alpha})`;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
