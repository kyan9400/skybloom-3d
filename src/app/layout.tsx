import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { METADATA_BASE, PORTFOLIO_URL, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import "./globals.css";

// Only the upright display face and the text face are preloaded (the hero h1 + lede are the LCP).
// No opsz axis: it roughly doubles the file and the display sizes look right at the default optical size.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  style: "normal",
  preload: true,
});

// italic accents (the <em> words, numerals) load on demand
const frauncesItalic = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces-italic",
  display: "swap",
  style: "italic",
  preload: false,
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: true,
});

const description = SITE_DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: new URL(METADATA_BASE),
  title: {
    default: "Skybloom — Cities that grow back",
    template: "%s · Skybloom",
  },
  description,
  applicationName: "Skybloom",
  authors: [{ name: "Alhassan Alfarran", url: PORTFOLIO_URL }],
  creator: "Alhassan Alfarran",
  category: "architecture",
  keywords: ["eco-city", "green architecture", "mass timber", "vertical gardens", "WebGL", "three.js", "portfolio"],
  alternates: { canonical: `${SITE_URL}/` },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/`,
    siteName: "Skybloom",
    title: "Skybloom — Cities that grow back",
    description,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skybloom — Cities that grow back",
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f4f0e6",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${frauncesItalic.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
