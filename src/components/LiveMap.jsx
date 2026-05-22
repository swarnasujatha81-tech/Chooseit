import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { BUS_TYPES, crowdMeta, HYDERABAD_CENTER, STOPS } from '@/data';
import { useEffect } from 'react';

function busIcon(bus) {
  const type = BUS_TYPES[bus.bus_type] || BUS_TYPES.ordinary;
  const crowd = crowdMeta[bus.crowd_level] || crowdMeta.available;
  return L.divIcon({
    className: '',
    html: `<div class="map-bus" style="background:${type.color};box-shadow:0 0 0 4px ${crowd.color}33"><span>${bus.bus_number || 'BUS'}</span></div>`,
    iconSize: [48, 34],
    iconAnchor: [24, 17],
  });
}

const stopIcon = L.divIcon({
  className: '',
  html: '<div class="map-stop"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const userIcon = L.divIcon({
  className: '',
  html: '<div class="user-dot"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const destinationIcon = L.divIcon({
  className: '',
  html: '<div class="destination-pin"></div>',
  iconSize: [30, 38],
  iconAnchor: [15, 36],
});

function FlyTo({ selected, userLocation, locateSignal }) {
  const map = useMap();
  useEffect(() => {
    if (selected?.latitude && selected?.longitude) {
      map.flyTo([selected.latitude, selected.longitude], 15, { duration: 0.8 });
    }
  }, [map, selected]);
  useEffect(() => {
    if (userLocation?.lat && userLocation?.lng) {
      map.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 0.8 });
    }
  }, [map, userLocation, locateSignal]);
  return null;
}

function MapClickHandler({ pinMode, onDropPin }) {
  useMapEvents({
    click(event) {
      if (pinMode) onDropPin?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export default function LiveMap({ buses, selectedBus, onSelectBus, userLocation, locateSignal, destinationPin, pinMode, onDropPin }) {
  const visibleBuses = buses.filter((bus) => bus.is_active && bus.latitude && bus.longitude);
  const displayBuses = visibleBuses.length ? visibleBuses : [{
    id: 'demo-bus',
    bus_number: '0',
    route_name: 'Demo live route',
    latitude: 17.385,
    longitude: 78.4867,
    bus_type: 'ordinary',
    crowd_level: 'available',
    passenger_count: 0,
    is_active: true,
  }];
  return (
    <MapContainer center={HYDERABAD_CENTER} zoom={12} minZoom={10} className="live-map">
      <TileLayer attribution="" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FlyTo selected={selectedBus} userLocation={userLocation} locateSignal={locateSignal} />
      <MapClickHandler pinMode={pinMode} onDropPin={onDropPin} />
      {userLocation?.lat && userLocation?.lng && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>Your location</Popup>
        </Marker>
      )}
      {destinationPin?.lat && destinationPin?.lng && (
        <Marker position={[destinationPin.lat, destinationPin.lng]} icon={destinationIcon}>
          <Popup>Journey destination</Popup>
        </Marker>
      )}
      {STOPS.map((stop) => (
        <Marker key={stop.name} position={[stop.lat, stop.lng]} icon={stopIcon}>
          <Popup>{stop.name}</Popup>
        </Marker>
      ))}
      {displayBuses.map((bus) => (
        <Marker key={bus.id} position={[bus.latitude, bus.longitude]} icon={busIcon(bus)} eventHandlers={{ click: () => onSelectBus(bus) }}>
          <Popup>
            <b>{bus.bus_number}</b><br />
            {bus.route_name}<br />
            {bus.passenger_count || 0} passengers
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
