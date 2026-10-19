import type { NextConfig } from "next";

// GH_PAGES=1 builds a static mirror for GitHub Pages (served under /skybloom-3d).
// The default (Vercel) build is unchanged.
const isPages = process.env.GH_PAGES === "1";
const basePath = isPages ? "/skybloom-3d" : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // lets plain <a href> links add the base path on the Pages mirror
  env: { NEXT_PUBLIC_PORTFOLIO_URL: isPages ? "https://kyan9400.github.io/alhassan_portfolio/" : "https://alhassan-portfolio-sigma.vercel.app", NEXT_PUBLIC_BASE_PATH: basePath },
  experimental: {
    // CSS ships inside the HTML: no render-blocking stylesheet request on mobile
    inlineCss: true,
  },
  ...(isPages && {
    output: "export",
    basePath,
    assetPrefix: basePath,
    images: { unoptimized: true },
    trailingSlash: true,
  }),
};

export default nextConfig;
