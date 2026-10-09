import Link from "next/link"

import { SONGBOOK_URL } from "@/lib/site"

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-hairline bg-canvas-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-ink-mute">ChordWeaver · Entiende por qué suena así cualquier canción.</p>
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
          <Link href="/precios">Precios</Link>
          <a href={`${SONGBOOK_URL}/?utm_source=chordweaver&utm_medium=referral&utm_campaign=footer`}>Cancionero Soda Stereo y Cerati</a>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/terminos">Términos</Link>
          <Link href="/eliminar-cuenta">Eliminar cuenta</Link>
        </nav>
      </div>
    </footer>
  )
}
