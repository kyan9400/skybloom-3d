import { ImageResponse } from "next/og";

export const alt = "Skybloom — glass towers wrapped in gardens at dusk. Cities that grow back.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TOWERS: [number, number][] = [
  [60, 180], [130, 260], [200, 220], [270, 340], [340, 300], [410, 420], [480, 360], [550, 470], [620, 400],
  [690, 330], [760, 380], [830, 280], [900, 320], [970, 240], [1040, 200], [1110, 160],
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(180deg, #1c1f46 0%, #6d4566 55%, #de7658 85%, #f2a774 100%)",
          fontFamily: "serif",
        }}
      >
        <div style={{ position: "absolute", left: 300, top: 470, width: 120, height: 120, borderRadius: 60, background: "#ffb27a", display: "flex" }} />
        {TOWERS.map(([x, h], i) => (
          <div key={x} style={{ position: "absolute", left: x, bottom: 40, width: 54, height: h, display: "flex", flexDirection: "column", background: "#25304a" }}>
            <div style={{ height: 10, background: "#3f7a46", borderRadius: 5, margin: "-4px -4px 0" }} />
            {Array.from({ length: Math.floor(h / 60) }, (_, k) => (
              <div key={k} style={{ display: "flex", height: 8, marginTop: 44, width: (i + k) % 2 ? 54 : 30, background: k % 3 ? "#2f6b45" : "#5d9a52", borderRadius: 4 }} />
            ))}
          </div>
        ))}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 40, background: "#1e1b2b", display: "flex" }} />
        <div style={{ position: "absolute", left: 64, top: 56, display: "flex", flexDirection: "column", color: "#f4f0e6" }}>
          <div style={{ fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: "#8fc79a", fontFamily: "sans-serif" }}>Skybloom</div>
          <div style={{ fontSize: 92, lineHeight: 1.02, marginTop: 18, maxWidth: 820 }}>Cities that grow back.</div>
        </div>
      </div>
    ),
    size,
  );
}
