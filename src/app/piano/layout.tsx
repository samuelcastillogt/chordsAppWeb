import type { Metadata } from "next"

import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Piano interactivo: encuentra el acorde",
  description: "Toca notas en el piano y descubre qué acordes las contienen. Ideal para sacar canciones de oído.",
  alternates: { canonical: absoluteUrl("/piano/") },
  openGraph: {
    title: "Piano interactivo: encuentra el acorde · ChordWeaver",
    description: "Toca notas en el piano y descubre qué acordes las contienen. Ideal para sacar canciones de oído.",
    url: absoluteUrl("/piano/"),
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
