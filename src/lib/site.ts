/* Site-wide constants shared by the layout metadata and the page's structured data. */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skybloom-3d.vercel.app";
export const PORTFOLIO_URL = "https://alhassan-portfolio-sigma.vercel.app";
export const SITE_DESCRIPTION =
  "Skybloom builds glass-and-timber districts where every tower carries its own garden. Scroll to watch one grow, from bare ground to a living neighbourhood at dusk.";

// Pages mirror: OG/icon URLs resolve against github.io (Next adds the /skybloom-3d base path).
// The canonical always points at the main Vercel site.
export const METADATA_BASE = process.env.GH_PAGES === "1" ? "https://kyan9400.github.io" : SITE_URL;
