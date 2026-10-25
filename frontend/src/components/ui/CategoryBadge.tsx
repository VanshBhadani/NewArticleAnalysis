import React from 'react';

interface Props {
  category: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CategoryBadge: React.FC<Props> = ({ category, size = 'sm' }) => {
  const c = category.toLowerCase().replace('/', '');
  let colorStyles = 'bg-slate-100 text-slate-800 border-slate-200';

  if (c === 'world') {
    colorStyles = 'bg-[#EFF6FF] text-[#1E3A8A] border-[#BFDBFE]';
  } else if (c === 'sports') {
    colorStyles = 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
  } else if (c === 'business') {
    colorStyles = 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
  } else if (c === 'scitech') {
    colorStyles = 'bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE]';
  }

  let sizeStyles = 'px-2 py-0.5 text-xs';
  if (size === 'md') {
    sizeStyles = 'px-2.5 py-1 text-xs';
  } else if (size === 'lg') {
    sizeStyles = 'px-3 py-1.5 text-sm font-bold';
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-sm border ${colorStyles} ${sizeStyles}`}
    >
      {category}
    </span>
  );
};
