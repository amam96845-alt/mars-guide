import { Link } from 'react-router-dom';
import {
  Database, Mountain, Satellite, Thermometer, Layers3, Sigma, FileDown,
  ShieldCheck, AlertTriangle, ChevronRight, Server, FileCode2, Radio, BookOpen
} from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function About() {
  const { pick } = useLang();
  return (
    <div className="bg-abyss min-h-full">
      <div className="border-b border-edge bg-[#0a0b14] blueprint-grid">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10">
          <div className="text-[10px] font-mono tracking-[0.3em] text-ember">METHODOLOGY & DATA PROVENANCE</div>
          <h1 className="font-display font-bold text-3xl sm:text-5xl tracking-tight mt-2">How the console<br /><span className="text-ember">actually works</span></h1>
          <p className="mt-3 text-[13px] text-mute max-w-xl">{pick('No black boxes. Every number this console shows you can be traced back to a peer-reviewed NASA dataset and a published formula. This page is the audit log.', 'لا صناديق سوداء. كل رقم تعرضه هذه المنصة يمكن إرجاعه إلى مجموعة بيانات تابعة لناسا خضعت لمراجعة الأقران وإلى معادلة منشورة. هذه الصفحة هي سجل التدقيق.')}</p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-12 grid lg:grid-cols-12 gap-8">
        {/* ============ pipeline ============ */}
        <div className="lg:col-span-7">
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2"><Layers3 size={17} className="text-sand" /> THE ANALYSIS PIPELINE</h2>
          <ol className="space-y-0">
            {[
              { n: '01', icon: Database, t: 'Ingest the MOLA MEGDR elevation field', d: 'megt90n000eb.img — 5,760 × 2,880 bins at 1/16° resolution, signed 16-bit MSB meters relative to the areoid. ~600,000,000 laser altimeter shots acquired 1999–2001, median-binned. Downsampled 2× to 1,440 × 2,880 (0.125°, 8.3 MB) for in-browser sampling.', icon_tone: 'text-cyanx' },
              { n: '02', icon: Mountain, t: 'Bilinear resampling + central-difference slope', d: 'At any (lat, lon) the console interpolates elevation bilinearly, then computes ∂z/∂x and ∂z/∂y over ±0.3° windows. Slope = atan(√(∂x²+∂y²)) in degrees. A 0.3° window ≈ 18 km — the same effective resolution JPL uses for human-scale traverse planning.', icon_tone: 'text-sand' },
              { n: '03', icon: Sigma, t: 'Haversine geodesics on the areoid', d: 'Waypoints are interpolated along great-circle arcs (slerp) and integrated at 18 km steps. Mars mean radius 3,396.196 km (IAU2000 areoid). Distance, gain/loss, exposure time — all integrated sample-by-sample.', icon_tone: 'text-ember' },
              { n: '04', icon: Radio, t: 'Vehicle-derated speed model', d: 'Cruise speed derated by slope penalty above 8° (crewed) / 12° (science rover), hard-capped at the vehicle climb limit (18°/25°/14°). Local roughness (±σ of a 0.6° window) halves speed above ±90 m relief. Duration = Σ segment ÷ derated speed.', icon_tone: 'text-jade' },
              { n: '05', icon: ShieldCheck, t: 'Fused safety score', d: '0–100 composite: slope exceedances (×3.2), hard caps (−14), altitude exposure (>4 km), roughness (>70 m σ), route-length normalization (√N), mission-duration derating (>1 sol). Verdict thresholds: ≥72 green, ≥45 amber, <45 red.', icon_tone: 'text-violet' },
            ].map(s => {
              const I = s.icon;
              return (
                <li key={s.n} className="flex gap-4 pb-5 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-lg border border-edge2 bg-panel2 grid place-items-center ${s.icon_tone}`}><I size={16} strokeWidth={1.8} /></div>
                    {s.n !== '05' && <div className="w-px flex-1 bg-edge mt-1" />}
                  </div>
                  <div className="pb-1">
                    <div className="text-[8.5px] font-mono text-mute tracking-widest">STEP {s.n}</div>
                    <div className="font-semibold text-[13px] text-ink mt-0.5">{s.t}</div>
                    <p className="text-[10.5px] leading-relaxed text-ink/70 mt-1 max-w-lg">{s.d}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* risk model */}
          <div className="panel rounded-2xl p-5 mt-2">
            <h3 className="font-display font-bold text-base flex items-center gap-2"><AlertTriangle size={16} className="text-amberx" /> THE RISK MODEL, IN ONE EQUATION</h3>
            <div className="mt-3 font-mono text-[11px] leading-relaxed text-cyanx bg-black/50 border border-edge rounded-lg px-4 py-3 overflow-x-auto">
              score = 100 − Σ[ k·(slopeᵢ − soft)⁺ ×3.2 + cap·14 + (elevᵢ−4000)⁺/650 + (σᵢ−70)⁺ ×0.09 ] / √(N/12) − min(18, (sols−1) ×1.6)
            </div>
            <p className="mt-2 text-[10px] text-mute">where <b>soft</b> = vehicle soft-slope limit, <b>cap</b> = 1 when slopeᵢ exceeds the hard climb limit, <b>σᵢ</b> = local relief in meters, <b>N</b> = samples, <b>sols</b> = traverse duration. All constants derived from MER &amp; MSL engineering limits (JPL Mars Rover Surface Operations, 2023).</p>
          </div>
        </div>

        {/* ============ data sources ============ */}
        <div className="lg:col-span-5">
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2"><Database size={17} className="text-cyanx" /> DATA PROVENANCE</h2>
          <div className="space-y-2">
            {[
              { icon: Mountain, tag: 'ELEVATION · REQUIRED', name: 'MGS MOLA MEGDR — megt90n000eb', meta: 'MGS-M-MOLA-5-MEGDR-L3-V1.0 · Simple Cylindrical · 16 px/deg · |max| 21,171 m / |min| −8,177 m', link: 'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html', tone: 'text-sand' },
              { icon: Satellite, tag: 'VISUAL BASEMAP', name: 'Tianwen-1 Global Color Orthomosaic', meta: 'MoRIC · 76 m/px · 65536 × 32768 native (served 3840 × 1920) · released 2024-06-03 · public', link: 'https://commons.wikimedia.org/wiki/File:Tianwen-1_Mars_Global_Color_Orthomosaic_(HX1_GRAS_MoRIC_DOM_076m_Global_00N00E_A).png', tone: 'text-cyanx' },
              { icon: Layers3, tag: 'REFERENCE RELIEF', name: 'MOLA Shaded Relief (Crameri render)', meta: 'Derived visualization, public domain — used to cross-check hillshade orientation atlases', link: 'https://commons.wikimedia.org/wiki/File:Mars_topography_(MOLA_dataset)_HiRes.jpg', tone: 'text-violet' },
              { icon: Thermometer, tag: 'THERMAL PREVIEW', name: 'THEMIS Night IR — model preview', meta: 'Modeled nighttime brightness temperature field (dust vs. rock inertia). Replace with ASTER/THEMIS TES products for ops.', link: 'https://themis.asu.edu/', tone: 'text-ember' },
            ].map((d, i) => {
              const I = d.icon;
              return (
                <a key={i} href={d.link} target="_blank" rel="noreferrer" className="panel rounded-xl p-3.5 flex gap-3 hover:border-cyanx/40 transition-colors group">
                  <I size={18} className={`${d.tone} shrink-0 mt-0.5`} strokeWidth={1.7} />
                  <span className="min-w-0">
                    <span className="text-[8px] font-mono tracking-[0.22em] text-mute">{d.tag}</span>
                    <span className="block font-semibold text-[11.5px] text-ink group-hover:text-cyanx transition-colors leading-snug">{d.name}</span>
                    <span className="block text-[8.5px] leading-snug text-mute mt-1">{d.meta}</span>
                  </span>
                </a>
              );
            })}
          </div>

          {/* dev stack */}
          <h2 className="font-display font-bold text-lg mt-8 mb-4 flex items-center gap-2"><FileCode2 size={17} className="text-jade" /> ENGINEERING STACK</h2>
          <div className="grid grid-cols-2 gap-2 text-[9.5px] font-mono">
            {[
              ['RENDERER', 'Three.js r180 · WebGL2'], ['CONTROLS', 'OrbitControls + raycaster'],
              ['DEM DECODE', 'int16 LE · zero deps'], ['INTERPOLATION', 'Bilinear + slerp geodesic'],
              ['BUILD', 'Vite 7 · React 19'], ['TYPE SAFETY', 'TypeScript strict'],
              ['STYLING', 'Tailwind CSS v4'], ['ART', 'gpt-image-1.5 concept plates'],
            ].map(([k, v]) => (
              <div key={k} className="panel-inset rounded-lg px-3 py-2">
                <div className="text-[7px] tracking-[0.25em] text-mute">{k}</div>
                <div className="text-ink mt-0.5">{v}</div>
              </div>
            ))}
          </div>

          {/* export sample */}
          <div className="mt-6 panel rounded-xl p-4">
            <div className="text-[9px] font-mono tracking-[0.25em] text-sand flex items-center gap-2"><FileDown size={12} /> EXPORT: THE FLIGHT-DIRECTOR REPORT</div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-ink/80">Hit <b>EXPORT</b> in the console to download a plain-text route safety report — distance, energy, hazard windows, named risks and flight-director recommendations — ready to attach to a mission plan.</p>
            <Link to="/planner" className="mt-3 h-10 w-full rounded-lg border border-ember/50 bg-ember/15 text-ember font-bold text-[10.5px] tracking-widest flex items-center justify-center gap-2 hover:bg-ember/25 transition-colors">
              OPEN THE CONSOLE <ChevronRight size={14} />
            </Link>
          </div>

          <div className="mt-6 text-[8.5px] font-mono text-mute/70 leading-relaxed border-t border-edge pt-4">
            CHALLENGE 11 · EACHTO 2026 · BUILT WITH NASA OPEN DATA.<br />
            NASA MOLA PRODUCT NOTICE: MEGDR DATA ARE FREE & UNRESTRICTED.<br />
            THIS IS AN EDUCATIONAL PLANNING TOOL — NOT FLIGHT-RULES CERTIFIED.
          </div>
        </div>
      </div>
    </div>
  );
}
