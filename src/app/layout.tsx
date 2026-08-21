import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GlobalSound } from "../components/GlobalSound";
import { AppMenu } from "../components/AppMenu";
import { BirthdayIntro } from "../components/BirthdayIntro";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MKT",
  description: "MKT music experience",
  icons: {
    icon: [
      { url: "/images/mkt-favicon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "64x64", type: "image/x-icon" },
      { url: "/images/mkt-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/mkt-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/images/mkt-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "MKT",
    description: "MKT music experience",
    images: [{ url: "/images/mkt-share.png", width: 1200, height: 1200, alt: "MKT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MKT",
    description: "MKT music experience",
    images: ["/images/mkt-share.png"],
  },
  appleWebApp: {
    capable: true,
    title: "MKT",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080808",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <GlobalSound />
        <BirthdayIntro />
        <div id="site-content" className="site-content">
          <AppMenu />
          {children}
        </div>
      </body>
    </html>
  );
}
