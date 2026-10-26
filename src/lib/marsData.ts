/* ------------------------------------------------------------------
   Mars Survival Guide — data layer
   Real elevation field: NASA MGS MOLA MEGDR global median topography
   (megt90n000eb.img — Simple Cylindrical, 16 px/deg), downsampled 2×
   to 1440×2880 (0.125°, int16 meters) shipped as /data/mars_dem.bin.
   Grid orientation: row 0 = +90°N (top), col 0 = 0°E, east-positive.
------------------------------------------------------------------- */

export const MARS_RADIUS_KM = 3396.196; // areoid mean radius
export const DEM_ROWS = 1440;
export const DEM_COLS = 2880;
const DEG = Math.PI / 180;

let dem: Int16Array | null = null;
let demPromise: Promise<Int16Array> | null = null;

export function loadDem(): Promise<Int16Array> {
  if (dem) return Promise.resolve(dem);
  if (demPromise) return demPromise;
  demPromise = fetch('/data/mars_dem.bin')
    .then(r => {
      if (!r.ok) throw new Error('Failed to load MOLA elevation field');
      return r.arrayBuffer();
    })
    .then(buf => {
      dem = new Int16Array(buf);
      return dem;
    });
  return demPromise;
}

/** Elevation in meters at (latDeg, lonDeg). Bilinear interpolation of MOLA grid. */
export function elevationAt(latDeg: number, lonDeg: number): number {
  if (!dem) return 0;
  const lat = Math.max(-89.999, Math.min(89.999, latDeg));
  let lon = ((lonDeg % 360) + 360) % 360;
  // grid: row 0 at +90 -> row coordinate
  const fy = ((90 - lat) / 180) * DEM_ROWS - 0.5;
  const fx = (lon / 360) * DEM_COLS - 0.5;
  const y0 = Math.floor(fy), x0 = Math.floor(fx);
  const ty = fy - y0, tx = fx - x0;
  const rows = DEM_ROWS, cols = DEM_COLS;
  const r0 = ((y0 % rows) + rows) % rows;
  const r1 = ((y0 + 1) % rows + rows) % rows;
  const c0 = ((x0 % cols) + cols) % cols;
  const c1 = ((x0 + 1) % cols + cols) % cols;
  const v00 = dem[r0 * cols + c0], v10 = dem[r0 * cols + c1];
  const v01 = dem[r1 * cols + c0], v11 = dem[r1 * cols + c1];
  const top = v00 + (v10 - v00) * tx;
  const bot = v01 + (v11 - v01) * tx;
  return top + (bot - top) * ty;
}

/** Grid-cell slope (degrees) by central differences. */
export function slopeAt(latDeg: number, lonDeg: number): number {
  if (!dem) return 0;
  const d = 0.3; // degrees
  const dy = d * DEG * MARS_RADIUS_KM * 1000; // meters north
  const dx = d * DEG * MARS_RADIUS_KM * 1000 * Math.cos(latDeg * DEG);
  const dzdx = (elevationAt(latDeg, lonDeg + d) - elevationAt(latDeg, lonDeg - d)) / (2 * Math.max(dx, 1));
  const dzdy = (elevationAt(latDeg + d, lonDeg) - elevationAt(latDeg - d, lonDeg)) / (2 * dy);
  return Math.atan(Math.hypot(dzdx, dzdy)) / DEG;
}

/** Great-circle distance in km (haversine). */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p1 = lat1 * DEG, p2 = lat2 * DEG;
  let dLon = lon2 - lon1;
  while (dLon > 180) dLon -= 360;
  while (dLon < -180) dLon += 360;
  const dP = p2 - p1, dL = dLon * DEG;
  const a = Math.sin(dP / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dL / 2) ** 2;
  return 2 * MARS_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/** Intermediate geodesic points between two coords (spherical lerp, slerp). */
