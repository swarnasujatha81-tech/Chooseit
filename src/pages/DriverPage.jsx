import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CheckCircle2, ChevronDown, Eye, EyeOff, Gauge,
  MapPin, Navigation, Phone, Power, PowerOff, Send, TrendingUp, User, Users,
} from 'lucide-react';
import { backend } from '@/api/firebaseBackend';
import AICamScanner from '@/components/AICamScanner';
import { BUS_TYPES, crowdMeta, ROUTE_LIST } from '@/data';

const DRIVER_USERNAME = 'TGSRTCDRIVER';
const DRIVER_PASSWORD = 'TGSRTCDRIVER123456';
const PROFILE_KEY = 'chooseit_driver_profiles';
const SESSION_KEY = 'chooseit_active_session';

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveProfile(pin, data) {
  const profiles = loadJson(PROFILE_KEY, {});
  profiles[pin] = data;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const submit = () => {
    if (username.trim() === DRIVER_USERNAME && password === DRIVER_PASSWORD) onSuccess();
    else setError('Invalid credentials. Please try again.');
  };
  return (
    <div className="driver-login exact-driver-login">
      <div className="login-card">
        <div className="login-mark"><Send size={42} /></div>
        <h2>TGSRTC Driver Portal</h2>
        <p>Verify your identity to continue</p>
        <label>Username</label>
        <input value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="characters" placeholder="Enter username" />
        <label>Password</label>
        <div className="password-wrap">
          <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPw ? 'text' : 'password'} placeholder="Enter password" onKeyDown={(event) => event.key === 'Enter' && submit()} />
          <button onClick={() => setShowPw((value) => !value)}>{showPw ? <EyeOff size={22} /> : <Eye size={22} />}</button>
        </div>
        {error && <span className="driver-error"><AlertTriangle size={20} /> {error}</span>}
        <button className="primary-btn wide verify-btn" onClick={submit} disabled={!username || !password}>Verify & Continue</button>
      </div>
    </div>
  );
}

function PinStep({ pin, setPin, onContinue }) {
  return (
    <div className="pin-screen">
      <div className="login-mark"><Send size={42} /></div>
      <h2>Driver PIN</h2>
      <p>Enter your 4-digit driver PIN to continue</p>
      <input
        value={pin}
        type="password"
        inputMode="numeric"
        onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="••••"
      />
      <span>New driver? Enter a unique 4-digit PIN to create your profile.</span>
      <button className="primary-btn wide" onClick={onContinue} disabled={pin.length !== 4}>Continue</button>
    </div>
  );
}

