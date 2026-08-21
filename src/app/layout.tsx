import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GlobalSound } from "../components/GlobalSound";
import { AppMenu } from "../components/AppMenu";
import { BirthdayIntroRoute } from "../components/BirthdayIntroRoute";
import { sitePath } from "../lib/site-path";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const siteOrigin = new URL(siteUrl).origin;
const shareImageUrl = new URL(sitePath("/images/mkt-share.png"), siteOrigin).href;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MKT",
  description: "MKT music experience",
  icons: {
    icon: [
      { url: sitePath("/images/mkt-favicon.png"), sizes: "512x512", type: "image/png" },
      { url: sitePath("/favicon.ico"), sizes: "64x64", type: "image/x-icon" },
      { url: sitePath("/images/mkt-icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: sitePath("/images/mkt-icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: sitePath("/images/mkt-apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "MKT",
    description: "MKT music experience",
    images: [{ url: shareImageUrl, width: 1200, height: 1200, alt: "MKT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MKT",
    description: "MKT music experience",
    images: [shareImageUrl],
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
      <head>
        <style>{`
          @font-face {
            font-family: "Geist Mono";
            src: url("${sitePath("/fonts/GeistMono-Variable.ttf")}") format("truetype");
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: "Geist Mono Bold";
            src: url("${sitePath("/fonts/GeistMono-Bold.ttf")}") format("truetype");
            font-weight: 700;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: "Google Sans Flex";
            src: url("${sitePath("/fonts/GoogleSansFlex-Regular.ttf")}") format("truetype");
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
        `}</style>
      </head>
      <body>
        <GlobalSound />
        <BirthdayIntroRoute />
        <div id="site-content" className="site-content">
          <AppMenu />
          {children}
        </div>
      </body>
    </html>
  );
}
