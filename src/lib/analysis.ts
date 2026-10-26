/* ------------------------------------------------------------------
   Route analysis engine — turns a polyline of waypoints into a
   safety report grounded in the real MOLA elevation field.
   Bilingual output (EN + AR labels).
------------------------------------------------------------------- */

import {
  elevationAt, slopeAt, haversineKm, interpolatePoints, vehicleById,
  type VehicleProfileId,
} from './marsData';

export interface ProfileSample {
  distKm: number;
  lat: number;
  lon: number;
  elev: number;
  slope: number;
}

export type HazardKind =
  | 'steep' | 'very-steep' | 'giant' | 'rough' | 'deep' | 'high' | 'crater-band';

export interface Hazard {
  kind: HazardKind;
  label: string;
  severity: 'warning' | 'critical';
  fromKm: number;
  toKm: number;
  lat: number;
  lon: number;
  detail: string;
}

export interface RouteAnalysis {
  distanceKm: number;
  durationMin: number;
  elevGainM: number;
  elevLossM: number;
  minElevM: number;
  maxElevM: number;
  maxSlopeDeg: number;
  avgSlopeDeg: number;
  safetyScore: number;            // 0..100
  safetyLabel: string;
  safetyLabelAr: string;
  verdict: 'safe' | 'caution' | 'dangerous';
  samples: ProfileSample[];
  hazards: Hazard[];
  suggestions: string[];
  waypointCount: number;
}

/** Regional roughness proxy from elevation-gradient variance along a short window. */
function localRoughness(lat: number, lon: number): number {
  // elevation std-dev in a ~0.6° window — proxy for rock abundance / relief
  const d = 0.3;
  const vals: number[] = [];
  for (const dy of [-d, 0, d]) for (const dx of [-d, 0, d]) {
    vals.push(elevationAt(lat + dy, lon + dx));
  }
  const m = vals.reduce((s, v) => s + v, 0) / vals.length;
  const varc = vals.reduce((s, v) => s + (v - m) * (v - m), 0) / vals.length;
  return Math.sqrt(varc); // meters
}

