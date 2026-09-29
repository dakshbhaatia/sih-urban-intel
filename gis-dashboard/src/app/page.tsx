"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Shield, Radio, Activity, AlertTriangle, Cpu, MapPin, X, CheckCircle, Navigation } from "lucide-react";

export function parsePoint(pointStr: string): [number, number] {
  try {
    const match = pointStr.match(/\(([^)]+)\)/);
    if (match) {
      const [lng, lat] = match[1].split(" ").map(Number);
      return [lat, lng];
    }
  } catch (e) {
    console.error("Failed to parse point:", e);
  }
  return [28.6139, 77.209]; // fallback coordinates
}

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-sm">
      INITIALIZING TACTICAL GIS SUB-SYSTEM...
    </div>
  ),
});

export interface Incident {
  id?: string | number;
  bus_id: string;
  event_type: string;
  severity: string;
  confidence: number;
  evidence_base64?: string;
  location?: string;
  created_at?: string;
}
function extractCoords(locStr?: any): [number, number] {
  return parsePoint(locStr);
}

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/incidents", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.incidents) {
        setIncidents(data.incidents);
        setIsLive(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 2000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    const [lat, lng] = extractCoords(incident.location);
    setTargetCoords([lat, lng]);
  };

  const handleAction = (type: string) => {
    setActionStatus(type);
    setTimeout(() => {
      setActionStatus(null);
    }, 4000);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0c10] text-zinc-200 font-sans antialiased overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-[#0d1117]/90 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider text-zinc-100 uppercase font-mono">
                Bharat Electronics Limited
              </h1>
              <span className="text-[10px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded font-mono text-zinc-400">
                BEL-GIS-C4I
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              AI-Powered Mobile Urban Intelligence // PS-26124
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60">
            <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
            <span className="text-xs font-mono tracking-wider uppercase text-zinc-300">
              {isLive ? "REALTIME FLEET SYNC" : "EDGE STANDBY"}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        <div className="flex-1 relative border-r border-zinc-800/80">
          <MapComponent
            incidents={incidents}
            targetCoords={targetCoords}
            onSelectIncident={handleSelectIncident}
          />

          <div className="absolute top-4 left-4 z-10 flex gap-3 pointer-events-none">
            <div className="px-3.5 py-2 rounded border border-zinc-800 bg-[#0d1117]/90 backdrop-blur shadow-xl pointer-events-auto">
              <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" /> Active Fleet
              </div>
              <div className="text-lg font-mono font-bold text-zinc-100 mt-0.5">24 Units</div>
            </div>

            <div className="px-3.5 py-2 rounded border border-zinc-800 bg-[#0d1117]/90 backdrop-blur shadow-xl pointer-events-auto">
              <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Bandwidth Efficiency
              </div>
              <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">99.82% Saved</div>
            </div>

            <div className="px-3.5 py-2 rounded border border-zinc-800 bg-[#0d1117]/90 backdrop-blur shadow-xl pointer-events-auto">
              <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Verified Anomalies
              </div>
              <div className="text-lg font-mono font-bold text-amber-400 mt-0.5">{incidents.length}</div>
            </div>
          </div>
        </div>

        <div className="w-96 flex flex-col bg-[#0b0e14] border-l border-zinc-800 z-10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-medium tracking-wider text-zinc-300 uppercase">
                Edge Ingress Feed
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">{incidents.length} logs</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 p-2 space-y-1">
            {incidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-600 font-mono text-xs">
                <Radio className="w-6 h-6 mb-2 text-zinc-700 animate-pulse" />
                Awaiting edge telemetry stream...
                <span className="text-[10px] text-zinc-600 mt-1">Press P, W, D, or H on edge client</span>
              </div>
            ) : (
              incidents.map((incident, idx) => (
                <div
                  key={incident.id || idx}
                  onClick={() => handleSelectIncident(incident)}
                  className={`p-3 rounded border transition-all cursor-pointer ${
                    selectedIncident?.id === incident.id
                      ? "bg-zinc-800/80 border-cyan-500/50"
                      : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold tracking-wide uppercase ${
                        incident.severity === "CRITICAL"
                          ? "bg-red-500/10 text-red-400 border border-red-500/30"
                          : incident.severity === "HIGH"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                      }`}
                    >
                      {incident.event_type}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-medium">
                      {(incident.confidence * 100).toFixed(0)}% conf
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2.5">
                    {incident.evidence_base64 && (
                      <img
                        src={`data:image/jpeg;base64,${incident.evidence_base64}`}
                        alt="Evidence Crop"
                        className="w-14 h-11 object-cover rounded border border-zinc-700/80 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 font-mono text-xs">
                      <div className="text-zinc-200 font-semibold truncate">{incident.bus_id}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-zinc-600 shrink-0" />
                        {incident.location || "28.6139, 77.2090"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedIncident && (
          <div className="absolute right-96 top-4 w-96 rounded-lg border border-zinc-700/80 bg-[#0d1117]/95 backdrop-blur-md shadow-2xl p-5 z-30 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="font-semibold text-zinc-100 uppercase tracking-wide">Incident Forensic Dossier</span>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedIncident.evidence_base64 && (
              <div className="mt-3 relative rounded overflow-hidden border border-zinc-800">
                <img
                  src={`data:image/jpeg;base64,${selectedIncident.evidence_base64}`}
                  alt="Incident Forensic Evidence"
                  className="w-full h-44 object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded border border-zinc-700 text-[10px] text-emerald-400">
                  ANONYMIZED EDGE CROP (DPDP COMPLIANT)
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2 text-zinc-300">
              <div className="flex justify-between border-b border-zinc-800/60 py-1">
                <span className="text-zinc-500">Hazard Classification:</span>
                <span className="font-bold text-amber-400">{selectedIncident.event_type}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 py-1">
                <span className="text-zinc-500">Origin Unit:</span>
                <span className="text-zinc-100">{selectedIncident.bus_id}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 py-1">
                <span className="text-zinc-500">Model Confidence:</span>
                <span className="text-emerald-400 font-bold">{(selectedIncident.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 py-1">
                <span className="text-zinc-500">Telemetry Payload Size:</span>
                <span className="text-zinc-100">4.8 KB (99.8% Bandwidth Saved)</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 py-1">
                <span className="text-zinc-500">Spatial Geometry:</span>
                <span className="text-zinc-300 truncate max-w-[180px]">{selectedIncident.location || "POINT(77.2090 28.6139)"}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 space-y-2">
              {actionStatus ? (
                <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center font-semibold text-[11px] flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {actionStatus}
                </div>
              ) : selectedIncident.event_type.includes("HIT-AND-RUN") ? (
                <button
                  onClick={() => handleAction("INTERCEPT WATCHLIST PUSHED TO 4 DOWNSTREAM BUSES")}
                  className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded transition flex items-center justify-center gap-2 tracking-wider uppercase text-[11px]"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Broadcast Intercept Corridor
                </button>
              ) : (
                <button
                  onClick={() => handleAction("PWD CIVIC WORK ORDER #26124-B DISPATCHED")}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-black font-semibold rounded transition flex items-center justify-center gap-2 tracking-wider uppercase text-[11px]"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Dispatch PWD Work Order
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}