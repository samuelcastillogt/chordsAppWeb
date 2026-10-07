import type { Metadata } from "next"
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google"

import SiteHeader from "@/components/layout/SiteHeader"
import Providers from "./providers"
import "./globals.css"

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" })
const ui = Inter({ subsets: ["latin"], variable: "--font-ui", display: "swap" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", weight: ["400", "600"] })

export const metadata: Metadata = {
  title: {
    default: "ChordWeaver · Entiende por qué funciona una canción",
    template: "%s · ChordWeaver",
  },
  description:
    "Pega los acordes de cualquier canción y descubre su tonalidad, la función de cada acorde, su curva de tensión y qué acordes pueden reemplazarlos o seguirlos.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <body>
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  )
}