export function analyzeRoute(
  points: { lat: number; lon: number }[],
  vehicleId: VehicleProfileId
): RouteAnalysis | null {
  if (points.length < 2) return null;
  const vehicle = vehicleById(vehicleId);

  // sample the whole polyline at fine resolution
  const densePts: { lat: number; lon: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const seg = interpolatePoints(points[i], points[i + 1], 18);
    if (i > 0) seg.shift();
    densePts.push(...seg);
  }

  const samples: ProfileSample[] = [];
  let dist = 0;
  for (let i = 0; i < densePts.length; i++) {
    const p = densePts[i];
    if (i > 0) dist += haversineKm(densePts[i - 1].lat, densePts[i - 1].lon, p.lat, p.lon);
    samples.push({ distKm: dist, lat: p.lat, lon: p.lon, elev: elevationAt(p.lat, p.lon), slope: 0 });
  }
  // slope per sample
  for (const s of samples) s.slope = slopeAt(s.lat, s.lon);

  let gain = 0, loss = 0, maxSlope = 0, slopeSum = 0;
  let minElev = Infinity, maxElev = -Infinity;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    maxSlope = Math.max(maxSlope, s.slope);
    slopeSum += s.slope;
    minElev = Math.min(minElev, s.elev);
    maxElev = Math.max(maxElev, s.elev);
    if (i > 0) {
      const dE = s.elev - samples[i - 1].elev;
      if (dE > 0) gain += dE; else loss -= dE;
    }
  }

  // duration: cruise speed, derated on slope and roughness
  let durationH = 0;
  for (let i = 1; i < samples.length; i++) {
    const segKm = samples[i].distKm - samples[i - 1].distKm;
    if (segKm <= 0) continue;
    const sSlope = (samples[i].slope + samples[i - 1].slope) / 2;
    let factor = 1;
    if (sSlope > vehicle.softSlopeDeg) factor *= Math.max(0.25, 1 - (sSlope - vehicle.softSlopeDeg) * 0.055);
    if (sSlope > vehicle.maxSlopeDeg) factor = 0.08; // crawl / effectively blocked
    const rough = localRoughness(samples[i].lat, samples[i].lon);
    if (rough > 120) factor *= 0.55; else if (rough > 70) factor *= 0.8;
    durationH += segKm / (vehicle.cruiseKmh * factor);
  }

  /* ----------------------------- hazards ------------------------------ */
  const hazards: Hazard[] = [];
  const pushHazard = (h: Hazard) => {
    const last = hazards[hazards.length - 1];
    if (last && last.kind === h.kind && Math.abs(last.toKm - h.fromKm) < 60) {
      last.toKm = h.toKm; last.detail = h.detail;
    } else hazards.push(h);
  };

  for (const s of samples) {
    if (s.slope > vehicle.maxSlopeDeg) {
      pushHazard({ kind: 'very-steep', label: 'Slope exceeds vehicle limit', severity: 'critical', fromKm: s.distKm, toKm: s.distKm, lat: s.lat, lon: s.lon, detail: `${s.slope.toFixed(1)}° — beyond ${vehicle.label} max ${vehicle.maxSlopeDeg}°` });
    } else if (s.slope > vehicle.softSlopeDeg) {
      pushHazard({ kind: 'steep', label: 'Steep slope', severity: s.slope > vehicle.softSlopeDeg + 6 ? 'critical' : 'warning', fromKm: s.distKm, toKm: s.distKm, lat: s.lat, lon: s.lon, detail: `${s.slope.toFixed(1)}° grade — traction & rollover risk` });
    }
    if (s.elev > 8000) {
      pushHazard({ kind: 'high', label: 'Extreme altitude', severity: 'critical', fromKm: s.distKm, toKm: s.distKm, lat: s.lat, lon: s.lon, detail: `${Math.round(s.elev).toLocaleString()} m — near-zero air density for copters` });
    } else if (s.elev > 4000) {
      pushHazard({ kind: 'high', label: 'High altitude', severity: 'warning', fromKm: s.distKm, toKm: s.distKm, lat: s.lat, lon: s.lon, detail: `${Math.round(s.elev).toLocaleString()} m elevation — thin air, low pressure` });
    }
    if (s.elev < -6000) {
      pushHazard({ kind: 'deep', label: 'Deep basin floor', severity: 'warning', fromKm: s.distKm, toKm: s.distKm, lat: s.lat, lon: s.lon, detail: `${Math.round(s.elev).toLocaleString()} m — excellent pressure, dust ponding risk` });
    }
    const rough = localRoughness(s.lat, s.lon);
    if (rough > 150) {
      pushHazard({ kind: 'rough', label: 'Very rough terrain', severity: 'critical', fromKm: s.distKm, toKm: s.distKm, lat: s.lat, lon: s.lon, detail: `±${Math.round(rough)} m relief — blocky, cratered highlands` });
    } else if (rough > 90) {
      pushHazard({ kind: 'rough', label: 'Rough terrain', severity: 'warning', fromKm: s.distKm, toKm: s.distKm, lat: s.lat, lon: s.lon, detail: `±${Math.round(rough)} m relief — slow, hazardous driving` });
    }
  }

  /* --------------------------- safety score ---------------------------- */
  let score = 100;
  for (const s of samples) {
    if (s.slope > vehicle.softSlopeDeg) score -= (s.slope - vehicle.softSlopeDeg) * 3.2;
    if (s.slope > vehicle.maxSlopeDeg) score -= 14;
    if (s.elev > 4000) score -= (s.elev - 4000) / 650;
    const rough = localRoughness(s.lat, s.lon);
    if (rough > 70) score -= (rough - 70) * 0.09;
  }
  // normalize by route length (longer routes accumulate more risk naturally)
  score = score / Math.sqrt(Math.max(1, samples.length / 12));
  // long mission time adds risk
  const days = durationH / 24;
  if (days > 1) score -= Math.min(18, (days - 1) * 1.6);
  score = Math.max(2, Math.min(98, Math.round(score)));

  const verdict: RouteAnalysis['verdict'] = score >= 72 ? 'safe' : score >= 45 ? 'caution' : 'dangerous';
  const safetyLabel = verdict === 'safe' ? 'Route is viable' : verdict === 'caution' ? 'Proceed with caution' : 'Not recommended';
  const safetyLabelAr = verdict === 'safe' ? 'المسار صالح للعبور' : verdict === 'caution' ? 'يتطلب حذرًا شديدًا' : 'غير موصى به';

  const suggestions: string[] = [];
  const crit = hazards.filter(h => h.severity === 'critical');
  const warn = hazards.filter(h => h.severity === 'warning');
  if (maxSlope > vehicle.maxSlopeDeg) suggestions.push('Reroute to avoid slopes exceeding vehicle limit — pick a gentler corridor (±5° or less).');
  if (crit.some(h => h.kind === 'rough')) suggestions.push('Divert around the cratered highlands; lowland dust plains offer ±20 m relief driving.');
  if (crit.some(h => h.kind === 'high')) suggestions.push('Altitude above 8 km starves copters and crew of air density — descend below the Tharsis plateau.');
  if (durationH > 72) suggestions.push(`Multi-day sortie (${(durationH / 24).toFixed(1)} sols): stage cache depots every 120–150 km along the corridor.`);
  if (warn.length > crit.length && warn.length > 0) suggestions.push('Moderate hazard windows detected — travel in local morning when dust opacity (τ) is lowest.');
  if (score >= 72) suggestions.push('Green-light: pre-position ISRU water cache and verify comm relay line-of-sight before departure.');
  if (suggestions.length === 0) suggestions.push('No blocking hazards in this window. Keep standard EVA intervals and monitor dust tau daily.');

  return {
    distanceKm: dist,
    durationMin: durationH * 60,
    elevGainM: gain,
    elevLossM: loss,
    minElevM: minElev,
    maxElevM: maxElev,
    maxSlopeDeg: maxSlope,
    avgSlopeDeg: slopeSum / samples.length,
    safetyScore: score,
    safetyLabel,
    safetyLabelAr,
    verdict,
    samples,
    hazards: hazards.slice(0, 60),
    suggestions,
    waypointCount: points.length,
  };
}

