import Link from "next/link"

import { absoluteUrl } from "@/lib/site"

type Faq = { q: string; a: string }

/** Layout of the theory pages: night hero, the tool, the explanation and an FAQ (with structured data). */
export default function LearnArticle({
  path,
  eyebrow,
  title,
  lead,
  tool,
  children,
  faq,
}: {
  path: string
  eyebrow: string
  title: string
  lead: string
  tool: React.ReactNode
  children: React.ReactNode
  faq: Faq[]
}) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: lead,
      inLanguage: "es",
      url: absoluteUrl(path),
      image: absoluteUrl("/og.png"),
      publisher: { "@type": "Organization", name: "ChordWeaver", url: absoluteUrl("/") },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(item => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
    },
  ]
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="bg-primary text-on-primary">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-violet-soft">{eyebrow}</p>
          <h1 className="mt-3 text-[clamp(36px,6vw,56px)] leading-[1.05]">{title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-on-dark-mute">{lead}</p>
        </div>
      </section>
      <div className="mx-auto -mt-6 max-w-4xl px-4 sm:px-6">{tool}</div>
      <article className="legal mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {children}
        <h2>Preguntas frecuentes</h2>
        {faq.map(item => (
          <div key={item.q}>
            <h3 className="mt-6 font-display text-xl">{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
        <nav aria-label="Más teoría" className="mt-12 flex flex-wrap gap-4 border-t border-hairline pt-6 text-sm font-semibold">
          <Link href="/circulo-de-quintas">Círculo de quintas</Link>
          <Link href="/detector-de-tonalidad">Detector de tonalidad</Link>
          <Link href="/progresion-i-v-vi-iv">Progresión I–V–vi–IV</Link>
        </nav>
      </article>
    </main>
  )
}
