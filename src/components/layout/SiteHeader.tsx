"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import AuthDialog from "@/components/auth/AuthDialog"
import { useAuth } from "@/lib/auth/AuthProvider"

const LINKS = [
  { href: "/", label: "Analizar" },
  { href: "/explorer", label: "Explorar" },
  { href: "/estilo", label: "Estilo de banda" },
  { href: "/fretboard", label: "Mástil" },
  { href: "/piano", label: "Piano" },
  { href: "/progressions", label: "Mis progresiones" },
  { href: "/precios", label: "Precios" },
]

export default function SiteHeader() {
  const pathname = usePathname()
  const { user, ready, signedIn, accountsEnabled, openDialog, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-hairline-dark/60 bg-primary/95 text-on-primary backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
            <path d="M4 22c6-12 10-12 12 0s6 12 12 0" fill="none" stroke="#f2c14e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M4 10c6 12 10 12 12 0s6-12 12 0" fill="none" stroke="#1f8a70" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          ChordWeaver
        </Link>
        <nav aria-label="Principal" className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
          {LINKS.map(link => {
            const active = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-3 py-2 font-semibold transition ${active ? "bg-white/10 text-on-primary" : "text-on-dark-mute hover:bg-white/5 hover:text-on-primary"}`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-2 text-sm">
          {!ready ? null : user ? (
            <>
              <Link href="/cuenta" aria-label="Mi cuenta" className="flex min-h-10 items-center gap-2 rounded-md px-1 hover:bg-white/10">
                {user.photoUrl ? (
                  // A plain <img>: the static GitHub Pages export has no image optimizer for next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full border border-hairline-dark" />
                ) : null}
                <span className="hidden text-on-dark-mute md:inline">{user.displayName || user.email}</span>
                {user.plan !== "free" ? (
                  <span className="rounded-full bg-surface-violet-soft px-2 py-0.5 text-xs font-bold text-primary">
                    {user.plan === "lifetime" ? "Fundador" : "Pro"}
                  </span>
                ) : null}
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="min-h-10 rounded-md border border-hairline-dark px-3 font-semibold hover:bg-white/10"
              >
                Salir
              </button>
            </>
          ) : signedIn ? (
            <button
              type="button"
              onClick={openDialog}
              className="min-h-10 rounded-full border border-surface-violet-soft px-4 font-bold text-surface-violet-soft hover:bg-white/10"
            >
              Verifica tu correo
            </button>
          ) : accountsEnabled ? (
            <button type="button" onClick={openDialog} className="min-h-10 rounded-full bg-surface-violet-soft px-4 font-bold text-primary hover:bg-white">
              Crear cuenta
            </button>
          ) : null}
        </div>
      </div>
      <AuthDialog />
    </header>
  )
}
