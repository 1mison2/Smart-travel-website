import React from "react";

export default function SectionSkeleton({ cards = 3 }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 h-4 w-32 rounded-full bg-slate-200" />
          <div className="mb-3 h-8 w-2/3 rounded-2xl bg-slate-200" />
          <div className="mb-2 h-4 w-full rounded-full bg-slate-100" />
          <div className="mb-5 h-4 w-5/6 rounded-full bg-slate-100" />
          <div className="flex gap-3">
            <div className="h-10 w-28 rounded-full bg-slate-200" />
            <div className="h-10 w-24 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
