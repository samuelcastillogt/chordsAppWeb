import type { Metadata } from "next"

import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Explorador armónico: qué acorde sigue",
  description:
    "Elige un acorde y descubre qué acordes conectan con él, de lo más natural a lo más atrevido. Escúchalos en el mandala armónico y arma tu progresión.",
  alternates: { canonical: absoluteUrl("/explorer/") },
  openGraph: {
    title: "Explorador armónico: qué acorde sigue · ChordWeaver",
    description:
      "Elige un acorde y descubre qué acordes conectan con él, de lo más natural a lo más atrevido. Escúchalos en el mandala armónico y arma tu progresión.",
    url: absoluteUrl("/explorer/"),
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