export function interpolatePoints(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
  maxSegmentKm = 40
): { lat: number; lon: number }[] {
  const dist = haversineKm(a.lat, a.lon, b.lat, b.lon);
  const n = Math.max(1, Math.ceil(dist / maxSegmentKm));
  const d = { lat: 0, lon: 0 };
  const toRad = (d: { lat: number; lon: number }) => ({ phi: d.lat * DEG, theta: d.lon * DEG });
  const v = ({ phi, theta }: { phi: number; theta: number }) => ({
    x: Math.cos(phi) * Math.cos(theta),
    y: Math.cos(phi) * Math.sin(theta),
    z: Math.sin(phi),
  });
  const A = v(toRad(a)), B = v(toRad(b));
  const dot = A.x * B.x + A.y * B.y + A.z * B.z;
  const omega = Math.acos(Math.max(-1, Math.min(1, dot)));
  const so = Math.sin(omega);
  const pts: { lat: number; lon: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let x: number, y: number, z: number;
    if (so < 1e-6) { x = A.x; y = A.y; z = A.z; }
    else {
      const s0 = Math.sin((1 - t) * omega) / so, s1 = Math.sin(t * omega) / so;
      x = A.x * s0 + B.x * s1; y = A.y * s0 + B.y * s1; z = A.z * s0 + B.z * s1;
    }
    const len = Math.hypot(x, y, z);
    const lat = Math.asin(z / len) / DEG;
    let lon = Math.atan2(y, x) / DEG;
    pts.push({ lat, lon: ((lon % 360) + 360) % 360 === 360 ? 0 : ((lon % 360) + 360) % 360 });
  }
  return pts;
}

/* ---------------- Landmarks / mission sites (real coordinates) -------------- */

export interface Landmark {
  id: string;
  name: string;
  nameAr: string;
  lat: number;
  lon: number;
  kind: 'lander' | 'rover' | 'volcano' | 'canyon' | 'basin' | 'polar' | 'crater' | 'plain';
  desc: string;
}

export const LANDMARKS: Landmark[] = [
  { id: 'jezero', name: 'Jezero Crater', nameAr: 'فوهة جيزيرو', lat: 18.44, lon: 77.45, kind: 'rover', desc: 'Perseverance landing site (2021). Ancient lake delta; cached sample tubes.' },
  { id: 'gale', name: 'Gale Crater (Aeolis Mons)', nameAr: 'فوهة غيل — جبل شارب', lat: -5.37, lon: 137.81, kind: 'rover', desc: 'Curiosity landing site (2012). Driving since sol 0 — 36.9 km traveled.' },
  { id: 'utopia', name: 'Utopia Planitia', nameAr: 'يوتوبيا بلانيتيا', lat: 45.0, lon: 110.0, kind: 'lander', desc: 'Zhurong rover (2021) & Viking 2. Broad, safe northern lowland.' },
  { id: 'meridiani', name: 'Meridiani Planum', nameAr: 'ميريدياني بلانوم', lat: -1.95, lon: 354.47, kind: 'rover', desc: 'Opportunity landing site (2004). Holds the off-world driving record… was 45.16 km.' },
  { id: 'elysium', name: 'Elysium Planitia', nameAr: 'إليسيوم بلانيتيا', lat: 4.5, lon: 135.9, kind: 'lander', desc: 'InSight landing site (2018). Flat volcanic plain — ideal first-base candidate.' },
  { id: 'olympus', name: 'Olympus Mons', nameAr: 'أوليمبوس مونز', lat: 18.65, lon: 226.2, kind: 'volcano', desc: 'Tallest volcano in the Solar System, 21.9 km above datum. Slopes 5–25°.' },
  { id: 'ascraeus', name: 'Ascraeus Mons', nameAr: 'أسكرايوس مونز', lat: 11.4, lon: 255.5, kind: 'volcano', desc: 'Northern Tharsis volcano, 18.2 km high. Heavy slope hazard.' },
  { id: 'pavonis', name: 'Pavonis Mons', nameAr: 'بافونيس مونز', lat: 0.8, lon: 246.6, kind: 'volcano', desc: 'Central Tharsis volcano. Largest known lava-tube skylights on Mars.' },
  { id: 'valles', name: 'Valles Marineris', nameAr: 'فاليز مارينيريس', lat: -13.9, lon: 301.0, kind: 'canyon', desc: '4,000 km canyon system, 7 km deep. Walls exceed 25° — impassable for rovers.' },
  { id: 'hellas', name: 'Hellas Planitia', nameAr: 'هيلاس بلانيتيا', lat: -42.4, lon: 70.5, kind: 'basin', desc: 'Lowest point on Mars, −8.2 km. Deep, stable air pressure — human habitat candidate.' },
  { id: 'argyre', name: 'Argyre Planitia', nameAr: 'أرغير بلانيتيا', lat: -49.7, lon: 316.0, kind: 'basin', desc: 'Ancient impact basin, ~−5 km. Likely ice-rich deposits at mid-latitudes.' },
  { id: 'northpolar', name: 'Planum Boreum', nameAr: 'بلانوم بوريوم', lat: 87.0, lon: 150.0, kind: 'polar', desc: 'Northern polar cap. CO₂ ice seasonal cap; water ice beneath.' },
  { id: 'southpolar', name: 'Planum Australe', nameAr: 'بلانوم أوسترالي', lat: -85.0, lon: 0.0, kind: 'polar', desc: 'Southern polar cap. Permanent CO₂ + H₂O ice deposits.' },
  { id: 'gusev', name: 'Gusev Crater', nameAr: 'فوهة غوسيف', lat: -14.57, lon: 175.47, kind: 'rover', desc: 'Spirit landing site (2004). Ancient lakebed inside an impact crater.' },
  { id: 'chryse', name: 'Chryse Planitia', nameAr: 'كريسي بلانيتيا', lat: 24.0, lon: 317.5, kind: 'lander', desc: 'Viking 1 site (1976). Outflow channel terminus — sedimentary plains.' },
  { id: 'arcadia', name: 'Arcadia Planitia', nameAr: 'أركاديا بلانيتيا', lat: 46.0, lon: 184.0, kind: 'plain', desc: 'Vast smooth plain; shallow buried H₂O ice — prime ISRU resource zone.' },
  { id: 'ishtar', name: 'Ishtar Terra (Ishtarov Chaos)', nameAr: 'إشتار تيرا', lat: 45.0, lon: 320.0, kind: 'crater', desc: 'Densely cratered ancient highlands. Elevated, rocky, rough.' },
  { id: 'noachis', name: 'Noachis Terra', nameAr: 'نواكيس تيرا', lat: -47.0, lon: 355.0, kind: 'crater', desc: 'Among the oldest terrains; saturated crater fields, high rock abundance.' },
];

