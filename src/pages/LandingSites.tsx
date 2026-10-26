import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mountain, Wind, Ruler, Thermometer, ShieldCheck, ChevronRight, Search,
  ArrowUpDown, Crosshair, Snowflake, Flame, CircleDot, MapPin
} from 'lucide-react';
import { loadDem, elevationAt, slopeAt } from '../lib/marsData';
import { useLang } from '../lib/i18n';
import { fmtElev } from '../lib/format';

interface Site {
  id: string;
  name: string;
  nameAr: string;
  lat: number;
  lon: number;
  mission: string;
  year: number | string;
  status: 'active' | 'complete' | 'future' | 'failed';
  type: 'rover' | 'lander' | 'future';
  blurb: string;
}

const SITES: Site[] = [
  { id: 'jezero', name: 'Jezero Crater', nameAr: 'فوهة جيزيرو', lat: 18.44, lon: 77.45, mission: 'Perseverance', year: 2021, status: 'active', type: 'rover', blurb: 'Ancient river delta — primary astrobiology target; cached samples awaiting MSR.' },
  { id: 'gale', name: 'Gale Crater · Aeolis Mons', nameAr: 'فوهة غيل', lat: -5.37, lon: 137.81, mission: 'Curiosity', year: 2012, status: 'active', type: 'rover', blurb: 'Equatorial lakebed. Aeolis Mons rises 5.5 km above the ellipse floor.' },
  { id: 'meridiani', name: 'Meridiani Planum', nameAr: 'ميريدياني بلانوم', lat: -1.95, lon: 354.47, mission: 'Opportunity', year: 2004, status: 'complete', type: 'rover', blurb: 'Hematite concretions, Burns Cliff. Final odometer 45.16 km — record until 2026.' },
  { id: 'gusev', name: 'Gusev Crater', nameAr: 'فوهة غوسيف', lat: -14.57, lon: 175.47, mission: 'Spirit', year: 2004, status: 'complete', type: 'rover', blurb: 'Columbia Hills + Home Plate silica outcrops. Bogged down in Troy, 2010.' },
  { id: 'chryse', name: 'Chryse Planitia', nameAr: 'كريسي بلانيتيا', lat: 22.27, lon: 312.05, mission: 'Viking 1', year: 1976, status: 'complete', type: 'lander', blurb: 'First successful Mars landing. Outflow-channel sediments, −3.5 km elevation.' },
  { id: 'utopia', name: 'Utopia Planitia', nameAr: 'يوتوبيا بلانيتيا', lat: 45.24, lon: 91.03, mission: 'Zhurong', year: 2021, status: 'complete', type: 'lander', blurb: 'Northern lowland dust sea; 25°N highway for future egress from the dichotomy.' },
  { id: 'elysium', name: 'Elysium Planitia', nameAr: 'إليسيوم بلانيتيا', lat: 4.5, lon: 135.9, mission: 'InSight', year: 2018, status: 'complete', type: 'lander', blurb: 'Volcanic plain, seismometer station. The tectonically quietest ground on Mars.' },
  { id: 'phoenix', name: 'Vastitas Borealis', nameAr: 'فاستيتاس بورياليس', lat: 68.22, lon: 234.25, mission: 'Phoenix', year: 2008, status: 'complete', type: 'lander', blurb: 'Arctic plain at 68°N — confirmed near-surface water ice. Died in polar winter.' },
  { id: 'arcadia', name: 'Arcadia Planitia', nameAr: 'أركاديا بلانيتيا', lat: 46.0, lon: 184.0, mission: 'Human candidate', year: 'Future', status: 'future', type: 'future', blurb: 'Shallow buried ice (<1 m) at mid-latitudes. Leading ISRU water-extraction site.' },
  { id: 'hellas', name: 'Hellas Planitia', nameAr: 'هيلاس بلانيتيا', lat: -42.4, lon: 70.5, mission: 'Human candidate', year: 'Future', status: 'future', type: 'future', blurb: '−8.2 km basin: air pressure ~1.2 kPa — the closest Mars analog to high altitude on Earth.' },
  { id: 'isidis', name: 'Isidis Planitia', nameAr: 'إيزيدي بلانيتيا', lat: 12.9, lon: 87.0, mission: 'Human candidate', year: 'Future', status: 'future', type: 'future', blurb: 'Smooth basin margin between Jezero and Utopia — natural port between landing and ice.' },
  { id: 'schiaparelli', name: 'Meridiani Planum (Schiaparelli)', nameAr: 'ميريدياني — شياباريلي', lat: -1.94, lon: 354.96, mission: 'ExoMars EDM', year: 2016, status: 'failed', type: 'lander', blurb: 'Impact at 540 km/h — premature backshell release. A cautionary tale in IMU logic.' },
];

