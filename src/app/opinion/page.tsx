import type { Metadata } from "next"
import { Suspense } from "react"

import FeedbackForm from "@/components/feedback/FeedbackForm"
import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Danos tu opinión",
  description: "Cuéntanos qué te sirvió de ChordWeaver, qué te faltó o qué falló. Leemos cada mensaje.",
  alternates: { canonical: absoluteUrl("/opinion/") },
}

export default function OpinionPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Tu opinión</p>
      <h1 className="mt-2 text-[clamp(36px,6vw,48px)] leading-none">Ayúdanos a mejorar ChordWeaver</h1>
      <p className="mt-3 text-ink-mute">Son dos minutos. Lo que nos cuentas decide qué construimos después.</p>
      <div className="mt-8">
        <Suspense>
          <FeedbackForm />
        </Suspense>
      </div>
    </main>
  )
}
