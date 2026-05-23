import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createJourneyRouter } from './api/journeyRoutes.js';
import { loadRouteIndex } from './data/dataLoader.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
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

app.listen(port, () => {
  console.log(`TSRTC route graph engine listening on http://localhost:${port}`);
});
