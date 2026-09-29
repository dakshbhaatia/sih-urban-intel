"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Incident } from "./page";

// Guard Leaflet Icon initialization so it only runs in the browser
let hazardIcon: L.Icon | null = null;
if (typeof window !== "undefined") {
  hazardIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
}

const createBusIcon = (busId: string) => {
  if (typeof window === "undefined" || !L) return null as any;
  return L.divIcon({const createBusIcon = (busId: string) => {
    if (typeof window === "undefined" || !L) return null as any;
    return L.divIcon({
    className: "bus-custom-marker",
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
        <div style="background: rgba(13, 17, 23, 0.95); border: 1px solid #00f2fe; color: #00f2fe; font-family: monospace; font-size: 10px; padding: 2px 6px; border-radius: 4px; white-space: nowrap; margin-bottom: 4px; box-shadow: 0 0 10px rgba(0,242,254,0.3);">
          ${busId}
        </div>
        <div style="width: 14px; height: 14px; background: #00f2fe; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px #00f2fe;"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 35],
  });
};

export function parsePoint(locStr?: any): [number, number] {
  if (!locStr) return [28.6139, 77.2090];
  try {
    if (typeof locStr === "string") {
      // 1. Handle PostGIS Hex EWKB (e.g., 0101000020E6100000...)
      if (/^[0123456789ABCDEFabcdef]{32,}$/.test(locStr.trim())) {
        const hex = locStr.trim();
        // Standard EWKB 2D point: 8 bytes lng at offset 18, 8 bytes lat at offset 26
        const offset = hex.length >= 50 ? hex.length - 32 : 18;
        const hexLng = hex.slice(offset, offset + 16);
        const hexLat = hex.slice(offset + 16, offset + 32);

        const readDoubleLE = (h: string) => {
          const bytes = new Uint8Array(8);
          for (let i = 0; i < 8; i++) {
            bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
          }
          return new DataView(bytes.buffer).getFloat64(0, true);
        };

        const lng = readDoubleLE(hexLng);
        const lat = readDoubleLE(hexLat);

        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90) {
          return [lat, lng];
        }
      }

      // 2. Handle WKT POINT(lng lat)
      const wkt = locStr.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (wkt) {
        const lng = parseFloat(wkt[1]);
        const lat = parseFloat(wkt[2]);
        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
      }

      // 3. Handle standard comma/space separated lat,lng
      const parts = locStr.replace(/[^-\d.,\s]/g, "").split(/[,\s]+/);
      if (parts.length >= 2) {
        const v1 = parseFloat(parts[0]);
        const v2 = parseFloat(parts[1]);
        if (!isNaN(v1) && !isNaN(v2)) {
          return v1 < 40 ? [v1, v2] : [v2, v1];
        }
      }
    }
  } catch {}
  return [28.6139, 77.2090];
}

interface FleetBus {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  dLat: number;
  dLng: number;
}

const INITIAL_FLEET: FleetBus[] = [
  { id: "BEL-BUS-11", lat: 28.6139, lng: 77.2090, speed: 38, dLat: 0.0003, dLng: 0.0002 },
  { id: "BEL-BUS-14", lat: 28.6304, lng: 77.2177, speed: 42, dLat: -0.0002, dLng: 0.0003 },
  { id: "BEL-BUS-18", lat: 28.6506, lng: 77.2303, speed: 29, dLat: 0.0001, dLng: -0.0003 },
  { id: "BEL-BUS-22", lat: 28.5708, lng: 77.2373, speed: 45, dLat: -0.0003, dLng: 0.0001 },
  { id: "BEL-BUS-25", lat: 28.6519, lng: 77.1907, speed: 34, dLat: 0.0002, dLng: 0.0002 },
  { id: "BEL-BUS-29", lat: 28.6129, lng: 77.2295, speed: 40, dLat: -0.0002, dLng: -0.0002 },
];

interface MapProps {
  incidents: Incident[];
  targetCoords: [number, number] | null;
  onSelectIncident: (inc: Incident) => void;
}

export default function MapComponent({
  incidents,
  targetCoords,
  onSelectIncident,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const fleetLayerRef = useRef<L.LayerGroup | null>(null);
  const fleetStateRef = useRef<FleetBus[]>(INITIAL_FLEET);
  const selectHandlerRef = useRef(onSelectIncident);

  useEffect(() => {
    selectHandlerRef.current = onSelectIncident;
  }, [onSelectIncident]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.6139, 77.2090],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    incidentLayerRef.current = L.layerGroup().addTo(map);
    fleetLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !targetCoords) return;
    mapInstanceRef.current.stop();
    mapInstanceRef.current.flyTo(targetCoords, 16, {
      animate: true,
      duration: 1.0,
      easeLinearity: 0.25,
    });
  }, [targetCoords]);

  useEffect(() => {
    if (!incidentLayerRef.current) return;
    incidentLayerRef.current.clearLayers();

    incidents.forEach((inc) => {
      const pos = parsePoint(inc.location);
      const marker = L.marker(pos, { icon: hazardIcon });

      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 11px;">
          <div style="font-weight: bold; color: #e11d48; text-transform: uppercase;">${inc.event_type}</div>
          <div>Reported: ${inc.bus_id}</div>
          <div>Confidence: ${(inc.confidence * 100).toFixed(0)}%</div>
          <div style="font-size: 10px; color: #71717a; margin-top: 4px;">${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}</div>
        </div>
      `);

      marker.on("click", () => {
        if (selectHandlerRef.current) selectHandlerRef.current(inc);
      });

      marker.addTo(incidentLayerRef.current!);
    });
  }, [incidents]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!fleetLayerRef.current) return;
      fleetLayerRef.current.clearLayers();

      fleetStateRef.current = fleetStateRef.current.map((bus) => {
        let newLat = bus.lat + bus.dLat;
        let newLng = bus.lng + bus.dLng;
        let newDLat = bus.dLat;
        let newDLng = bus.dLng;

        if (newLat > 28.72 || newLat < 28.50) newDLat = -bus.dLat;
        if (newLng > 77.35 || newLng < 77.05) newDLng = -bus.dLng;

        return {
          ...bus,
          lat: newLat,
          lng: newLng,
          dLat: newDLat,
          dLng: newDLng,
          speed: Math.floor(Math.random() * 20) + 25,
        };
      });

      fleetStateRef.current.forEach((bus) => {
        const busMarker = L.marker([bus.lat, bus.lng], { icon: createBusIcon(bus.id) });
        busMarker.addTo(fleetLayerRef.current!);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return <div ref={mapContainerRef} className="w-full h-full relative z-0" />;
}