/* ------------------------- Sun position (compact NOAA-style) --------------- */

export function sunPosition(date: Date, latDeg: number, lonDegEast: number) {
  const rad = Math.PI / 180;
  // Julian
  const JD = date.getTime() / 86400000 + 2440587.5;
  const n = JD - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const epsilon = 23.439 * rad;
  const decl = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  // equation of time (minutes)
  const eot = 4 * (L - Math.atan2(Math.cos(epsilon) * Math.tan(lambda), 1) / rad);
  // time in minutes from UTC midnight + longitude offset
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  // local apparent solar time: lon in degrees east
  let lst = utcMin + 4 * lonDegEast + eot;
  const hourAngle = ((lst % 1440) - 720) * 0.25 * rad; // 15°/hr
  const lat = latDeg * rad;
  const cosZenith = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith))) / rad;
  const elevation = 90 - zenith;
  // azimuth
  const az = Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat));
  let azimuthDeg = (az / rad + 180) % 360;
  return { elevationDeg: elevation, azimuthDeg: (azimuthDeg + 360) % 360, declDeg: decl / rad };
}

/** Simple insolation estimate (W/m²) for Mars: solar constant 589 W/m² */
export function marsSolarFlux(date: Date, latDeg: number, lonDegEast: number): number {
  const s = sunPosition(date, latDeg, lonDegEast);
  if (s.elevationDeg <= 0) return 0;
  const SOLAR_CONSTANT = 589;
  return Math.round(SOLAR_CONSTANT * Math.sin(s.elevationDeg * Math.PI / 180));
}
