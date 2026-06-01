import React from "react";

export default function AdminSectionNav({ sections }) {
  return (
    <nav className="admin-section-nav" aria-label="Section navigation">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className="admin-section-nav__chip"
          onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
