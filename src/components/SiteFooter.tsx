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
                <a href={item.href.startsWith("#") ? `/${item.href}` : item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-footer__credit">
          <p>
            Design &amp; development by{" "}
            <a href="https://alhassan-portfolio-sigma.vercel.app" target="_blank" rel="noopener noreferrer">
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
    </footer>
  );
}
