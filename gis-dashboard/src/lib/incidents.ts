export const INCIDENT_TYPES = [
  "pothole",
  "missing_divider",
  "rash_driving",
  "waterlogging",
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

export type Incident = {
  id: string;
  type: IncidentType;
  timestamp: string;
  busId: string;
  confidence: number;
  lat: number;
  lng: number;
};

const TYPE_SET = new Set<string>(INCIDENT_TYPES);

export const INCIDENT_META: Record<
  IncidentType,
  { label: string; badge: string; marker: string }
> = {
  pothole: {
    label: "Pothole",
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    marker: "#f59e0b",
  },
  missing_divider: {
    label: "Missing Divider",
    badge: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    marker: "#fb7185",
  },
  rash_driving: {
    label: "Rash Driving",
    badge: "border-red-500/40 bg-red-500/15 text-red-300",
    marker: "#ef4444",
  },
  waterlogging: {
    label: "Waterlogging",
    badge: "border-sky-500/40 bg-sky-500/15 text-sky-300",
    marker: "#38bdf8",
  },
};

function asRecord(row: unknown): Record<string, unknown> {
  return typeof row === "object" && row !== null
    ? (row as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function parseType(value: unknown): IncidentType {
  const raw = asString(value, "pothole")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return TYPE_SET.has(raw) ? (raw as IncidentType) : "pothole";
}

export function normalizeIncident(row: unknown): Incident {
  const r = asRecord(row);
  const coords = Array.isArray(r.coordinates) ? r.coordinates : null;
  const latFromCoords =
    coords && typeof coords[0] === "number" ? coords[0] : undefined;
  const lngFromCoords =
    coords && typeof coords[1] === "number" ? coords[1] : undefined;

  return {
    id: asString(r.id ?? r.uuid, crypto.randomUUID()),
    type: parseType(r.type ?? r.event_type ?? r.category ?? r.anomaly_type),
    timestamp: asString(
      r.timestamp ?? r.created_at ?? r.detected_at,
      new Date().toISOString(),
    ),
    busId: asString(r.bus_id ?? r.busId ?? r.vehicle_id ?? r.unit_id, "BEL-BUS-00"),
    confidence: Math.min(
      1,
      Math.max(0, asNumber(r.confidence ?? r.score ?? r.confidence_score, 0.9)),
    ),
    lat: asNumber(r.lat ?? r.latitude ?? latFromCoords, 28.6139),
    lng: asNumber(r.lng ?? r.lon ?? r.longitude ?? lngFromCoords, 77.209),
  };
}

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: "mock-001",
    type: "pothole",
    timestamp: "2026-09-07T04:49:18.000Z",
    busId: "BEL-BUS-07",
    confidence: 0.94,
    lat: 28.6304,
    lng: 77.2177,
  },
  {
    id: "mock-002",
    type: "rash_driving",
    timestamp: "2026-09-07T04:46:40.000Z",
    busId: "BEL-BUS-14",
    confidence: 0.91,
    lat: 28.6129,
    lng: 77.2295,
  },
  {
    id: "mock-003",
    type: "waterlogging",
    timestamp: "2026-09-07T04:41:12.000Z",
    busId: "BEL-BUS-03",
    confidence: 0.88,
    lat: 28.6506,
    lng: 77.2303,
  },
  {
    id: "mock-004",
    type: "missing_divider",
    timestamp: "2026-09-07T04:35:04.000Z",
    busId: "BEL-BUS-21",
    confidence: 0.86,
    lat: 28.6519,
    lng: 77.1907,
  },
  {
    id: "mock-005",
    type: "pothole",
    timestamp: "2026-09-07T04:28:51.000Z",
    busId: "BEL-BUS-11",
    confidence: 0.97,
    lat: 28.5708,
    lng: 77.2373,
  },
  {
    id: "mock-006",
    type: "waterlogging",
    timestamp: "2026-09-07T04:16:22.000Z",
    busId: "BEL-BUS-18",
    confidence: 0.83,
    lat: 28.5921,
    lng: 77.046,
  },
  {
    id: "mock-007",
    type: "rash_driving",
    timestamp: "2026-09-07T04:08:09.000Z",
    busId: "BEL-BUS-02",
    confidence: 0.9,
    lat: 28.5672,
    lng: 77.326,
  },
  {
    id: "mock-008",
    type: "missing_divider",
    timestamp: "2026-09-07T03:54:33.000Z",
    busId: "BEL-BUS-24",
    confidence: 0.79,
    lat: 28.7041,
    lng: 77.1025,
  },
];
