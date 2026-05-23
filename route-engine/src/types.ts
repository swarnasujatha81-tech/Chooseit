export type StopId = string;
export type StopName = string;
export type RouteNo = string;

export type BusStop = {
  id: StopId;
  name: StopName;
  lat: number;
  lng: number;
  area: string;
  is_interchange: boolean;
};

export type BusRoute = {
  route_no: RouteNo;
  stops: StopName[];
  // Optional operational metrics (added for improved transit realism)
  avg_speed_kmph?: number;
  avg_wait_min?: number;
  service_type?: string;
};

export type GraphEdge = {
  to: StopName;
  routes: RouteNo[];
  // weight is a routing cost (integer). For backward compatibility keep it,
  // but include richer metadata to enable weighted routing.
  weight: number;
  distance_m?: number;
  travel_time_min?: number;
};

export type RouteGraph = Map<StopName, GraphEdge[]>;

export type RouteIndex = {
  stops: BusStop[];
  routes: BusRoute[];
  graph: RouteGraph;
  stopByName: Map<string, BusStop>;
  routeByNo: Map<RouteNo, BusRoute>;
  routesByStop: Map<StopName, BusRoute[]>;
  // Optional indexed maps to speed up lookups (added incrementally)
  stopById?: Map<StopId, BusStop>;
};

export type JourneyStep = {
  route: RouteNo;
  from: StopName;
  to: StopName;
  stops: StopName[];
};

export type JourneyPlan = {
  type: 'direct' | 'interchange' | 'multi_stop' | 'not_found';
  from: StopName;
  to: StopName;
  steps: JourneyStep[];
  interchange?: StopName;
  path: StopName[];
  // Human-readable legacy fields
  duration: string;
  fare: string;
  // Numeric, machine-friendly estimates (optional, non-breaking)
  estimated_duration_min?: number;
  estimated_fare?: number;
  walking_distance_m?: number;
  score?: number;
  route_type?: 'direct' | 'interchange' | 'multi_stop' | 'not_found';
  transfers: number;
  confidence: 'high' | 'medium' | 'low';
  debug?: Record<string, unknown>;
};

export type AiNarration = {
  summary: {
    duration: string;
    fare: string;
  };
  instructions: string[];
  last_mile: string;
  travel_tip: string;
};
