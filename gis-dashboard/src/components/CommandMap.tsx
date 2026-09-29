"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { INCIDENT_META, type Incident } from "@/lib/incidents";

const DELHI: L.LatLngTuple = [28.6139, 77.209];

type CommandMapProps = {
  incidents: Incident[];
  selectedId: string | null;
  focusToken: number;
  onSelect: (incident: Incident) => void;
};

export default function CommandMap({
  incidents,
  selectedId,
  focusToken,
  onSelect,
}: CommandMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [mapReady, setMapReady] = useState(false);

  onSelectRef.current = onSelect;

  useEffect(() => {
    const node = containerRef.current;
    if (!node || mapRef.current) return;

    const map = L.map(node, {
      center: DELHI,
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      className: "dark-map-tiles",
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    const resize = () => map.invalidateSize();
    const timer = window.setTimeout(resize, 80);
    window.addEventListener("resize", resize);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", resize);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const nextIds = new Set(incidents.map((incident) => incident.id));
    for (const [id, marker] of markersRef.current) {
      if (!nextIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const incident of incidents) {
      const meta = INCIDENT_META[incident.type];
      const isSelected = incident.id === selectedId;
      const style: L.CircleMarkerOptions = {
        radius: isSelected ? 12 : 8,
        color: meta.marker,
        fillColor: meta.marker,
        fillOpacity: isSelected ? 0.95 : 0.7,
        weight: isSelected ? 3 : 1.5,
      };

      let marker = markersRef.current.get(incident.id);
      if (!marker) {
        marker = L.circleMarker([incident.lat, incident.lng], style).addTo(map);
        marker.on("click", () => onSelectRef.current(incident));
        marker.bindPopup(
          `<strong>${meta.label}</strong><br/><span style="font-family:monospace">${incident.busId}</span><br/>${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)}<br/>Confidence ${(incident.confidence * 100).toFixed(1)}%`,
        );
        markersRef.current.set(incident.id, marker);
      } else {
        marker.setLatLng([incident.lat, incident.lng]);
        marker.setStyle(style);
      }
    }
  }, [incidents, selectedId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedId || focusToken === 0) return;

    const incident = incidents.find((item) => item.id === selectedId);
    if (!incident) return;
    map.flyTo([incident.lat, incident.lng], 16, { duration: 0.85 });
  }, [selectedId, incidents, mapReady, focusToken]);

  return <div ref={containerRef} className="h-full min-h-[360px] w-full" />;
}
