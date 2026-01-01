import React from 'react';

const ArrowRight = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

export default function RightSummaryCard({ title, subtitle = '', items = [], ctaText = 'See all', onCta }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-400 text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M2 11a1 1 0 011-1h3.586l1.707-1.707A1 1 0 0110.121 8.12L8.707 9.536H15a1 1 0 110 2H8.707l1.414 1.414a1 1 0 01-1.414 1.414L6.586 12H3a1 1 0 01-1-1z" />
            </svg>
          </div>
          <div>
            <h4 className="text-md font-semibold text-gray-900">{title}</h4>
            {subtitle ? <div className="text-xs text-gray-400">{subtitle}</div> : null}
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="text-sm text-gray-500">{items.length} total</div>
        </div>
      </div>

      <ul className="space-y-2 text-sm text-gray-700 mb-4 max-h-56 overflow-y-auto pr-2">
        {items.length ? items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 hover:bg-gray-50 p-3 rounded-md transition-colors">
            <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-full text-sm text-gray-700 font-medium">{String(it).charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{it}</div>
              <div className="text-xs text-gray-400">Quick note or meta</div>
            </div>
            <div className="ml-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">3</span>
            </div>
          </li>
        )) : (
          <li className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-2 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V4a4 4 0 018 0v3" />
            </svg>
            <div className="font-medium">No items yet</div>
            <div className="text-xs mt-1">Add trips or activities to see them here</div>
          </li>
        )}
      </ul>

      <div className="pt-2">
        <button
          onClick={onCta}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white px-4 py-2 rounded-md font-medium shadow-md transition-transform transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          aria-label={ctaText}
        >
          <span>{ctaText}</span>
          <ArrowRight className="w-4 h-4 opacity-90" />
        </button>
      </div>
    </div>
  );
} 
