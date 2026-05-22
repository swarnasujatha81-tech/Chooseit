export const HYDERABAD_CENTER = [17.385, 78.4867];

export const ROUTE_LIST = [
  '10H Secunderabad - Kondapur',
  '10K Secunderabad - Kukatpally',
  '16A Secunderabad - ECIL',
  '17H Uppal - Mehdipatnam',
  '25S Suchitra - Chandrayangutta',
  '27E Jubilee Bus Station - ECIL',
  '49 Secunderabad - Afzalgunj',
  '65 Charminar - Mehdipatnam',
  '90L LB Nagar - Secunderabad',
  '113M Uppal - Lingampally',
  '127K Koti - Kondapur',
  '218D Dilsukhnagar - Patancheru',
  '222A Patancheru - Charminar',
  '300 Uppal - Mehdipatnam',
];

export const BUS_TYPES = {
  ordinary: { label: 'Ordinary Bus', color: '#ef4444' },
  metro_express: { label: 'Metro Express', color: '#2563eb' },
  metro_deluxe: { label: 'Metro Deluxe', color: '#7c3aed' },
  ac_bus: { label: 'AC Bus', color: '#d97706' },
  electric: { label: 'Electric Bus', color: '#16a34a' },
};

export const STOPS = [
  { name: 'Secunderabad Bus Stand', lat: 17.4399, lng: 78.4983, major: true },
  { name: 'Jubilee Bus Station', lat: 17.4445, lng: 78.499, major: true },
  { name: 'Miyapur Bus Station', lat: 17.4964, lng: 78.3339, major: true },
  { name: 'LB Nagar Bus Stop', lat: 17.3469, lng: 78.5526, major: true },
  { name: 'Mehdipatnam Bus Stop', lat: 17.3916, lng: 78.433, major: true },
  { name: 'Koti Bus Stop', lat: 17.385, lng: 78.4867, major: true },
  { name: 'Kukatpally Bus Stop', lat: 17.4849, lng: 78.4138, major: true },
  { name: 'Ameerpet Bus Stop', lat: 17.4375, lng: 78.4483, major: true },
  { name: 'Uppal Bus Stop', lat: 17.4014, lng: 78.5597, major: true },
  { name: 'Dilsukhnagar Bus Stop', lat: 17.3687, lng: 78.5265 },
  { name: 'Charminar Bus Stop', lat: 17.3616, lng: 78.4747 },
  { name: 'Afzalgunj Bus Stop', lat: 17.3753, lng: 78.4744 },
  { name: 'Kondapur Bus Stop', lat: 17.463, lng: 78.367 },
  { name: 'Hitech City Bus Stop', lat: 17.4483, lng: 78.3915 },
  { name: 'Gachibowli Bus Stop', lat: 17.4401, lng: 78.3489 },
  { name: 'Patancheru Bus Stop', lat: 17.5333, lng: 78.2645 },
  { name: 'Lingampally Bus Stop', lat: 17.4876, lng: 78.3354 },
  { name: 'ECIL Bus Stop', lat: 17.4738, lng: 78.5718 },
  { name: 'Nagole Bus Stop', lat: 17.3863, lng: 78.5648 },
  { name: 'Nampally Bus Stop', lat: 17.3803, lng: 78.4694 },
];

export const translations = {
  en: {
    driverPortal: 'Driver Portal',
    verifyIdentity: 'Verify identity',
    username: 'Username',
    password: 'Password',
    verifyBtn: 'Verify',
    driverPin: 'Driver PIN',
    newDriver: 'New driver? Enter a fresh PIN and register your bus.',
    driverControl: 'Driver Control',
    registerBus: 'Register Bus',
    startTracking: 'Start Tracking',
    stopTracking: 'Stop Tracking',
    activeBuses: 'Active buses',
    noBuses: 'No active buses right now. Buses appear when drivers start tracking.',
  },
  hi: {
    driverPortal: 'ड्राइवर पोर्टल',
    verifyIdentity: 'पहचान सत्यापित करें',
    username: 'यूजरनेम',
    password: 'पासवर्ड',
    verifyBtn: 'सत्यापित करें',
    driverPin: 'ड्राइवर पिन',
    newDriver: 'नए ड्राइवर? नया पिन डालें और बस रजिस्टर करें.',
    driverControl: 'ड्राइवर कंट्रोल',
    registerBus: 'बस रजिस्टर करें',
    startTracking: 'ट्रैकिंग शुरू करें',
    stopTracking: 'ट्रैकिंग रोकें',
    activeBuses: 'सक्रिय बसें',
    noBuses: 'अभी कोई सक्रिय बस नहीं है.',
  },
  te: {
    driverPortal: 'డ్రైవర్ పోర్టల్',
    verifyIdentity: 'గుర్తింపును ధృవీకరించండి',
    username: 'యూజర్ నేమ్',
    password: 'పాస్వర్డ్',
    verifyBtn: 'ధృవీకరించండి',
    driverPin: 'డ్రైవర్ పిన్',
    newDriver: 'కొత్త డ్రైవర్? కొత్త పిన్ ఇచ్చి బస్సును నమోదు చేయండి.',
    driverControl: 'డ్రైవర్ కంట్రోల్',
    registerBus: 'బస్సు నమోదు',
    startTracking: 'ట్రాకింగ్ ప్రారంభం',
    stopTracking: 'ట్రాకింగ్ ఆపు',
    activeBuses: 'సక్రియ బస్సులు',
    noBuses: 'ప్రస్తుతం సక్రియ బస్సులు లేవు.',
  },
};

export const languageOptions = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'HI' },
  { code: 'te', label: 'TE' },
];

export const crowdMeta = {
  empty: { label: 'Empty', color: '#22c55e' },
  available: { label: 'Available', color: '#eab308' },
  standing: { label: 'Standing', color: '#f97316' },
  overcrowded: { label: 'Overcrowded', color: '#ef4444' },
};

export function crowdFromCount(count, maxCapacity = 50) {
  const ratio = count / maxCapacity;
  if (ratio < 0.3) return 'empty';
  if (ratio < 0.6) return 'available';
  if (ratio < 0.85) return 'standing';
  return 'overcrowded';
}

export function haversine(lat1, lng1, lat2, lng2) {
  const toRad = (n) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