export default function DriverPage() {
  const watchId = useRef(null);
  const heartbeat = useRef(null);
  const [auth, setAuth] = useState(() => sessionStorage.getItem('chooseit_driver_auth') === 'yes');
  const [stage, setStage] = useState(() => (sessionStorage.getItem('chooseit_driver_auth') === 'yes' ? 'pin' : 'login'));
  const [pin, setPin] = useState('');
  const [driverName, setDriverName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [routeName, setRouteName] = useState('');
  const [busType, setBusType] = useState('ordinary');
  const [busId, setBusId] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [coords, setCoords] = useState(null);
  const [crowdLevel, setCrowdLevel] = useState('empty');
  const [passengerCount, setPassengerCount] = useState(0);
  const [routeOpen, setRouteOpen] = useState(false);

  useEffect(() => {
    const session = loadJson(SESSION_KEY, null);
    if (session?.busId) {
      setPin(session.pin || '');
      setDriverName(session.driverName || '');
      setPhoneNumber(session.phoneNumber || '');
      setBusNumber(session.busNumber || '');
      setRouteName(session.routeName || '');
      setBusType(session.busType || 'ordinary');
      setBusId(session.busId);
      setCrowdLevel(session.crowdLevel || 'empty');
      setPassengerCount(session.passengerCount || 0);
    }
  }, []);

  const persistSession = (override = {}) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      pin, driverName, phoneNumber, busNumber, routeName, busType, busId, crowdLevel, passengerCount, ...override,
    }));
  };

  const loadProfileForPin = () => {
    const profile = loadJson(PROFILE_KEY, {})[pin];
    if (!profile) {
      setStage('setup');
      return;
    }
    setDriverName(profile.driverName || '');
    setPhoneNumber(profile.phoneNumber || '');
    setBusNumber(profile.busNumber || '');
    setRouteName(profile.routeName || '');
    setBusType(profile.busType || 'ordinary');
    setBusId(profile.busId || null);
    setCrowdLevel(profile.crowdLevel || 'empty');
    setPassengerCount(profile.passengerCount || 0);
    setStage('dashboard');
  };

  const createBusRecord = async () => {
    if (!pin || !driverName || !busNumber || !routeName) {
      throw new Error('Fill PIN, driver, bus and route details.');
    }
    const bus = await backend.entities.Bus.create({
      bus_number: busNumber,
      route_name: routeName,
      driver_name: driverName,
      phone_number: phoneNumber,
      bus_type: busType,
      is_active: false,
      crowd_level: crowdLevel,
      passenger_count: passengerCount,
      max_capacity: 50,
      speed: 0,
    });
    setBusId(bus.id);
    const profile = { driverName, phoneNumber, busNumber, routeName, busType, busId: bus.id, crowdLevel, passengerCount };
    saveProfile(pin, profile);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...profile, pin }));
    return bus;
  };

  const saveSetup = async () => {
    try {
      await createBusRecord();
      setStage('dashboard');
      toast.success('Driver profile ready.');
    } catch (error) {
      toast.error(error.message || 'Could not save driver profile.');
    }
  };

  const updateLocation = async (position, explicitBusId = busId) => {
    if (!explicitBusId) return;
    const kmh = Math.max(0, Math.round((position.coords.speed || 0) * 3.6));
    const nextCoords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    setCoords(nextCoords);
    setSpeed(kmh);
    await backend.entities.Bus.update(explicitBusId, {
      latitude: nextCoords.latitude,
      longitude: nextCoords.longitude,
      speed: kmh,
      heading: position.coords.heading || 0,
      is_active: true,
      route_name: routeName,
      bus_type: busType,
      driver_name: driverName,
    });
  };

  const startTracking = async () => {
    try {
      const activeBusId = busId || (await createBusRecord()).id;
      if (!navigator.geolocation) return toast.error('Geolocation is not available.');
      await backend.entities.Bus.update(activeBusId, { is_active: true, route_name: routeName, bus_type: busType });
      watchId.current = navigator.geolocation.watchPosition((position) => updateLocation(position, activeBusId), () => {
        toast.error('Location permission denied. Allow browser location for live tracking.');
        setTracking(false);
      }, {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 10000,
      });
      heartbeat.current = setInterval(() => backend.entities.Bus.update(activeBusId, { is_active: true }).catch(() => {}), 10000);
      setTracking(true);
      persistSession({ busId: activeBusId });
      toast.success('Live tracking started.');
    } catch (error) {
      toast.error(error.message || 'Could not start tracking.');
    }
  };

  const stopTracking = async () => {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    clearInterval(heartbeat.current);
    watchId.current = null;
    heartbeat.current = null;
    setTracking(false);
    if (busId) await backend.entities.Bus.update(busId, { is_active: false, speed: 0 });
  };

  const handleCrowd = async (level, count) => {
    setCrowdLevel(level);
    setPassengerCount(count);
    if (busId) await backend.entities.Bus.update(busId, { crowd_level: level, passenger_count: count });
    saveProfile(pin, { driverName, phoneNumber, busNumber, routeName, busType, busId, crowdLevel: level, passengerCount: count });
    persistSession({ crowdLevel: level, passengerCount: count });
  };

  useEffect(() => () => {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    clearInterval(heartbeat.current);
  }, []);

  const renderContent = () => {
    if (!auth || stage === 'login') {
      return <Login onSuccess={() => { sessionStorage.setItem('chooseit_driver_auth', 'yes'); setAuth(true); setStage('pin'); }} />;
    }
    if (stage === 'pin') {
      return <PinStep pin={pin} setPin={setPin} onContinue={loadProfileForPin} />;
    }
    if (stage === 'setup') {
      return (
        <div className="driver-setup-flow">
          <h2>New Driver Setup</h2>
          <p>Register your bus once. Next time, your 4-digit PIN loads this profile.</p>
          <label><User size={18} /> Driver name<input value={driverName} onChange={(event) => setDriverName(event.target.value)} placeholder="Your full name" /></label>
          <label><Phone size={18} /> Phone<input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Phone number" /></label>
          <label><Navigation size={18} /> Bus number<input value={busNumber} onChange={(event) => setBusNumber(event.target.value.toUpperCase())} placeholder="TS-09-PA-1234" /></label>
          <label className="route-field"><ChevronDown size={18} /> Route
            <button type="button" onClick={() => setRouteOpen((value) => !value)}>{routeName || 'Select route'} <ChevronDown size={18} /></button>
            {routeOpen && <div className="route-menu">{ROUTE_LIST.map((route) => <button key={route} type="button" onClick={() => { setRouteName(route); setRouteOpen(false); }}>{route}</button>)}</div>}
          </label>
          <div className="driver-type-grid">
            {Object.entries(BUS_TYPES).map(([key, type]) => (
              <button key={key} className={busType === key ? 'selected' : ''} style={{ '--type-color': type.color }} onClick={() => setBusType(key)}>
                <span style={{ background: type.color }} /> {type.label}
              </button>
            ))}
          </div>
          <button className="primary-btn wide setup-save" onClick={saveSetup}>Continue</button>
        </div>
      );
    }
    return (
      <div className="driver-dashboard-flow">
        {coords && (
          <div className="driver-location-card">
            <MapPin size={34} />
            <span>{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</span>
          </div>
        )}
        <div className="traffic-alert"><AlertTriangle size={24} /> Stuck in traffic detected</div>
        {tracking && (
          <AICamScanner
            busId={busId}
            onCrowdUpdate={handleCrowd}
            maxCapacity={50}
            autoStart
            compact
            scanIntervalMs={12000}
          />
        )}
        <h3>Manual Crowd Override</h3>
        <div className="driver-crowd-grid">
          {Object.entries(crowdMeta).map(([key, meta]) => (
            <button key={key} className={crowdLevel === key ? 'active' : ''} onClick={() => handleCrowd(key, key === 'empty' ? 5 : key === 'available' ? 20 : key === 'standing' ? 38 : 50)}>
              <span style={{ background: meta.color }} /> {meta.label} {crowdLevel === key && <CheckCircle2 size={20} />}
            </button>
          ))}
        </div>
        <button className={tracking ? 'driver-stop-btn' : 'driver-start-btn'} onClick={tracking ? stopTracking : startTracking}>
          {tracking ? <PowerOff size={34} /> : <Power size={34} />}
          {tracking ? 'Stop GPS Tracking' : 'Start GPS Tracking'}
        </button>
        <section className="driver-analytics-card">
          <h2><TrendingUp size={22} /> Performance Analytics</h2>
          <div className="analytics-grid">
            <div><Navigation size={30} /><b>0.0 km</b><span>Total Distance</span></div>
            <div><Gauge size={30} /><b>{speed} km/h</b><span>Avg Speed</span></div>
            <div><CheckCircle2 size={30} /><b>2</b><span>Rides Completed</span></div>
            <div><TrendingUp size={30} /><b>98%</b><span>On-Time Rate</span></div>
            <div><Users size={30} /><b>{passengerCount || 110}</b><span>Passengers</span></div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="screen screen-driver">
      <header className="screen-header">
        <div className="rtc-logo">RTC</div>
        <div>
          <h1>Driver Mode</h1>
          <p>GPS Tracking & Crowd Updates</p>
        </div>
      </header>
      {renderContent()}
    </div>
  );
}
