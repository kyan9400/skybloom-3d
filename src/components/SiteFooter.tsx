import { PORTFOLIO_URL } from "@/lib/site";
import MotionToggle from "./MotionToggle";

export default function SiteFooter({ nav }: { nav: readonly { href: string; label: string }[] }) {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__grid">
        <div>
          <p className="site-footer__brand">Skybloom</p>
          <p className="site-footer__note">Concept project — fictional brand.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="site-footer__nav">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href.startsWith("#") ? `${process.env.NEXT_PUBLIC_BASE_PATH}/${item.href}` : item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-footer__credit">
          <p>
            Design &amp; development by{" "}
            <a href={process.env.NEXT_PUBLIC_PORTFOLIO_URL ?? PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
              Alhassan Alfarran
            </a>{" "}
            ·{" "}
            <a href="https://github.com/kyan9400" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </p>
          <p>© 2026 Alhassan Alfarran</p>
          <MotionToggle className="motion-toggle--footer" />
        </div>
      </div>
      {/* signature close: a giant outline wordmark (decorative) */}
      <svg className="site-footer__wordmark" viewBox="0 0 1000 232" aria-hidden="true" focusable="false">
        <text
          x="500"
          y="176"
          textAnchor="middle"
          fontSize="210"
          textLength="980"
          lengthAdjust="spacingAndGlyphs"
          fill="none"
          stroke="rgb(143 199 154 / 0.35)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        >
          Skybloom
        </text>
      </svg>
    </footer>
  );
}
