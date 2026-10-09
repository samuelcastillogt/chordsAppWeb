import type { Metadata } from "next"
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google"

import AnalyticsInit from "@/components/layout/AnalyticsInit"
import SiteFooter from "@/components/layout/SiteFooter"
import SiteHeader from "@/components/layout/SiteHeader"
import { env } from "@/lib/env"
import { SITE_NAME, absoluteUrl } from "@/lib/site"
import Providers from "./providers"
import "./globals.css"

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" })
const ui = Inter({ subsets: ["latin"], variable: "--font-ui", display: "swap" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", weight: ["400", "600"] })

const DESCRIPTION =
  "Pega los acordes de cualquier canción y descubre su tonalidad, la función de cada acorde, su curva de tensión y qué acordes pueden reemplazarlos o seguirlos."

export const metadata: Metadata = {
  // The base path is part of the site URL, so relative image paths resolve under /chordsAppWeb/.
  metadataBase: new URL(`${env.siteUrl}/`),
  applicationName: SITE_NAME,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    locale: "es_419",
    siteName: SITE_NAME,
    title: "ChordWeaver · Entiende por qué funciona una canción",
    description: DESCRIPTION,
    url: absoluteUrl("/"),
    // Relative to metadataBase, so it keeps the GitHub Pages base path.
    images: [{ url: "og.png", width: 1200, height: 630, alt: "ChordWeaver: entiende por qué suena así cualquier canción" }],
  },
  twitter: { card: "summary_large_image" },
  verification: env.googleSiteVerification ? { google: env.googleSiteVerification } : undefined,
  title: {
    default: "ChordWeaver · Entiende por qué funciona una canción",
    template: "%s · ChordWeaver",
  },
  description: DESCRIPTION,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <body>
        <Providers>
          <AnalyticsInit />
          <SiteHeader />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  )
}
