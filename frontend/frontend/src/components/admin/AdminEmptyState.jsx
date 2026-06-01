import React from "react";

export default function AdminEmptyState({ title, copy, actionLabel, onAction }) {
  return (
    <div className="admin-empty-state">
      <h3>{title}</h3>
      <p>{copy}</p>
      {actionLabel && onAction ? (
        <button type="button" className="admin-btn admin-btn--primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
