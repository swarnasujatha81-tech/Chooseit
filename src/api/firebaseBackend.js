import { get, onValue, push, ref, remove, set, update } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { database, functions } from '@/firebase';

const localKey = (path) => `chooseit_local_${path}`;
const localEvent = (path) => `chooseit_local_${path}_changed`;

const readLocal = (path) => {
  try {
    return JSON.parse(localStorage.getItem(localKey(path))) || {};
  } catch {
    return {};
  }
};

const writeLocal = (path, value) => {
  localStorage.setItem(localKey(path), JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(localEvent(path), { detail: value }));
};

const isPermissionError = (error) => String(error?.message || error?.code || '').toLowerCase().includes('permission');

const normalizeList = (snapshot) => {
  const value = snapshot.val() || {};
  return Object.entries(value)
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
};

const entity = (path) => ({
  async list() {
    try {
      const snapshot = await get(ref(database, path));
      return normalizeList(snapshot);
    } catch (error) {
      if (!isPermissionError(error)) throw error;
      return Object.entries(readLocal(path)).map(([id, item]) => ({ id, ...item }));
    }
  },
  subscribe(callback) {
    const emitLocal = () => callback(Object.entries(readLocal(path)).map(([id, item]) => ({ id, ...item })));
    const localListener = () => emitLocal();
    window.addEventListener(localEvent(path), localListener);
    const unsubscribe = onValue(
      ref(database, path),
      (snapshot) => callback(normalizeList(snapshot)),
      (error) => {
        if (isPermissionError(error)) emitLocal();
        else console.error(error);
      },
    );
    return () => {
      window.removeEventListener(localEvent(path), localListener);
      unsubscribe();
    };
  },
  async create(data) {
    const itemRef = push(ref(database, path));
    const now = Date.now();
    const payload = { ...data, created_at: now, updated_at: now };
    try {
      await set(itemRef, payload);
      return { id: itemRef.key, ...payload, backend: 'firebase' };
    } catch (error) {
      if (!isPermissionError(error)) throw error;
      const id = `local_${now}_${Math.random().toString(36).slice(2, 8)}`;
      const all = readLocal(path);
      all[id] = payload;
      writeLocal(path, all);
      return { id, ...payload, backend: 'local' };
    }
  },
  async update(id, data) {
    const payload = { ...data, updated_at: Date.now() };
    if (String(id).startsWith('local_')) {
      const all = readLocal(path);
      all[id] = { ...(all[id] || {}), ...payload };
      writeLocal(path, all);
      return { id, ...all[id], backend: 'local' };
    }
    try {
      await update(ref(database, `${path}/${id}`), payload);
      return { id, ...payload, backend: 'firebase' };
    } catch (error) {
      if (!isPermissionError(error)) throw error;
      const all = readLocal(path);
      all[id] = { ...(all[id] || {}), ...payload };
      writeLocal(path, all);
      return { id, ...all[id], backend: 'local' };
    }
  },
  async delete(id) {
    if (String(id).startsWith('local_')) {
      const all = readLocal(path);
      delete all[id];
      writeLocal(path, all);
      return;
    }
    try {
      await remove(ref(database, `${path}/${id}`));
    } catch (error) {
      if (!isPermissionError(error)) throw error;
      const all = readLocal(path);
      delete all[id];
      writeLocal(path, all);
    }
  },
});

const analyzeCrowdImage = httpsCallable(functions, 'analyzeCrowdImage');

export const backend = {
  entities: {
    Bus: entity('buses'),
    Route: entity('routes'),
  },
  ai: {
    async analyzePassengerImage({ imageDataUrl, maxCapacity }) {
      const response = await analyzeCrowdImage({ imageDataUrl, maxCapacity });
      return response.data;
    },
  },
};
