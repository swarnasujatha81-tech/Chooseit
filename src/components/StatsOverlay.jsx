import { Activity, Bus, Users } from 'lucide-react';

export default function StatsOverlay({ buses }) {
  const active = buses.filter((bus) => bus.is_active).length;
  const passengers = buses.reduce((sum, bus) => sum + Number(bus.passenger_count || 0), 0);
  return (
    <div className="stats-overlay">
      <div><Bus size={15} /><b>{active}</b><span>Live</span></div>
      <div><Users size={15} /><b>{passengers}</b><span>Riders</span></div>
      <div><Activity size={15} /><b>{buses.length}</b><span>Total</span></div>
    </div>
  );
}
