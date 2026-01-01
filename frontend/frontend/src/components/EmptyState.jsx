import React from 'react';

export default function EmptyState({ title = 'Nothing here', description = '', ctaText, onCta }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-20 h-20 rounded-lg bg-gray-50 flex items-center justify-center text-blue-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M3 12h12M3 17h6" />
        </svg>
      </div>
      <h4 className="text-lg font-semibold text-gray-900 mt-4">{title}</h4>
      {description && <p className="text-sm text-gray-500 mt-2">{description}</p>}
      {ctaText && (
        <div className="mt-4">
          <button onClick={onCta} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{ctaText}</button>
        </div>
      )}
    </div>
  );
}
