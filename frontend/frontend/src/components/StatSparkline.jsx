import React from 'react';

function toPath(data, width = 120, height = 32) {
  if (!data || !data.length) return '';
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  return data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
}

export default function StatSparkline({ data = [], color = '#2563eb' }) {
  const path = toPath(data);
  return (
    <svg width="120" height="32" viewBox={`0 0 120 32`} className="rounded">
      {path && <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