export default function LandingSites() {
  const { pick } = useLang();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'rover' | 'lander' | 'future'>('all');
  const [sort, setSort] = useState<'score' | 'eleva' | 'elevb' | 'slope' | 'name'>('score');
  const [res, setRes] = useState<Map<string, { elev: number; slope: number }>>(new Map());
  const [selected, setSelected] = useState<Site>(SITES[0]);

  useEffect(() => {
    loadDem().then(() => {
      const m = new Map<string, { elev: number; slope: number }>();
      for (const s of SITES) m.set(s.id, { elev: elevationAt(s.lat, s.lon), slope: slopeAt(s.lat, s.lon) });
      setRes(m);
    });
  }, []);

  const scored = useMemo(() => {
    const enriched = SITES.map(s => {
      const r = res.get(s.id);
      const elev = r?.elev ?? 0;
      const slope = r?.slope ?? 0;
      // safety score for a crewed lander: low slope, moderate elevation, low latitude
      let score = 100;
      score -= Math.min(38, Math.max(0, (slope - 1.5)) * 4.2);
      score -= Math.abs(s.lat) > 30 ? (Math.abs(s.lat) - 30) * 0.55 : 0;
      score -= elev > 2000 ? (elev - 2000) / 260 : elev < -6000 ? 8 : 0;
      if (s.status === 'failed') score -= 6;
      return { ...s, elev, slope, score: Math.max(5, Math.min(99, Math.round(score))) };
    });
    let out = enriched.filter(s =>
      (typeFilter === 'all' || s.type === typeFilter) &&
      (query === '' || s.name.toLowerCase().includes(query.toLowerCase()) || s.mission.toLowerCase().includes(query.toLowerCase()))
    );
    switch (sort) {
      case 'eleva': out = [...out].sort((a, b) => a.elev - b.elev); break;
      case 'elevb': out = [...out].sort((a, b) => b.elev - a.elev); break;
      case 'slope': out = [...out].sort((a, b) => a.slope - b.slope); break;
      case 'name': out = [...out].sort((a, b) => a.name.localeCompare(b.name)); break;
      default: out = [...out].sort((a, b) => b.score - a.score);
    }
    return out;
  }, [res, query, typeFilter, sort]);

  const sel = useMemo(() => scored.find(s => s.id === selected.id) ?? scored[0] ?? SITES[0], [scored, selected]);
  const selR = res.get(sel.id);

  return (
    <div className="bg-abyss min-h-full">
      {/* page hero band */}
      <div className="border-b border-edge bg-[#0a0b14] blueprint-grid">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] text-ember">LANDING SITE LEAGUE TABLE</div>
            <h1 className="font-display font-bold text-3xl sm:text-5xl tracking-tight mt-2">Where do we <span className="text-ember">set her down?</span></h1>
            <p className="mt-2 text-[13px] text-mute max-w-md">{pick('Every operational landing ellipse ever flown on Mars — scored live against the MOLA elevation field, plus the frontrunners for the first human boots.', 'كل قطع ناقص للهبوط تم الطيران بها على المريخ — مقيّمة حيًا مقابل حقل MOLA الارتفاعي، بالإضافة إلى المرشحين لتطأ أوّل قدم بشرية أرضه.')}</p>
          </div>
          <Link to="/planner" className="h-11 ps-5 pe-4 rounded-lg bg-gradient-to-b from-ember to-mars text-[#fff3e8] font-bold text-[12px] flex items-center gap-2 hover:brightness-110 transition">
            PLOT A ROUTE FROM ANY SITE <ChevronRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-8 grid lg:grid-cols-12 gap-6">
        {/* ================= table ================= */}
        <div className="lg:col-span-8">
          {/* controls */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search site or mission…" className="w-full h-10 ps-9 pe-3 rounded-lg bg-panel2 border border-edge text-[12px] placeholder:text-mute focus:border-ember/60 focus:outline-none" />
            </div>
            <div className="flex rounded-lg overflow-hidden border border-edge">
              {(['all', 'rover', 'lander', 'future'] as const).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} className={`h-10 px-3 text-[10px] font-mono tracking-widest transition-colors ${typeFilter === t ? 'bg-ember/20 text-[#ffd9c2]' : 'bg-panel2 text-mute hover:text-ink'}`}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={() => setSort(s => (s === 'score' ? 'slope' : s === 'slope' ? 'elevb' : 'score'))} className="h-10 px-3 rounded-lg border border-edge bg-panel2 text-[10px] font-mono text-mute hover:text-ink flex items-center gap-1.5">
              <ArrowUpDown size={12} /> SORT: {sort === 'score' ? 'SAFETY' : sort === 'slope' ? 'SLOPE' : sort === 'elevb' ? 'ELEV ↓' : 'ELEV ↑'}
            </button>
          </div>

          {/* table header */}
          <div className="grid grid-cols-12 px-3 pb-1.5 text-[8px] font-mono tracking-[0.2em] text-mute">
            <div className="col-span-4">SITE / MISSION</div>
            <div className="col-span-2 text-end">ELEV</div>
            <div className="col-span-2 text-end">SLOPE</div>
            <div className="col-span-2 text-end">LAT</div>
            <div className="col-span-2 text-end">SAFETY</div>
          </div>
          <div className="space-y-1.5">
            {scored.map(s => {
              const active = sel.id === s.id;
              const scoreColor = s.score >= 72 ? 'text-jade' : s.score >= 45 ? 'text-amberx' : 'text-blood';
              const statusDot = s.status === 'active' ? 'bg-jade' : s.status === 'future' ? 'bg-cyanx' : s.status === 'failed' ? 'bg-blood' : 'bg-mute';
              return (
                <button key={s.id} onClick={() => setSelected(s)}
                  className={`w-full grid grid-cols-12 items-center px-3 py-2.5 rounded-xl border text-start transition-all ${active ? 'border-ember/60 bg-ember/8 shadow-[0_0_20px_rgba(232,118,45,0.12)]' : 'border-edge bg-panel hover:border-edge2'}`}>
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot} ${s.status === 'active' ? 'pulse-dot' : ''}`} />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold text-ink leading-tight truncate">{s.name}</span>
                      <span className="block text-[8px] font-mono text-mute">{s.mission} · {s.year}</span>
                    </span>
                  </div>
                  <div className="col-span-2 text-end font-mono text-[10px] text-sand tabular-nums">{s.elev >= 0 ? '+' : ''}{Math.round(s.elev).toLocaleString()}<span className="text-[8px] text-mute"> m</span></div>
                  <div className="col-span-2 text-end font-mono text-[10px] tabular-nums text-ink">{s.slope.toFixed(1)}°</div>
                  <div className="col-span-2 text-end font-mono text-[10px] tabular-nums text-mute">{Math.abs(s.lat).toFixed(1)}°{s.lat >= 0 ? 'N' : 'S'}</div>
                  <div className={`col-span-2 text-end font-mono font-bold text-[12px] tabular-nums ${scoreColor}`}>{s.score}<span className="text-[8px] text-mute font-normal">/100</span></div>
                </button>
              );
            })}
            {scored.length === 0 && <div className="text-center text-mute text-[12px] py-10">No sites match “{query}”.</div>}
          </div>
        </div>

        {/* ================= detail column ================= */}
        <div className="lg:col-span-4">
          <div className="panel rounded-2xl p-5 sticky top-24">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono tracking-[0.25em] text-sand">SITE DOSSIER</span>
              <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${sel.status === 'active' ? 'border-jade/50 text-jade' : sel.status === 'future' ? 'border-cyanx/50 text-cyanx' : sel.status === 'failed' ? 'border-blood/50 text-blood' : 'border-mute/40 text-mute'}`}>
                {sel.status.toUpperCase()}
              </span>
            </div>
            <h2 className="font-display font-bold text-2xl mt-2 leading-tight">{sel.name}</h2>
            <div className="font-arabic text-[12px] text-mute">{sel.nameAr} · {sel.mission} ({sel.year})</div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink/85">{sel.blurb}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { icon: Mountain, l: 'ELEVATION', v: selR ? fmtElev(selR.elev) : '…', t: selR && selR.elev < 0 ? 'text-cyanx' : 'text-sand' },
                { icon: Wind, l: 'LOCAL SLOPE', v: selR ? selR.slope.toFixed(2) + '°' : '…', t: selR && selR.slope > 6 ? 'text-amberx' : 'text-jade' },
                { icon: Crosshair, l: 'COORDS', v: `${Math.abs(sel.lat).toFixed(2)}°${sel.lat >= 0 ? 'N' : 'S'} ${Math.abs(sel.lon).toFixed(2)}°E`, t: 'text-ink' },
                { icon: Thermometer, l: 'VS JEBEL OMUK SCALE', v: selR ? (selR.elev < -3000 ? 'High pressure site' : selR.elev > 1000 ? 'Thin-air site' : 'Nominal') : '…', t: 'text-mute' },
              ].map((it, i) => {
                const I = it.icon;
                return (
                  <div key={i} className="panel-inset rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-mute"><I size={11} /><span className="text-[7.5px] font-mono tracking-widest">{it.l}</span></div>
                    <div className={`font-mono font-semibold text-[12px] mt-1 ${it.t}`}>{it.v}</div>
                  </div>
                );
              })}
            </div>

            {/* score bar */}
            <div className="mt-4">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[9px] font-mono tracking-widest text-mute">CREWED-LANDER SAFETY</span>
                <span className="font-mono text-[12px] font-bold text-ink">{scored.find(s => s.id === sel.id)?.score ?? '—'}/100</span>
              </div>
              <div className="h-2.5 rounded-full bg-edge overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blood via-amberx to-jade transition-all duration-700" style={{ width: `${scored.find(s => s.id === sel.id)?.score ?? 0}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[7px] font-mono text-mute"><span>NO-GO</span><span>MARGINAL</span><span>CERTIFIED</span></div>
            </div>

            <Link to="/planner" className="mt-5 h-11 w-full rounded-lg border border-ember/50 bg-ember/15 text-ember font-bold text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-ember/25 transition-colors">
              <MapPin size={14} /> SET AS ROUTE ORIGIN
            </Link>
          </div>
        </div>
      </div>

      {/* ============ future site comparison band ============ */}
      <div className="border-t border-edge bg-[#0a0b14]">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-8">
          <div className="text-[9px] font-mono tracking-[0.3em] text-cyanx mb-3 flex items-center gap-2"><Snowflake size={12} /> FIRST HUMAN LANDING — THE SHORTLIST</div>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { n: 'Arcadia Planitia', s: 'mid-latitude ice at <1 m depth, flat dust — the ISRU workhorse', score: '78', icon: Snowflake, t: 'text-cyanx' },
              { n: 'Isidis Planitia', s: '28°N, gentle basin margin, one corridor to Jezero science', score: '83', icon: ShieldCheck, t: 'text-jade' },
              { n: 'Hellas Planitia', s: '1.2 kPa at floor — suits get easier, dust gets deeper', score: '61', icon: Flame, t: 'text-amberx' },
            ].map((c, i) => {
              const I = c.icon;
              return (
                <div key={i} className="panel-inset rounded-xl p-4 flex items-start gap-3">
                  <I size={20} className={`${c.t} shrink-0 mt-0.5`} strokeWidth={1.7} />
                  <div>
                    <div className="font-display font-semibold text-[13px]">{c.n} <span className="font-mono text-[10px] text-mute ms-1">SAFETY {c.score}/100</span></div>
                    <div className="text-[10px] text-mute leading-snug mt-0.5">{c.s}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
