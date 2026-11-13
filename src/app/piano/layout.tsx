import type { Metadata } from "next"

import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Piano: qué acorde estoy tocando",
  description: "Toca un acorde en el piano (o con tu teclado MIDI) y descubre cuál es, sus inversiones y cómo pasar al siguiente moviendo lo mínimo.",
  alternates: { canonical: absoluteUrl("/piano/") },
  openGraph: {
    title: "Piano: qué acorde estoy tocando · ChordWeaver",
    description: "Toca un acorde en el piano (o con tu teclado MIDI) y descubre cuál es, sus inversiones y cómo pasar al siguiente moviendo lo mínimo.",
    url: absoluteUrl("/piano/"),
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
