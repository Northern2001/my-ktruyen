import type { MetadataRoute } from "next";
import { sitePath } from "../lib/site-path";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MKT",
    short_name: "MKT",
    description: "MKT music experience",
    start_url: sitePath("/"),
    display: "standalone",
    background_color: "#080808",
    theme_color: "#080808",
    icons: [
      {
        src: sitePath("/images/mkt-icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: sitePath("/images/mkt-icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
