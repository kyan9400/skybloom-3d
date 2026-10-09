/* Small code-drawn illustrations for the three district cards. */

type Kind = "quay" | "spire" | "commons";

export default function DistrictArt({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full" aria-hidden="true" focusable="false">
      {kind === "quay" && (
        <>
          <rect width="320" height="200" fill="#d9e6e4" />
          <circle cx="250" cy="52" r="22" fill="#f3c89a" />
          {[24, 62, 96, 140, 178, 220, 262].map((x, i) => {
            const h = [70, 104, 86, 120, 92, 76, 58][i];
            return (
              <g key={x}>
                <rect x={x} y={130 - h} width="30" height={h} fill="#2f4a54" />
                <rect x={x - 2} y={128 - h} width="34" height="6" rx="3" fill="#2f6b45" />
                <rect x={x} y={150 - h / 2} width="30" height="5" fill="#5d9a52" />
                <rect x={x} y="132" width="30" height={h * 0.45} fill="#2f4a54" opacity="0.25" />
              </g>
            );
          })}
          <rect y="130" width="320" height="70" fill="#9fc0c4" opacity="0.7" />
          <path d="M0 160 Q40 154 80 160 T160 160 T240 160 T320 160" stroke="#f4f0e6" strokeWidth="2" fill="none" opacity="0.7" />
        </>
      )}
      {kind === "spire" && (
        <>
          <rect width="320" height="200" fill="#ece3cf" />
          <path d="M0 170 Q80 120 160 140 T320 120 V200 H0Z" fill="#8fae6e" />
          <rect x="140" y="22" width="40" height="150" fill="#33433f" />
          <rect x="130" y="130" width="60" height="42" fill="#3d5148" />
          {[40, 66, 92, 118].map((y) => (
            <g key={y}>
              <rect x="134" y={y} width="52" height="8" rx="4" fill="#2f6b45" />
              <circle cx="140" cy={y} r="5" fill="#5d9a52" />
              <circle cx="180" cy={y + 2} r="4" fill="#e07a5f" />
            </g>
          ))}
          <rect x="138" y="16" width="44" height="8" rx="4" fill="#5d9a52" />
        </>
      )}
      {kind === "commons" && (
        <>
          <rect width="320" height="200" fill="#e4ead8" />
          <rect y="140" width="320" height="60" fill="#a8c47e" />
          {[18, 82, 146, 210, 262].map((x, i) => (
            <g key={x}>
              <rect x={x} y={92 - (i % 2) * 14} width="44" height={50 + (i % 2) * 14} fill="#c69c6d" />
              <rect x={x - 3} y={88 - (i % 2) * 14} width="50" height="8" rx="4" fill="#2f6b45" />
              <rect x={x + 6} y={104 - (i % 2) * 14} width="12" height="14" fill="#33433f" />
              <rect x={x + 26} y={104 - (i % 2) * 14} width="12" height="14" fill="#33433f" />
            </g>
          ))}
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={10 + i * 20} cy={160 + (i % 3) * 8} r={3 + (i % 2)} fill={i % 4 === 0 ? "#e07a5f" : "#f4f0e6"} />
          ))}
        </>
      )}
    </svg>
  );
}
