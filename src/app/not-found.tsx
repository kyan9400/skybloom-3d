import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Plot not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main id="main" className="not-found">
      <svg viewBox="0 0 240 120" className="not-found__art" aria-hidden="true" focusable="false">
        <rect y="96" width="240" height="24" fill="#c9bf9f" />
        <path d="M30 96h180" stroke="#2f6b45" strokeWidth="2" strokeDasharray="6 6" />
        <rect x="112" y="72" width="3" height="24" fill="#3d5148" />
        <path d="M115 74c10-8 22-6 26 2-10 4-18 4-26-2z" fill="#2f6b45" />
        <path d="M112 80c-8-7-18-5-21 1 8 3 14 3 21-1z" fill="#5d9a52" />
      </svg>
      <p className="eyebrow">Error 404</p>
      <h1 className="not-found__title">
        This plot is still <em>empty</em>.
      </h1>
      <p className="not-found__text">Nothing has been planted at this address yet.</p>
      <Link className="btn btn--solid" href="/">
        Back to the district
      </Link>
      <p className="not-found__legal">Concept project — fictional brand. © 2026 Alhassan Alfarran</p>
    </main>
  );
}
