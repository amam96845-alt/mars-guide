export default function RiskGauge({ score, verdict }: { score: number; verdict: 'safe' | 'caution' | 'dangerous' }) {
  const angle = -120 + (score / 100) * 240;
  const color = verdict === 'safe' ? '#34d399' : verdict === 'caution' ? '#fbbf24' : '#fb4b4b';

  // arc path helper
  const polar = (aDeg: number, r: number) => {
    const a = (aDeg * Math.PI) / 180;
    return { x: 100 + r * Math.cos(a), y: 96 + r * Math.sin(a) };
  };
  const arc = (from: number, to: number, r: number) => {
    const s = polar(from, r), e = polar(to, r);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${Math.abs(to - from) > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="relative w-full max-w-[190px] mx-auto select-none">
      <svg viewBox="0 0 200 118" className="w-full">
        {/* track zones */}
        <path d={arc(-210, -135, 78)} stroke="#fb4b4b" strokeOpacity="0.32" strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d={arc(-128, -94, 78)} stroke="#fbbf24" strokeOpacity="0.32" strokeWidth="13" fill="none" />
        <path d={arc(-87, 30, 78)} stroke="#34d399" strokeOpacity="0.32" strokeWidth="13" fill="none" strokeLinecap="round" />
        {/* score arc */}
        <path d={arc(-210, -210 + (score / 100) * 240, 78)} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}66)`, transition: 'all 900ms cubic-bezier(0.22,1,0.36,1)' }} />
        {/* needle */}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 96px', transition: 'transform 900ms cubic-bezier(0.22,1,0.36,1)' }}>
          <line x1="100" y1="96" x2="100" y2="34" stroke="#f4f4f8" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="100" cy="96" r="4.6" fill="#f4f4f8" />
          <circle cx="100" cy="96" r="2" fill="#0c0e18" />
        </g>
        <text x="100" y="114" textAnchor="middle" fontSize="10.5" fill={color} fontFamily="IBM Plex Mono, monospace" fontWeight="600" letterSpacing="2">
          {verdict === 'safe' ? 'GREEN' : verdict === 'caution' ? 'AMBER' : 'RED'}
        </text>
      </svg>
      <div className="absolute inset-x-0 top-[52%] flex flex-col items-center pointer-events-none">
        <div className="font-display font-bold text-[26px] leading-none text-ink tabular-nums">{score}</div>
        <div className="text-[8px] font-mono text-mute tracking-[0.22em] mt-0.5">/ 100 SAFETY</div>
      </div>
    </div>
  );
}
