import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/site"

export const dynamic = "force-static"

// On GitHub Pages this file lives under /chordsAppWeb/, where crawlers do not look for it; it still
// documents the sitemap, which is submitted to Search Console directly.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/cuenta/", "/progressions/"] }], sitemap: absoluteUrl("/sitemap.xml") }
}
