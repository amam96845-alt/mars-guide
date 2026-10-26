export function fmtInt(n: number) { return Math.round(n).toLocaleString('en-US'); }
export function fmtKm(n: number) { return n >= 100 ? fmtInt(n) : n.toFixed(1); }
export function fmtElev(m: number) { const v = Math.round(m); return (v >= 0 ? '+' : '') + v.toLocaleString('en-US') + ' m'; }
export function fmtDuration(min: number): { h: number; m: number; total: number } {
  const total = Math.round(min);
  return { h: Math.floor(total / 60), m: total % 60, total };
}
export function fmtLat(lat: number) { return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`; }
export function fmtLon(lon: number) { return `${Math.abs(lon).toFixed(2)}° ${lon >= 0 && lon <= 180 ? 'E' : 'W'}`; }
