import { crowdMeta } from '@/data';

export default function CrowdLegend({ activeFilter, onFilterChange }) {
  return (
    <div className="crowd-legend">
      {Object.entries(crowdMeta).map(([key, meta]) => (
        <button key={key} className={activeFilter === key ? 'active' : ''} onClick={() => onFilterChange(activeFilter === key ? null : key)}>
          <span style={{ background: meta.color }} />
          {meta.label}
        </button>
      ))}
    </div>
  );
}
