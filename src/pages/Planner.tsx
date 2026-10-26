import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Route as RouteIcon, Trash2, MousePointerClick, Eraser, Download, Printer,
  Layers, Mountain, Thermometer, X, Info, Car, Bot, Plane, Truck, ChevronRight,
  AlertTriangle, ShieldCheck, ShieldAlert, Flame, ArrowUpDown, Clock, Gauge,
  Ruler, TrendingUp, Satellite, MapPin, RotateCcw, FileText, Sparkles, Sun
} from 'lucide-react';
import { MarsScene, type LayerId } from '../lib/MarsScene';
import {
  loadDem, elevationAt, slopeAt, haversineKm, LANDMARKS, ROUTE_PRESETS,
  VEHICLES, vehicleById, type VehicleProfileId,
} from '../lib/marsData';
import { analyzeRoute, type RouteAnalysis } from '../lib/analysis';
import { useLang } from '../lib/i18n';
import { fmtElev, fmtLat, fmtLon, fmtKm, fmtDuration } from '../lib/format';
import ProfileChart from '../components/ProfileChart';
import RiskGauge from '../components/RiskGauge';

const VEHICLE_ICONS: Record<string, typeof Car> = { Car, Bot, Plane, Truck };
const LAYER_DEFS: { id: LayerId | 'landmarks' | 'grid'; en: string; ar: string; sub: string; subAr: string; icon: typeof Layers }[] = [
  { id: 'photo', en: 'HiRISE / CTX Photo', ar: 'صور HiRISE / CTX', sub: 'Tianwen-1 global color orthomosaic · 76 m/px', subAr: 'موزايك تيانوين-1 العالمي · 76 م/بكسل', icon: Satellite },
  { id: 'topo', en: 'MOLA Topography', ar: 'تضاريس MOLA', sub: 'Elevation + hillshade · MGS MEGDR 463 m', subAr: 'ارتفاع + تظليل · MGS MEGDR', icon: Mountain },
  { id: 'thermal', en: 'THEMIS Thermal IR', ar: 'الأشعة الحرارية THEMIS', sub: 'Night IR model · dust vs rock thermal inertia', subAr: 'نموذج حراري ليلي · خمول حراري', icon: Thermometer },
  { id: 'slope', en: 'Slope / Roughness', ar: 'الانحدار / الخشونة', sub: 'Derived gradient map · green <8° → red >20°', subAr: 'خريطة مشتقة · الأخضر <8° والأحمر >20°', icon: TrendingUp },
];

