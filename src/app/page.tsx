import { Suspense } from "react"

import Analyzer from "@/components/analyzer/Analyzer"
import { absoluteUrl } from "@/lib/site"

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ChordWeaver",
  url: absoluteUrl("/"),
  image: absoluteUrl("/og.png"),
  description:
    "Analizador armónico en español: pega los acordes de una canción y descubre su tonalidad, la función de cada acorde, su curva de tensión y qué acordes pueden seguir.",
  applicationCategory: "MusicApplication",
  operatingSystem: "Web, Android",
  inLanguage: "es",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }} />
      <Suspense>
        <Analyzer />
      </Suspense>
    </>
  )
}
