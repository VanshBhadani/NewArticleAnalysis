import React from 'react';
import { getCategoryColor, hexToRgba } from '../../utils/colors';

interface Props {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  status?: string;
}

export const CategoryBadge: React.FC<Props> = ({ category, size = 'sm', status }) => {
  const baseColor = getCategoryColor(category);
  const bgColor = hexToRgba(baseColor, 0.12);
  const borderColor = hexToRgba(baseColor, 0.35);

  let sizeStyles = 'px-2 py-0.5 text-xs';
  if (size === 'md') {
    sizeStyles = 'px-2.5 py-1 text-xs';
  } else if (size === 'lg') {
    sizeStyles = 'px-3 py-1.5 text-sm font-bold';
  }

  const isCandidate = status === 'candidate' || category.toLowerCase().includes('candidate');

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-sm border transition-all ${sizeStyles}`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        color: baseColor,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: baseColor }}
      />
      <span>{category}</span>
      {isCandidate && (
        <span
          className="text-[9px] uppercase px-1 py-0.2 rounded font-mono font-normal tracking-wide"
          style={{
            backgroundColor: hexToRgba(baseColor, 0.2),
            color: baseColor,
          }}
        >
          Candidate
        </span>
      )}
    </span>
  );
};
