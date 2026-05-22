import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBg-AiCerZjuyoiV6xQ2Qpyn1dFP2-aJSs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'chooseit-86db4.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://chooseit-86db4-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'chooseit-86db4',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'chooseit-86db4.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1090711239569',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1090711239569:web:bcc8855ba0aa47886ab830',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-S664ZXQRQ0',
};

export const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const functions = getFunctions(app);

isSupported().then((supported) => {
  if (supported) getAnalytics(app);
}).catch(() => {});
