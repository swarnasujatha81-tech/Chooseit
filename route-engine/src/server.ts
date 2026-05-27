import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createJourneyRouter } from './api/journeyRoutes.js';
import { loadRouteIndex } from './data/dataLoader.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
import http from 'http';

async function startServer(initialPort = port, maxAttempts = 10) {
  let p = initialPort;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const server = http.createServer(app);
    // attach an error listener for EADDRINUSE before attempting listen
    const listenPromise = new Promise((resolve, reject) => {
      server.once('error', (err) => reject(err));
      server.once('listening', () => resolve(server));
      server.listen(p);
    });
    try {
      await listenPromise;
      console.log(`TSRTC route graph engine listening on http://localhost:${p}`);
      return server;
    } catch (err) {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`Port ${p} in use. Trying port ${p + 1}...`);
        p += 1;
        // ensure server is closed
        try { server.close(); } catch (e) {}
        continue;
      }
      // unexpected error — rethrow
      throw err;
    }
  }
  throw new Error(`Could not bind to a port after ${maxAttempts} attempts starting at ${initialPort}`);
}
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(express.json({ limit: '128kb' }));
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
}));

const routeIndex = loadRouteIndex();

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    stops: routeIndex.stops.length,
    routes: routeIndex.routes.length,
  });
});

app.use(createJourneyRouter(routeIndex));

startServer().catch((err) => {
  console.error('Route engine failed to start:', err);
  process.exit(1);
});
