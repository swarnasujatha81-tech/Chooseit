import { Bus, Gauge, MapPin, Users } from 'lucide-react';
import { BUS_TYPES, crowdMeta } from '@/data';

export default function BusCard({ bus, onClick }) {
  const crowd = crowdMeta[bus.crowd_level] || crowdMeta.available;
  const type = BUS_TYPES[bus.bus_type] || BUS_TYPES.ordinary;
  return (
    <button className="bus-card" onClick={onClick}>
      <div className="bus-icon" style={{ background: type.color }}><Bus size={20} /></div>
      <div className="bus-info">
        <div className="bus-title">
          <b>{bus.bus_number}</b>
          <span style={{ borderColor: crowd.color, color: crowd.color }}>{crowd.label}</span>
        </div>
        <p>{bus.route_name}</p>
        <div className="bus-meta">
          <span><Users size={13} /> {bus.passenger_count ?? 0}</span>
          <span><Gauge size={13} /> {Math.round(bus.speed || 0)} km/h</span>
          <span><MapPin size={13} /> {bus.next_stop || 'Live location'}</span>
        </div>
      </div>
    </button>
  );
}
