import type { Metadata } from "next"

import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Mástil de guitarra: qué acorde estoy tocando",
  description: "Pon los dedos en el mástil y descubre qué acorde es, en qué otras posiciones tocarlo y qué acorde sigue con el menor movimiento de la mano.",
  alternates: { canonical: absoluteUrl("/fretboard/") },
  openGraph: {
    title: "Mástil de guitarra: qué acorde estoy tocando · ChordWeaver",
    description: "Pon los dedos en el mástil y descubre qué acorde es, en qué otras posiciones tocarlo y qué acorde sigue con el menor movimiento de la mano.",
    url: absoluteUrl("/fretboard/"),
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
