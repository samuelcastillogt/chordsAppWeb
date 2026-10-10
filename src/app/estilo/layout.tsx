import type { Metadata } from "next"

import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Estilo de banda: aprende cómo compone tu grupo favorito",
  description: "Pega canciones de una banda y ChordWeaver aprende sus acordes y patrones favoritos para sugerirte progresiones con su estilo.",
  alternates: { canonical: absoluteUrl("/estilo/") },
  openGraph: {
    title: "Estilo de banda: aprende cómo compone tu grupo favorito · ChordWeaver",
    description: "Pega canciones de una banda y ChordWeaver aprende sus acordes y patrones favoritos para sugerirte progresiones con su estilo.",
    url: absoluteUrl("/estilo/"),
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
