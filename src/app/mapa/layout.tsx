import type { Metadata } from "next"

import { absoluteUrl } from "@/lib/site"

const description =
  "Sube el cifrado o la tablatura de una canción y mira su armonía en un mapa: los acordes que más suenan, sus movimientos, su tonalidad, préstamos y modulaciones."

export const metadata: Metadata = {
  title: "Mapa armónico de una canción",
  description,
  alternates: { canonical: absoluteUrl("/mapa/") },
  openGraph: { title: "Mapa armónico de una canción · ChordWeaver", description, url: absoluteUrl("/mapa/") },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
