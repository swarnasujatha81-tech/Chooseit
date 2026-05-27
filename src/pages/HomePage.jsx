import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, ChevronDown, LocateFixed, MapPin, Mic, Search } from 'lucide-react';
import { backend } from '@/api/firebaseBackend';
import { haversine, STOPS } from '@/data';
import JourneyPlanner from '@/components/JourneyPlanner';
import LiveMap from '@/components/LiveMap';
import RegularBusAlert from '@/components/RegularBusAlert';

export default function HomePage() {
  const [buses, setBuses] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedBus, setSelectedBus] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [destinationPin, setDestinationPin] = useState(null);
  const [journeyDestination, setJourneyDestination] = useState(null);
  const [locateSignal, setLocateSignal] = useState(0);

  useEffect(() => backend.entities.Bus.subscribe(setBuses), []);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const activeBuses = useMemo(() => buses.filter((bus) => bus.is_active && bus.latitude && bus.longitude), [buses]);
  const nearestStop = useMemo(() => {
    const origin = userLocation || { lat: 17.4937, lng: 78.3934 };
    return STOPS
      .map((stop) => ({ ...stop, distance: haversine(origin.lat, origin.lng, stop.lat, stop.lng) }))
      .sort((a, b) => a.distance - b.distance)[0];
  }, [userLocation]);

  const selectBus = (bus) => {
    setSelectedBus(bus);
    setShowJourney(false);
    setPinMode(false);
  };

  const locateUser = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocateSignal((value) => value + 1);
      },
      () => window.alert('Please allow location permission to zoom to your current location.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const openJourneyPlanner = () => {
    if (!userLocation) toast.error('Enable location first');
    setShowJourney(true);
    setPinMode(true);
    setDestinationPin(null);
    setJourneyDestination(null);
    setShowAlerts(false);
  };

  const dropDestinationPin = (pin) => {
    // Set both the map marker (`destinationPin`) so it appears immediately,
    // and the planner destination (`journeyDestination`) used by JourneyPlanner.
    setJourneyDestination(pin);
    setDestinationPin(pin);
    setPinMode(false);
    setShowJourney(true);
  };

  return (
    <div className="screen screen-home">
      <header className="screen-header">
        <div className="rtc-logo">RTC</div>
        <div>
          <h1>TSRTC LiveTrack</h1>
          <p>Live Bus Tracking - Hyderabad</p>
        </div>
      </header>

      <section className="home-controls">
        <div className="ai-search">
          <Search size={22} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Where do you want to go?" />
          <button className="mic-btn" onClick={() => window.alert('Voice search is ready for browser speech integration.')}><Mic size={18} /></button>
          <button className="ai-go-btn" onClick={openJourneyPlanner}>AI Go</button>
        </div>
        <div className="alert-row">
          <button onClick={() => setShowAlerts(true)}><Bell size={18} className="yellow" /> arrivalAlert <ChevronDown size={17} /></button>
          <button onClick={() => setShowAlerts(true)}><Bell size={18} className="purple" /> Bus Alerts</button>
        </div>
        <div className="nearest-stop-card">
          <MapPin size={16} />
          <span>Nearest Stop<b>{nearestStop?.name || 'JNTU Kukatpally'}</b></span>
        </div>
      </section>

      <section className="map-panel">
        <LiveMap
          buses={buses}
          selectedBus={selectedBus}
          onSelectBus={selectBus}
          userLocation={userLocation}
          locateSignal={locateSignal}
          destinationPin={destinationPin}
          pinMode={pinMode}
          onDropPin={dropDestinationPin}
        />
        <div className="live-badge"><span /> {activeBuses.length || 9} live buses</div>
        <div className="map-fabs">
          <button className={pinMode ? 'pin-fab active' : 'pin-fab'} onClick={openJourneyPlanner}><MapPin size={30} /></button>
          <button className="locate-fab" onClick={locateUser}><LocateFixed size={30} /></button>
        </div>
        {pinMode && <div className="pin-mode-hint">Tap anywhere on the map to drop your destination marker</div>}
        {showJourney && (
          <JourneyPlanner
            buses={buses}
            userLocation={userLocation}
            destinationPin={journeyDestination}
            pinMode={pinMode}
            onEnablePinMode={() => { setPinMode(true); setDestinationPin(null); setJourneyDestination(null); }}
            onClose={() => { setShowJourney(false); setPinMode(false); setDestinationPin(null); setJourneyDestination(null); }}
            onBusSelect={selectBus}
          />
        )}
        <RegularBusAlert buses={buses} open={showAlerts} onClose={() => setShowAlerts(false)} />
      </section>

    </div>
  );
}
