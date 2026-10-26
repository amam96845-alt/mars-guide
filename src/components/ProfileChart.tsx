import { useMemo } from 'react';
import type { ProfileSample, Hazard } from '../lib/analysis';

export default function ProfileChart({ samples, hazards, vehicleMaxSlope }: { samples: ProfileSample[]; hazards: Hazard[]; vehicleMaxSlope: number }) {
  const W = 320, H = 132, padL = 34, padR = 6, padT = 8, padB = 18;
  const iw = W - padL - padR, ih = H - padT - padB;

  const { path, area, yMin, yMax, ticks, hazardPts } = useMemo(() => {
    if (samples.length < 2) return { path: '', area: '', yMin: 0, yMax: 1, ticks: [] as number[], hazardPts: [] as { x: number; y: number; sev: string }[] };
    const elevs = samples.map(s => s.elev);
    let yMin = Math.min(...elevs), yMax = Math.max(...elevs);
    const pad = Math.max(150, (yMax - yMin) * 0.12);
    yMin -= pad; yMax += pad;
    const xMax = samples[samples.length - 1].distKm;
    const X = (d: number) => padL + (d / xMax) * iw;
    const Y = (e: number) => padT + (1 - (e - yMin) / (yMax - yMin)) * ih;
    let path = '';
    samples.forEach((s, i) => { path += (i === 0 ? 'M' : 'L') + X(s.distKm).toFixed(1) + ',' + Y(s.elev).toFixed(1); });
    const area = `${path} L${X(xMax).toFixed(1)},${(padT + ih).toFixed(1)} L${X(0).toFixed(1)},${(padT + ih).toFixed(1)} Z`;
    const ticks = [yMin + pad, (yMin + yMax) / 2, yMax - pad].map(v => Math.round(v));
    // hazard markers: nearest sample to each hazard
    const hazardPts = hazards.slice(0, 18).map(h => {
      let best = samples[0], bd = Infinity;
      for (const s of samples) { const d = Math.abs(s.distKm - h.fromKm); if (d < bd) { bd = d; best = s; } }
      return { x: X(best.distKm), y: Y(best.elev), sev: h.severity as string };
    });
    return { path, area, yMin: Math.round(yMin), yMax: Math.round(yMax), ticks, hazardPts };
  }, [samples, hazards]);

  if (samples.length < 2) {
    return <div className="h-[132px] grid place-items-center text-[11px] font-mono text-mute">NO PROFILE — PLOT A ROUTE</div>;
  }

  const yLabel = (v: number) => (v >= 0 ? `+${(v / 1000).toFixed(1)}` : `${(v / 1000).toFixed(1)}`) + 'k';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[132px] select-none" role="img" aria-label="Elevation profile">
      <defs>
        <linearGradient id="profFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8762d" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#e8762d" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="profStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#e8762d" />
          <stop offset="100%" stopColor="#fb4b4b" />
        </linearGradient>
      </defs>

      {/* gridlines + y labels */}
      {ticks.map((t, i) => {
        const y = padT + (1 - (t - yMin) / (yMax - yMin)) * ih;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#232741" strokeDasharray="3 4" strokeWidth="1" />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="8.5" fill="#8b90a5" fontFamily="IBM Plex Mono, monospace">{yLabel(t)}</text>
          </g>
        );
      })}
      {/* zero datum line if in range */}
      {yMin < 0 && yMax > 0 && (() => {
        const y = padT + (1 - (0 - yMin) / (yMax - yMin)) * ih;
        return <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#3d4266" strokeWidth="1.2" />;
      })()}

      <path d={area} fill="url(#profFill)" />
      <path d={path} fill="none" stroke="url(#profStroke)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />

      {/* hazard dots */}
      {hazardPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.sev === 'critical' ? 3.4 : 2.4}
          fill={p.sev === 'critical' ? '#fb4b4b' : '#fbbf24'} fillOpacity="0.9" stroke="#0c0e18" strokeWidth="1" />
      ))}

      {/* x labels */}
      <text x={padL} y={H - 5} fontSize="8.5" fill="#8b90a5" fontFamily="IBM Plex Mono, monospace">0 km</text>
      <text x={W - padR} y={H - 5} textAnchor="end" fontSize="8.5" fill="#8b90a5" fontFamily="IBM Plex Mono, monospace">{samples[samples.length - 1].distKm.toFixed(0)} km</text>
      <text x={padL + 4} y={padT + 8} fontSize="8" fill="#b0623a" fontFamily="IBM Plex Mono, monospace" opacity="0.9">AREOID DATUM 0 m</text>
    </svg>
  );
}
