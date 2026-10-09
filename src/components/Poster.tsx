/*
 * Shown when WebGL is unavailable or the GPU context is lost: the finished district at dusk, drawn in SVG.
 */

const TOWERS: [number, number, number][] = [
  // x, width, height
  [70, 70, 210], [150, 54, 300], [214, 80, 250], [306, 60, 380], [376, 92, 330], [480, 66, 470], [556, 84, 400],
  [652, 58, 560], [722, 96, 450], [830, 70, 520], [912, 86, 380], [1010, 60, 430], [1082, 90, 320], [1184, 64, 360],
  [1260, 82, 260], [1354, 60, 300], [1426, 88, 220], [1526, 70, 180],
];

export default function Poster() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="poster-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1f46" />
          <stop offset="0.55" stopColor="#7b4a68" />
          <stop offset="0.85" stopColor="#de7658" />
          <stop offset="1" stopColor="#f2a774" />
        </linearGradient>
        <linearGradient id="poster-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4a6a" />
          <stop offset="1" stopColor="#1b2236" />
        </linearGradient>
        <pattern id="poster-windows" width="18" height="22" patternUnits="userSpaceOnUse">
          <rect width="18" height="22" fill="url(#poster-glass)" />
          <rect x="3" y="5" width="12" height="13" fill="#ffc27a" opacity="0.55" />
          <rect y="0" width="18" height="3" fill="#6b5a4a" />
        </pattern>
      </defs>
      <rect width="1600" height="900" fill="url(#poster-sky)" />
      <circle cx="420" cy="720" r="70" fill="#ffb27a" opacity="0.85" />
      {TOWERS.map(([x, w, h], i) => (
        <g key={x}>
          <rect x={x} y={840 - h} width={w} height={h} fill="url(#poster-windows)" />
          <rect x={x - 4} y={834 - h} width={w + 8} height="10" rx="5" fill="#3f7a46" />
          {Array.from({ length: Math.floor(h / 70) }, (_, k) => (
            <rect key={k} x={x - 3 + ((i + k) % 2) * (w / 2)} y={840 - h + 40 + k * 66} width={w / 2 + 3} height="9" rx="4.5" fill={k % 3 === 0 ? "#5d9a52" : "#2f6b45"} />
          ))}
        </g>
      ))}
      <rect y="836" width="1600" height="64" fill="#1e1b2b" />
      {Array.from({ length: 34 }, (_, i) => (
        <circle key={i} cx={20 + i * 48} cy={834 - (i % 3) * 6} r={16 + (i % 4) * 4} fill={i % 5 === 0 ? "#e07a5f" : "#2f5a3a"} />
      ))}
    </svg>
  );
}
