import Link from "next/link"

import { env } from "@/lib/env"
import { ISSUES_URL } from "@/lib/site"

/** Shared layout of the privacy, terms and account-deletion pages. */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Legal</p>
      <h1 className="mt-2 text-[clamp(36px,6vw,48px)] leading-none">{title}</h1>
      <p className="mt-3 text-sm text-ink-mute">Última actualización: {updated}</p>
      <div className="legal mt-8">{children}</div>
      <nav aria-label="Documentos legales" className="mt-12 flex flex-wrap gap-4 border-t border-hairline pt-6 text-sm font-semibold">
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/terminos">Términos</Link>
        <Link href="/eliminar-cuenta">Eliminar la cuenta</Link>
      </nav>
    </main>
  )
}

/** How to reach the team: the configured email, or the repository's issues as a fallback. */
export function Contact() {
  return env.contactEmail ? (
    <a href={`mailto:${env.contactEmail}`}>{env.contactEmail}</a>
  ) : (
    <a href={ISSUES_URL} target="_blank" rel="noreferrer">
      el formulario de soporte en GitHub
    </a>
  )
}
