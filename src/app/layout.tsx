import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skybloom-3d.vercel.app";

const description =
  "Skybloom builds glass-and-timber districts where every tower carries its own garden. Scroll to watch one grow, from bare ground to a living neighbourhood at dusk.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Skybloom — Cities that grow back",
    template: "%s · Skybloom",
  },
  description,
  applicationName: "Skybloom",
  authors: [{ name: "Alhassan Alfarran", url: "https://alhassan-portfolio-sigma.vercel.app" }],
  creator: "Alhassan Alfarran",
  keywords: ["eco-city", "green architecture", "mass timber", "vertical gardens", "WebGL", "three.js", "portfolio"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
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
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
