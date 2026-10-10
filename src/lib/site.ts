import { env } from "@/lib/env"

export const SITE_NAME = "ChordWeaver"
export const SONGBOOK_URL = "https://acordes-app-web.vercel.app"
export const ISSUES_URL = "https://github.com/samuelcastillogt/chordsAppWeb/issues"

/** Absolute URL of a route of this site (for metadata and the sitemap, which run at build time). */
export function absoluteUrl(path = "/"): string {
  return `${env.siteUrl}${path === "/" ? "/" : path}`
}

/** Pages listed in sitemap.xml, with how often they change. */
export const PUBLIC_ROUTES: Array<{ path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/explorer/", changeFrequency: "weekly", priority: 0.9 },
  { path: "/estilo/", changeFrequency: "monthly", priority: 0.7 },
  { path: "/fretboard/", changeFrequency: "monthly", priority: 0.6 },
  { path: "/piano/", changeFrequency: "monthly", priority: 0.6 },
  { path: "/precios/", changeFrequency: "monthly", priority: 0.8 },
  { path: "/circulo-de-quintas/", changeFrequency: "monthly", priority: 0.8 },
  { path: "/detector-de-tonalidad/", changeFrequency: "monthly", priority: 0.8 },
  { path: "/progresion-i-v-vi-iv/", changeFrequency: "monthly", priority: 0.8 },
  { path: "/opinion/", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacidad/", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terminos/", changeFrequency: "yearly", priority: 0.2 },
  { path: "/eliminar-cuenta/", changeFrequency: "yearly", priority: 0.2 },
]
