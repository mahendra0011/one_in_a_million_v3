/**
 * Reusable skeleton components for admin tables and cards
 */
import { useMemo } from 'react';

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 bg-gray-200 rounded w-28" />
        <div className="w-9 h-9 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-16" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  );
}

export function SkeletonBar() {
  // Decorative loading-skeleton bar heights, computed once via useMemo([]); a stray double-invoke is invisible.
  // eslint-disable-next-line react-hooks/purity
  const heights = useMemo(() => Array.from({ length: 7 }, () => 30 + Math.random() * 80), []);
  return (
    <div className="flex items-end gap-2 h-40 animate-pulse">
      {heights.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-gray-200 rounded-t-lg" style={{ height: `${h}px` }} />
          <div className="h-3 w-6 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}