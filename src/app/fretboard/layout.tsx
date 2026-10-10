import type { Metadata } from "next"

import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Mástil de guitarra interactivo",
  description: "Mira dónde están las notas de cualquier acorde en el mástil de la guitarra, con los intervalos de cada posición.",
  alternates: { canonical: absoluteUrl("/fretboard/") },
  openGraph: {
    title: "Mástil de guitarra interactivo · ChordWeaver",
    description: "Mira dónde están las notas de cualquier acorde en el mástil de la guitarra, con los intervalos de cada posición.",
    url: absoluteUrl("/fretboard/"),
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
