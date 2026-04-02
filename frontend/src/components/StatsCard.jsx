import React from 'react';

export function StatsCard({ label, count, icon, colorClass, accent }) {
  // Using Vanilla CSS classes from index.css instead of Tailwind
  return (
    <div className={`card metric-card ${accent ? 'metric-card-accent' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="space-y-1">
        <p className="metric-title">{label}</p>
        <h3 className="metric-value">
          {count.toLocaleString()}
        </h3>
      </div>
      <div style={{
          padding: '0.75rem', 
          borderRadius: '9999px', 
          backgroundColor: accent ? 'rgba(129, 140, 248, 0.1)' : 'rgba(56, 189, 248, 0.1)',
          color: accent ? 'var(--accent-secondary)' : 'var(--accent-primary)'
        }} 
        className={colorClass}
      >
        {icon}
      </div>
    </div>
  );
}
