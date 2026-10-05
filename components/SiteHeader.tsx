"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import AuthDialog from "@/components/AuthDialog"
import { useAuth } from "@/lib/auth"

const LINKS = [
  { href: "/", label: "Analizar" },
  { href: "/explorer", label: "Explorar" },
  { href: "/fretboard", label: "Mástil" },
  { href: "/piano", label: "Piano" },
  { href: "/progressions", label: "Mis progresiones" },
]

export default function SiteHeader() {
  const pathname = usePathname()
  const { user, ready, accountsEnabled, openDialog, logout } = useAuth()

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
              <span className="hidden text-on-dark-mute md:inline">{user.displayName || user.email}</span>
              <button type="button" onClick={logout} className="min-h-10 rounded-md border border-hairline-dark px-3 font-semibold hover:bg-white/10">
                Salir
              </button>
            </>
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