/* ---------------- Suggested expedition presets (real corridors) ----------- */

export interface RoutePreset {
  id: string;
  title: string;
  titleAr: string;
  note: string;
  points: { lat: number; lon: number }[];
  vehicle: VehicleProfileId;
  difficulty: 'Intermediate' | 'Hard' | 'Extreme';
}

export const ROUTE_PRESETS: RoutePreset[] = [
  {
    id: 'port-of-mars',
    title: 'Port of Mars — Utopia to Isidis Margin',
    titleAr: 'ميناء المريخ: من يوتوبيا إلى حافة إيزيدي',
    note: 'Flagship cargo corridor across the safe northern lowlands. Mostly flat; crosses the ancient dichotomy boundary.',
    points: [
      { lat: 47.5, lon: 116.5 }, { lat: 40.2, lon: 114.8 }, { lat: 33.1, lon: 112.6 }, { lat: 26.3, lon: 109.2 }, { lat: 19.5, lon: 103.5 }, { lat: 14.2, lon: 97.5 }, { lat: 11.5, lon: 89.0 },
    ],
    vehicle: 'rover',
    difficulty: 'Intermediate',
  },
  {
    id: 'jezero-gale',
    title: 'Jezero → Gale Corridor',
    titleAr: 'ممر جيزيرو ← غيل',
    note: 'The great science traverse. Crosses Isidis basin floor and the Syrtis Major rise. Slopes rise approaching Syrtis.',
    points: [
      { lat: 18.44, lon: 77.45 }, { lat: 16.8, lon: 84.0 }, { lat: 14.5, lon: 91.5 }, { lat: 12.0, lon: 99.0 }, { lat: 9.8, lon: 106.5 }, { lat: 6.2, lon: 114.5 }, { lat: 2.4, lon: 123.0 }, { lat: -1.5, lon: 130.0 }, { lat: -5.37, lon: 137.81 },
    ],
    vehicle: 'rover',
    difficulty: 'Hard',
  },
  {
    id: 'hellas-descent',
    title: 'Hellas Approach from Isidis — The Deep Dive',
    titleAr: 'النزول إلى هيلاس',
    note: 'Descends ~7 km from the dichotomy boundary into the deepest basin on Mars. Air pressure doubles at the floor.',
    points: [
      { lat: 2.0, lon: 79.0 }, { lat: -8.0, lon: 74.5 }, { lat: -17.5, lon: 71.5 }, { lat: -27.0, lon: 69.5 }, { lat: -35.0, lon: 69.0 }, { lat: -42.4, lon: 70.5 },
    ],
    vehicle: 'crewed',
    difficulty: 'Hard',
  },
  {
    id: 'tharsis-loop',
    title: 'Tharsis Volcanic Traverse — 3 Sisters',
    titleAr: 'عبور ثارسيس: الأخوات الثلاث',
    note: 'Extreme altitude traverse over Pavonis & Ascraeus Mons. Slopes routinely 15–25°. For experienced crews only.',
    points: [
      { lat: 8.5, lon: 244.0 }, { lat: 4.5, lon: 247.0 }, { lat: 0.8, lon: 246.6 }, { lat: 4.2, lon: 250.5 }, { lat: 8.0, lon: 253.0 }, { lat: 11.4, lon: 255.5 },
    ],
    vehicle: 'rover',
    difficulty: 'Extreme',
  },
  {
    id: 'meridiani-walk',
    title: 'Meridiani Shakedown Drive',
    titleAr: 'رحلة ميريدياني الاختبارية',
    note: 'Flat, ancient lakebed plains. The safest shakedown shakedown drive on the planet — smooth hematite plains.',
    points: [
      { lat: -1.4, lon: 352.0 }, { lat: -2.6, lon: 354.5 }, { lat: -3.4, lon: 357.5 }, { lat: -4.0, lon: 1.5 },
    ],
    vehicle: 'crewed',
    difficulty: 'Intermediate',
  },
];