export default function Planner() {
  const { pick, lang } = useLang();
  const [searchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MarsScene | null>(null);
  const wpIdRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [drawMode, setDrawMode] = useState(true);
  const [vehicle, setVehicle] = useState<VehicleProfileId>('crewed');
  const [waypoints, setWaypoints] = useState<{ id: number; lat: number; lon: number }[]>([]);
  const [analysis, setAnalysis] = useState<RouteAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null);
  const [layers, setLayers] = useState<Record<string, boolean>>({ photo: true, topo: false, thermal: false, slope: false, landmarks: true, grid: false });
  const [overlayOpacity, setOverlayOpacity] = useState(80);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [demStats, setDemStats] = useState<{ min: number; max: number } | null>({ min: -8135, max: 21159 });
  const [exported, setExported] = useState(false);

  const vehicleProfile = vehicleById(vehicle);

  /* ---------- init scene + DEM ---------- */
  useEffect(() => {
    loadDem().then(a => {
      let mn = Infinity, mx = -Infinity;
      for (let i = 0; i < a.length; i += 37) { if (a[i] < mn) mn = a[i]; if (a[i] > mx) mx = a[i]; }
      setDemStats({ min: mn, max: mx });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const scene = new MarsScene(containerRef.current);
    sceneRef.current = scene;
    scene.onSurfaceClick = (lat, lon) => {
      setWaypoints(prev => {
        if (prev.length >= 12) return prev;
        const id = ++wpIdRef.current;
        const wp = { id, lat, lon };
        scene.addWaypoint(id, lat, lon, prev.length);
        setAutoRotate(false);
        scene.setAutoRotate(false);
        return [...prev, wp];
      });
    };
    scene.onHover = (lat, lon) => {
      setCursor(isNaN(lat) ? null : { lat, lon });
    };
    scene.onWaypointDrag = (id, lat, lon) => {
      setWaypoints(prev => prev.map(w => (w.id === id ? { ...w, lat, lon } : w)));
    };
    return () => { scene.dispose(); sceneRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* ---------- recompute analysis ---------- */
  const runAnalysis = useCallback((pts: { lat: number; lon: number }[], veh: VehicleProfileId) => {
    setAnalyzing(true);
    // let the spinner paint before the heavy DEM loop
    window.setTimeout(() => {
      const result = analyzeRoute(pts, veh);
      setAnalysis(result);
      const scene = sceneRef.current;
      if (scene) {
        if (result) {
          scene.drawRoute(result.samples, result.verdict);
          scene.drawHazards(result.hazards.filter(h => h.severity === 'critical').map(h => ({ lat: h.lat, lon: h.lon, severity: h.severity })));
        } else scene.clearRoute();
      }
      setAnalyzing(false);
    }, 60);
  }, []);

  // re-analyze on waypoint / vehicle change (debounced)
  useEffect(() => {
    if (waypoints.length < 2) { setAnalysis(null); sceneRef.current?.clearRoute(); return; }
    const t = window.setTimeout(() => runAnalysis(waypoints.map(w => ({ lat: w.lat, lon: w.lon })), vehicle), 220);
    return () => window.clearTimeout(t);
  }, [waypoints, vehicle, runAnalysis]);

  const rebuildWaypointMeshes = useCallback((pts: { id: number; lat: number; lon: number }[]) => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.clearWaypoints();
    pts.forEach((w, i) => scene.addWaypoint(w.id, w.lat, w.lon, i));
    if (analysis) scene.drawRoute(analysis.samples, analysis.verdict);
  }, [analysis]);

  const removeWaypoint = (id: number) => {
    setWaypoints(prev => {
      const next = prev.filter(w => w.id !== id);
      const scene = sceneRef.current;
      if (scene) {
        scene.removeWaypointMesh(id);
        scene.clearWaypoints();
        next.forEach((w, i) => scene.addWaypoint(w.id, w.lat, w.lon, i));
        if (next.length >= 2) {
          const r = analyzeRoute(next.map(w => ({ lat: w.lat, lon: w.lon })), vehicle);
          if (r) scene.drawRoute(r.samples, r.verdict);
        }
      }
      return next;
    });
  };

  const clearAll = () => {
    setWaypoints([]);
    setAnalysis(null);
    setActivePreset(null);
    const scene = sceneRef.current;
    if (scene) { scene.clearWaypoints(); scene.hideSelection(); }
  };

  const undoLast = () => {
    setWaypoints(prev => {
      if (!prev.length) return prev;
      const next = prev.slice(0, -1);
      const scene = sceneRef.current;
      if (scene) {
        scene.removeWaypointMesh(prev[prev.length - 1].id);
        // renumber
        scene.clearWaypoints();
        next.forEach((w, i) => scene.addWaypoint(w.id, w.lat, w.lon, i));
        if (next.length >= 2) {
          const r = analyzeRoute(next.map(w => ({ lat: w.lat, lon: w.lon })), vehicle);
          if (r) scene.drawRoute(r.samples, r.verdict);
        }
      }
      return next;
    });
  };

  const loadPreset = useCallback((presetId: string) => {
    const preset = ROUTE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setVehicle(preset.vehicle);
    wpIdRef.current = 0;
    const pts = preset.points.map(p => ({ id: ++wpIdRef.current, lat: p.lat, lon: p.lon }));
    setWaypoints(pts);
    const scene = sceneRef.current;
    if (scene) {
      scene.clearWaypoints();
      pts.forEach((w, i) => scene.addWaypoint(w.id, w.lat, w.lon, i));
      scene.flyTo(preset.points[0].lat, preset.points[0].lon, 215);
      scene.setAutoRotate(false);
      setAutoRotate(false);
    }
  }, []);

  /* deep link: /planner?preset=jezero-gale from Home */
  const deepLinkDone = useRef(false);
  useEffect(() => {
    const preset = searchParams.get('preset');
    if (preset && ready && sceneRef.current && !deepLinkDone.current) {
      deepLinkDone.current = true;
      window.setTimeout(() => loadPreset(preset), 450);
    }
  }, [ready, searchParams, loadPreset]);

  const flyToLandmark = (lat: number, lon: number) => {
    sceneRef.current?.flyTo(lat, lon, 165);
    sceneRef.current?.showSelectionAt(lat, lon);
  };

  const toggleLayer = (id: LayerId | 'landmarks' | 'grid') => {
    setLayers(prev => {
      const next = { ...prev, [id]: !prev[id] };
      sceneRef.current?.setLayer(id, next[id]);
      return next;
    });
  };

  useEffect(() => { sceneRef.current?.setOverlayOpacity(overlayOpacity / 100); }, [overlayOpacity]);
  useEffect(() => { sceneRef.current?.setAutoRotate(autoRotate); }, [autoRotate]);

  /* ---------- derived ---------- */
  const cursorInfo = useMemo(() => {
    if (!cursor || !ready) return null;
    return { elev: elevationAt(cursor.lat, cursor.lon), slope: slopeAt(cursor.lat, cursor.lon) };
  }, [cursor, ready]);

  const totalDistKm = analysis?.distanceKm ?? 0;
  const dur = analysis ? fmtDuration(analysis.durationMin) : null;
  const verdict = analysis?.verdict ?? null;
  const verdictColor = verdict === 'safe' ? 'text-jade' : verdict === 'caution' ? 'text-amberx' : 'text-blood';
  const verdictBg = verdict === 'safe' ? 'border-jade/40 bg-jade/10' : verdict === 'caution' ? 'border-amberx/40 bg-amberx/10' : 'border-blood/40 bg-blood/10';

  /* ---------- export report ---------- */
  const exportReport = () => {
    if (!analysis) return;
    const lines = [
      '═══════════════════════════════════════════════',
      ' MARS SURVIVAL GUIDE — ROUTE SAFETY REPORT',
      ' Mission Planning Console · NASA Open Data',
      '═══════════════════════════════════════════════',
      ` Generated: ${new Date().toISOString()}`,
      ` Vehicle profile: ${vehicleProfile.label}`,
      ` Waypoints: ${analysis.waypointCount}`,
      '',
      '── ROUTE ──────────────────────────────────────',
      ` Total distance      : ${analysis.distanceKm.toFixed(1)} km`,
      ` Est. traverse time  : ${dur!.h} h ${dur!.m} m  (${(analysis.durationMin / 60 / 12.3).toFixed(2)} sols @ 12.3 h driving)`,
      ` Elevation gain      : +${Math.round(analysis.elevGainM).toLocaleString()} m`,
      ` Elevation loss      : -${Math.round(analysis.elevLossM).toLocaleString()} m`,
      ` Min / Max elevation : ${fmtElev(analysis.minElevM)} / ${fmtElev(analysis.maxElevM)}`,
      ` Max slope           : ${analysis.maxSlopeDeg.toFixed(1)}°`,
      ` Mean slope          : ${analysis.avgSlopeDeg.toFixed(2)}°`,
      '',
      '── VERDICT ─────────────────────────────────────',
      ` SAFETY SCORE        : ${analysis.safetyScore}/100  — ${analysis.safetyLabel}`,
      '',
      '── HAZARDS ─────────────────────────────────────',
      ...(analysis.hazards.length
        ? analysis.hazards.map(h => ` [${h.severity.toUpperCase().padEnd(8)}] km ${h.fromKm.toFixed(0)} → ${h.toKm.toFixed(0)}  ${h.label}: ${h.detail}`)
        : [' None detected.']),
      '',
      '── FLIGHT DIRECTOR RECOMMENDATIONS ─────────────',
      ...analysis.suggestions.map(s => ` • ${s}`),
      '',
      'Data: MOLA MEGDR (megt90n000eb) · 16 px/deg Simple Cylindrical',
      'Photo: Tianwen-1 Global Color Orthomosaic (76 m/px)',
      'Slope: central-difference gradient, bilinear DEM sampling',
      '═══════════════════════════════════════════════',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mars-route-report.txt';
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 2000);
  };

  const criticalHazards = analysis?.hazards.filter(h => h.severity === 'critical') ?? [];
  const warningHazards = analysis?.hazards.filter(h => h.severity === 'warning') ?? [];

  return (
    <div className="h-[calc(100dvh-3.5rem)] lg:h-[calc(100dvh-5.25rem)] min-h-[560px] flex flex-col lg:flex-row overflow-hidden bg-abyss">
      {/* ================= LEFT — LAYERS / TOOLS ================= */}
      <aside className="order-2 lg:order-1 lg:w-[248px] xl:w-[264px] shrink-0 border-t lg:border-t-0 lg:border-e border-edge bg-panel/80 backdrop-blur-xl flex lg:flex-col overflow-x-auto lg:overflow-y-auto slim-scroll">
        {/* layer list */}
        <div className="flex lg:flex-col p-3 gap-2 min-w-max lg:min-w-0">
          <div className="hidden lg:flex items-center justify-between px-1 pt-1">
            <span className="text-[10px] font-mono tracking-[0.22em] text-sand flex items-center gap-1.5"><Layers size={11} /> DATA LAYERS</span>
            <span className="text-[9px] font-mono text-mute">4 OVERLAYS</span>
          </div>
          {LAYER_DEFS.map(L => {
            const on = layers[L.id];
            const Icon = L.icon;
            return (
              <button
                key={L.id}
                onClick={() => toggleLayer(L.id as LayerId)}
                className={`relative flex lg:flex-row flex-col items-center lg:items-start gap-2 lg:gap-2.5 p-2 lg:p-2.5 rounded-xl border text-start transition-all w-[132px] lg:w-auto ${
                  on ? 'border-ember/55 bg-ember/12 shadow-[0_0_18px_rgba(232,118,45,0.14)]' : 'border-edge bg-panel2 hover:border-edge2'
                }`}
                aria-pressed={on}
              >
                <div className={`w-8 h-8 lg:w-9 lg:h-9 shrink-0 rounded-lg grid place-items-center ${on ? 'bg-ember/25 text-[#ffc9a3]' : 'bg-black/40 text-mute'}`}>
                  <Icon size={17} strokeWidth={1.8} />
                </div>
                <div className="min-w-0 text-center lg:text-start">
                  <div className={`text-[10.5px] lg:text-[11px] font-semibold leading-tight ${on ? 'text-[#ffd9c2]' : 'text-ink'}`}>{pick(L.en, L.ar)}</div>
                  <div className="hidden lg:block text-[8.5px] leading-snug text-mute mt-0.5">{pick(L.sub, L.subAr)}</div>
                </div>
                <span className={`absolute top-1.5 end-1.5 w-2 h-2 rounded-full ${on ? 'bg-jade shadow-[0_0_6px_#34d399]' : 'bg-edge2'}`} />
              </button>
            );
          })}
        </div>

        {/* opacity + grid + landmarks */}
        <div className="hidden lg:block px-4 pb-3 border-t border-edge/70 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="opac" className="text-[9.5px] font-mono tracking-widest text-mute">OVERLAY OPACITY</label>
            <span className="text-[9.5px] font-mono text-cyanx">{overlayOpacity}%</span>
          </div>
          <input id="opac" type="range" min={20} max={100} value={overlayOpacity} onChange={e => setOverlayOpacity(+e.target.value)}
            className="mars-range w-full" style={{ ['--fill' as string]: `${overlayOpacity}%` }} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={() => toggleLayer('landmarks')} className={`h-8 rounded-md border text-[10px] font-semibold tracking-wide transition-colors ${layers.landmarks ? 'border-cyanx/50 bg-cyanx/10 text-cyanx' : 'border-edge text-mute hover:text-ink'}`}>
              ◉ SITES {layers.landmarks ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => toggleLayer('grid')} className={`h-8 rounded-md border text-[10px] font-semibold tracking-wide transition-colors ${layers.grid ? 'border-cyanx/50 bg-cyanx/10 text-cyanx' : 'border-edge text-mute hover:text-ink'}`}>
              ⌗ GRATICULE {layers.grid ? 'ON' : 'OFF'}
            </button>
          </div>
          <button onClick={() => setAutoRotate(v => !v)} className="mt-2 w-full h-8 rounded-md border border-edge text-[10px] font-mono tracking-widest text-mute hover:text-ink transition-colors">
            {autoRotate ? '⏸ PAUSE PLANET SPIN' : '▶ AUTO-ROTATE PLANET'}
          </button>
        </div>

        {/* vehicle profiles */}
        <div className="hidden lg:flex flex-col px-4 pb-3 border-t border-edge/70 pt-3">
          <div className="text-[10px] font-mono tracking-[0.22em] text-sand mb-2 flex items-center gap-1.5"><Car size={11} /> VEHICLE PROFILE</div>
          <div className="grid grid-cols-2 gap-1.5">
            {VEHICLES.map(v => {
              const Icon = VEHICLE_ICONS[v.icon] ?? Car;
              const active = vehicle === v.id;
              return (
                <button key={v.id} onClick={() => setVehicle(v.id)} title={v.desc}
                  className={`flex flex-col items-start gap-1 p-2 rounded-lg border text-start transition-all ${active ? 'border-sand/60 bg-sand/10' : 'border-edge bg-panel2 hover:border-edge2'}`}>
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} className={active ? 'text-sand' : 'text-mute'} />
                    <span className={`text-[10px] font-bold ${active ? 'text-sand' : 'text-ink'}`}>{pick(v.label.split(' (')[0], v.labelAr)}</span>
                  </div>
                  <span className="text-[8px] font-mono text-mute">CRUISE {v.cruiseKmh} km/h · MAX {v.maxSlopeDeg}°</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[9px] leading-snug text-mute/80">{pick(vehicleProfile.desc, vehicleProfile.desc)}</p>
        </div>

        {/* presets */}
        <div className="hidden lg:flex flex-col px-4 pb-4 border-t border-edge/70 pt-3">
          <div className="text-[10px] font-mono tracking-[0.22em] text-sand mb-2 flex items-center gap-1.5"><Sparkles size={11} /> SUGGESTED EXPEDITIONS</div>
          <div className="space-y-1.5">
            {ROUTE_PRESETS.map(p => (
              <button key={p.id} onClick={() => loadPreset(p.id)}
                className={`w-full text-start px-2.5 py-2 rounded-lg border transition-all group ${activePreset === p.id ? 'border-ember/60 bg-ember/10' : 'border-edge bg-panel2 hover:border-ember/40'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-semibold text-ink leading-tight">{pick(p.title, p.titleAr)}</span>
                  <ChevronRight size={13} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${activePreset === p.id ? 'text-ember' : 'text-mute'}`} />
                </div>
                <div className="mt-0.5 text-[8px] font-mono text-mute">{p.difficulty.toUpperCase()} · {p.points.length} WPTS</div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ================= CENTER — 3D GLOBE ================= */}
      <main className="relative flex-1 min-h-[380px] lg:min-h-0 order-1 lg:order-2 bg-[#05070d]">
        <div ref={containerRef} className="absolute inset-0" aria-label="Interactive 3D Mars globe" role="application" />

        {/* loading veil */}
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-[#05070d] z-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-ember/30 border-t-ember animate-spin" />
              <div className="text-[11px] font-mono tracking-[0.25em] text-sand">LOADING MOLA ELEVATION FIELD…</div>
              <div className="text-[9px] font-mono text-mute">16,588,800 elevation bins · 8.3 MB · MGS 1999–2001</div>
            </div>
          </div>
        )}

        {/* top-left: mission badge */}
        <div className="absolute top-3 start-3 z-10 pointer-events-none select-none">
          <div className="panel rounded-lg px-3 py-2 pointer-events-auto">
            <div className="text-[8.5px] font-mono tracking-[0.25em] text-sand">EACHTO · PLANETARY SURFACE OPERATIONS</div>
            <div className="font-display font-bold text-[15px] text-ink leading-tight mt-0.5">MARS <span className="text-ember">/</span> ROUTE PLANNER v2.4</div>
            <div className="text-[8.5px] font-mono text-mute mt-0.5">AREOID DATUM · IAU2000 · SIMPLE CYLINDRICAL</div>
          </div>
        </div>

        {/* top-right: mode + draw controls */}
        <div className="absolute top-3 end-3 z-10 flex flex-col items-end gap-2">
          <button
            onClick={() => setDrawMode(v => !v)}
            className={`h-10 ps-3 pe-4 rounded-lg border flex items-center gap-2 font-bold text-[11px] tracking-widest transition-all shadow-lg ${
              drawMode ? 'border-cyanx/60 bg-cyanx/15 text-cyanx shadow-[0_0_18px_rgba(34,211,238,0.25)]' : 'border-edge2 bg-panel/90 text-mute'
            }`}
          >
            {drawMode ? <MousePointerClick size={16} /> : <RotateCcw size={15} />}
            {drawMode ? pick('DRAW MODE: ON', 'وضع الرسم: مفعّل') : pick('DRAW MODE: OFF', 'وضع الرسم: متوقف')}
          </button>
          <div className="panel rounded-lg px-3 py-1.5 text-[9px] font-mono text-mute max-w-[190px] text-end leading-snug">
            {drawMode
              ? pick('Click the globe to drop waypoints. Drag pins to adjust. Right-drag orbits.', 'انقر على الكرة لإضافة نقاط. اسحب الدبابيس للتعديل. اسحب للتدوير.')
              : pick('Orbit mode — drag to rotate, scroll to zoom.', 'وضع الاستكشاف — اسحب للتدوير وعجلة الفأرة للتقريب.')}
          </div>
        </div>

        {/* bottom-left: live cursor telemetry */}
        <div className="absolute bottom-3 start-3 z-10 panel rounded-lg px-3 py-2 font-mono text-[9.5px] leading-relaxed min-w-[168px]">
          <div className="flex items-center justify-between gap-3 border-b border-edge/70 pb-1 mb-1">
            <span className="text-sand tracking-[0.2em] text-[8.5px]">SURFACE TELEMETRY</span>
            <span className="w-1.5 h-1.5 rounded-full bg-jade pulse-dot" />
          </div>
          {cursor ? (
            <>
              <div className="flex justify-between gap-3"><span className="text-mute">LAT</span><span className="text-ink">{fmtLat(cursor.lat)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-mute">LON</span><span className="text-ink">{fmtLon(cursor.lon)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-mute">ELEV</span><span className={cursorInfo && cursorInfo.elev >= 0 ? 'text-sand' : 'text-cyanx'}>{cursorInfo ? fmtElev(cursorInfo.elev) : '—'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-mute">SLOPE</span><span className={cursorInfo && cursorInfo.slope > 12 ? 'text-blood' : cursorInfo && cursorInfo.slope > 6 ? 'text-amberx' : 'text-jade'}>{cursorInfo ? cursorInfo.slope.toFixed(1) + '°' : '—'}</span></div>
            </>
          ) : (
            <div className="text-mute/70 py-1">— hover the surface —</div>
          )}
        </div>

        {/* bottom-center: waypoint chips */}
        {waypoints.length > 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 panel rounded-lg px-2 py-1.5 flex items-center gap-1.5 max-w-[46vw] overflow-x-auto slim-scroll">
            {waypoints.map((w, i) => (
              <button key={w.id} onClick={() => removeWaypoint(w.id)} title="Remove waypoint"
                className="group flex items-center gap-1.5 h-7 ps-1 pe-2 rounded-md bg-cyanx/10 border border-cyanx/35 text-[9.5px] font-mono text-cyanx hover:border-blood hover:text-blood hover:bg-blood/10 transition-colors shrink-0">
                <span className="w-4 h-4 grid place-items-center rounded-sm bg-cyanx/25 text-[9px] font-bold group-hover:bg-blood/25">{i + 1}</span>
                {w.lat.toFixed(1)}°,{w.lon.toFixed(1)}°
                <X size={11} className="opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {/* right edge: scale + credits */}
        <div className="absolute bottom-3 end-3 z-10 hidden md:flex flex-col items-end gap-1 text-[8px] font-mono text-mute/80">
          <div>SUN {new Date().toISOString().slice(11, 16)} UTC · SOL 5052</div>
          <div>MOLA 16 px/deg · TIANWEN-1 76 m/px</div>
        </div>
      </main>

      {/* ================= RIGHT — ANALYSIS PANEL ================= */}
      <aside className="order-3 lg:w-[300px] xl:w-[330px] shrink-0 border-t lg:border-t-0 lg:border-s border-edge bg-panel/90 backdrop-blur-xl flex flex-col max-h-[46vh] lg:max-h-none overflow-y-auto slim-scroll">
        {/* verdict header */}
        <div className="p-3 border-b border-edge">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-[0.25em] text-sand flex items-center gap-1.5"><ShieldCheck size={12} /> ROUTE SAFETY REPORT</span>
            {analysis && <span className="text-[8.5px] font-mono text-mute">SOL 5052</span>}
          </div>

          {analyzing ? (
            <div className="h-[118px] grid place-items-center"><div className="w-8 h-8 rounded-full border-2 border-ember/30 border-t-ember animate-spin" /></div>
          ) : analysis ? (
            <div className="flex items-stretch gap-3">
              <RiskGauge score={analysis.safetyScore} verdict={analysis.verdict} />
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className={`inline-flex self-start items-center gap-1.5 px-2 py-1 rounded-md border text-[9.5px] font-bold tracking-widest ${verdictBg} ${verdictColor}`}>
                  {verdict === 'safe' ? <ShieldCheck size={12} /> : verdict === 'caution' ? <AlertTriangle size={12} /> : <ShieldAlert size={12} />}
                  {verdict === 'safe' ? 'VIABLE' : verdict === 'caution' ? 'CAUTION' : 'NO-GO'}
                </div>
                <div className="mt-1.5 font-display font-semibold text-[13px] leading-tight text-ink">{showHazards ? pick(analysis.safetyLabel, analysis.safetyLabelAr) : analysis.safetyLabel}</div>
                <div className="mt-1 text-[8.5px] font-mono text-mute">{analysis.hazards.length} HAZARD WINDOWS · {analysis.waypointCount} WPTS</div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-edge2 p-4 text-center">
              <RouteIcon size={26} className="mx-auto text-mute mb-2" />
              <div className="text-[11px] font-semibold text-ink">{pick('No route plotted yet', 'لم يُرسم أي مسار بعد')}</div>
              <div className="text-[9.5px] text-mute mt-1 leading-snug">{pick('Click the globe to drop a start point and at least one more waypoint — the console computes distance, elevation profile, slope and risk in real time.', 'انقر على الكرة لإضافة نقطة البداية ونقطة أخرى على الأقل — تحسب المنصة المسافة ومنحنى الارتفاع والانحدار والمخاطر لحظيًا.')}</div>
            </div>
          )}
        </div>

        {/* stat grid */}
        <div className="grid grid-cols-3 border-b border-edge">
          {[
            { icon: Ruler, label: 'DISTANCE', value: analysis ? fmtKm(analysis.distanceKm) : '—', unit: 'km', tone: 'text-cyanx' },
            { icon: Clock, label: 'EST. TIME', value: dur ? `${String(dur.h).padStart(2, '0')}:${String(dur.m).padStart(2, '0')}` : '—', unit: 'h:min', tone: 'text-sand' },
            { icon: Gauge, label: 'MAX SLOPE', value: analysis ? analysis.maxSlopeDeg.toFixed(1) : '—', unit: 'deg', tone: analysis && analysis.maxSlopeDeg > vehicleProfile.softSlopeDeg ? 'text-amberx' : 'text-jade' },
            { icon: ArrowUpDown, label: 'GAIN / LOSS', value: analysis ? `+${fmtIntShort(analysis.elevGainM)}/−${fmtIntShort(analysis.elevLossM)}` : '—', unit: 'm', tone: 'text-ink' },
            { icon: Mountain, label: 'HI / LO', value: analysis ? `${fmtElevShort(analysis.maxElevM)} / ${fmtElevShort(analysis.minElevM)}` : '—', unit: 'm', tone: 'text-violet' },
            { icon: TrendingUp, label: 'MEAN SLOPE', value: analysis ? analysis.avgSlopeDeg.toFixed(2) : '—', unit: 'deg', tone: 'text-ink' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="px-2 py-2 border-e border-b border-edge/60 last:border-e-0 [&:nth-child(3n)]:border-e-0 flex flex-col items-center justify-center text-center min-h-[62px]">
                <div className="flex items-center gap-1 text-mute"><Icon size={9} /><span className="text-[7.5px] font-mono tracking-widest">{s.label}</span></div>
                <div className={`font-mono font-semibold text-[12.5px] leading-tight mt-0.5 tabular-nums ${s.tone}`}>{s.value}<span className="text-[8px] text-mute font-normal ms-0.5">{s.unit}</span></div>
              </div>
            );
          })}
        </div>

        {/* elevation profile */}
        <div className="p-3 border-b border-edge">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9.5px] font-mono tracking-[0.2em] text-sand">ELEVATION PROFILE</span>
            <span className="text-[8px] font-mono text-mute">MOLA · 18 km SAMPLING</span>
          </div>
          <ProfileChart samples={analysis?.samples ?? []} hazards={analysis?.hazards ?? []} vehicleMaxSlope={vehicleProfile.maxSlopeDeg} />
        </div>

        {/* hazards feed */}
        <div className="p-3 border-b border-edge flex-1 min-h-[96px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9.5px] font-mono tracking-[0.2em] text-sand flex items-center gap-1.5"><Flame size={11} /> HAZARD WINDOWS</span>
            {analysis && <button onClick={() => setShowHazards(v => !v)} className="text-[8.5px] font-mono text-cyanx hover:underline">{showHazards ? 'HIDE MARKERS' : 'SHOW ON GLOBE'}</button>}
          </div>
          {analysis ? (
            analysis.hazards.length ? (
              <ul className="space-y-1 max-h-[150px] lg:max-h-[180px] overflow-y-auto slim-scroll pe-1">
                {criticalHazards.slice(0, 6).map((h, i) => (
                  <li key={'c' + i} className="flex items-start gap-1.5 text-[9.5px] leading-snug rounded-md border border-blood/30 bg-blood/8 px-2 py-1.5">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-sm bg-blood shrink-0" />
                    <span><b className="text-blood/90 font-mono">KM {h.fromKm.toFixed(0)}</b> <span className="text-ink/90">{h.detail}</span></span>
                  </li>
                ))}
                {warningHazards.slice(0, 6).map((h, i) => (
                  <li key={'w' + i} className="flex items-start gap-1.5 text-[9.5px] leading-snug rounded-md border border-amberx/25 bg-amberx/5 px-2 py-1.5">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-sm bg-amberx shrink-0" />
                    <span><b className="text-amberx/90 font-mono">KM {h.fromKm.toFixed(0)}</b> <span className="text-ink/85">{h.detail}</span></span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[9.5px] text-jade/90 font-mono border border-jade/25 bg-jade/5 rounded-md px-2.5 py-2 flex items-center gap-2"><ShieldCheck size={13} /> No hazard windows in this corridor. Clean traverse.</div>
            )
          ) : (
            <div className="text-[9.5px] text-mute/80">Awaiting route data…</div>
          )}
        </div>

        {/* suggestions */}
        {analysis && analysis.suggestions.length > 0 && (
          <div className="px-3 py-2 border-b border-edge">
            <div className="text-[9px] font-mono tracking-[0.2em] text-mute mb-1 flex items-center gap-1"><Info size={9} /> FLIGHT-DIRECTOR NOTES</div>
            <ul className="space-y-1">
              {analysis.suggestions.slice(0, 3).map((s, i) => (
                <li key={i} className="text-[9px] leading-snug text-ink/80 flex gap-1.5"><span className="text-ember">›</span>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* action buttons */}
        <div className="p-3 grid grid-cols-4 gap-1.5">
          <button onClick={undoLast} disabled={!waypoints.length} className="h-11 rounded-lg border border-edge2 bg-panel2 flex flex-col items-center justify-center gap-0.5 text-mute hover:text-ink hover:border-edge2/80 disabled:opacity-35 disabled:cursor-not-allowed transition-colors" title="Undo last waypoint">
            <RotateCcw size={15} /><span className="text-[7.5px] font-mono tracking-widest">UNDO</span>
          </button>
          <button onClick={clearAll} disabled={!waypoints.length} className="h-11 rounded-lg border border-edge2 bg-panel2 flex flex-col items-center justify-center gap-0.5 text-mute hover:text-blood hover:border-blood/50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors" title="Clear route">
            <Trash2 size={15} /><span className="text-[7.5px] font-mono tracking-widest">CLEAR</span>
          </button>
          <button onClick={() => analysis && runAnalysis(waypoints.map(w => ({ lat: w.lat, lon: w.lon })), vehicle)} disabled={waypoints.length < 2} className="h-11 rounded-lg border border-sand/40 bg-sand/10 flex flex-col items-center justify-center gap-0.5 text-sand hover:bg-sand/20 disabled:opacity-35 disabled:cursor-not-allowed transition-colors" title="Recompute analysis">
            <Gauge size={15} /><span className="text-[7.5px] font-mono tracking-widest">COMPUTE</span>
          </button>
          <button onClick={exportReport} disabled={!analysis} className={`h-11 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${exported ? 'border-jade/60 bg-jade/15 text-jade' : 'border-ember/50 bg-ember/15 text-ember hover:bg-ember/25'}`} title="Export safety report">
            {exported ? <ShieldCheck size={15} /> : <Download size={15} />}
            <span className="text-[7.5px] font-mono tracking-widest">{exported ? 'SAVED' : 'EXPORT'}</span>
          </button>
        </div>

        {/* landmark quick-jump */}
        <div className="px-3 pb-3">
          <div className="text-[8.5px] font-mono tracking-[0.22em] text-mute mb-1.5 flex items-center gap-1.5"><MapPin size={9} /> QUICK JUMP — MISSION SITES</div>
          <div className="flex gap-1 overflow-x-auto slim-scroll pb-1">
            {LANDMARKS.filter(l => l.kind === 'rover' || l.kind === 'lander').slice(0, 7).map(l => (
              <button key={l.id} onClick={() => flyToLandmark(l.lat, l.lon)} className="shrink-0 h-6 px-2 rounded-full border border-edge2 bg-panel2 text-[8.5px] font-mono text-cyanx/90 hover:border-cyanx/50 hover:text-cyanx transition-colors">
                {l.name.split(' ')[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function fmtIntShort(n: number) { return Math.round(n).toLocaleString('en-US'); }
function fmtElevShort(n: number) { return (n >= 0 ? '+' : '') + (Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n))); }