/* ---------------- Vehicle profiles ---------------- */

export type VehicleProfileId = 'crewed' | 'rover' | 'helicopter' | 'cargo';
export interface VehicleProfile {
  id: VehicleProfileId;
  label: string;
  labelAr: string;
  icon: string; // lucide icon key — resolved in UI
  cruiseKmh: number;
  maxSlopeDeg: number;      // beyond -> not traversable
  softSlopeDeg: number;     // beyond -> penalty
  desc: string;
}

export const VEHICLES: VehicleProfile[] = [
  { id: 'crewed', label: 'Crewed Rover (pressurized)', labelAr: 'عربة مأهولة', icon: 'Car', cruiseKmh: 12, maxSlopeDeg: 18, softSlopeDeg: 8, desc: 'Pressurized two-crew rover. Needs smooth, gentle terrain; life-support limits endurance.' },
  { id: 'rover', label: 'Autonomous Science Rover', labelAr: 'عربة علوم ذاتية', icon: 'Bot', cruiseKmh: 6, maxSlopeDeg: 25, softSlopeDeg: 12, desc: 'Curiosity-class autonomous rover. Better slope tolerance, slower pace, mast-mounted hazard nav.' },
  { id: 'helicopter', label: 'Ingenuity-class Copter', labelAr: 'مروحية إنجينويتي', icon: 'Plane', cruiseKmh: 28, maxSlopeDeg: 45, softSlopeDeg: 20, desc: 'Scout helicopter. Flies over rough ground but limited by altitude density and dust.' },
  { id: 'cargo', label: 'Heavy Cargo Hauler', labelAr: 'شاحنة شحن ثقيلة', icon: 'Truck', cruiseKmh: 9, maxSlopeDeg: 14, softSlopeDeg: 6, desc: 'Unpressurized cargo platform. Very slope-averse; favors flat, hardpan routes.' },
];

export function vehicleById(id: VehicleProfileId): VehicleProfile {
  return VEHICLES.find(v => v.id === id)!;
}
