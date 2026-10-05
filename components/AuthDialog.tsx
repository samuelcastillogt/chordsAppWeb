"use client"

import { FormEvent, useEffect, useRef, useState } from "react"

import { useAuth } from "@/lib/auth"

export default function AuthDialog() {
  const { dialogOpen, closeDialog, login, register } = useAuth()
  const [mode, setMode] = useState<"register" | "login">("register")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (dialogOpen && !dialog.open) dialog.showModal()
    if (!dialogOpen && dialog.open) dialog.close()
  }, [dialogOpen])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      if (mode === "register") await register(email, password, displayName)
      else await login(email, password)
      setPassword("")
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo completar"
      setError(
        message === "Invalid credentials"
          ? "Email o contraseña incorrectos."
          : message === "User already exists"
            ? "Ya existe una cuenta con ese email. Inicia sesión."
            : message,
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={closeDialog}
      className="w-[min(420px,calc(100vw-32px))] rounded-xl border border-hairline bg-canvas p-0 text-ink shadow-2xl backdrop:bg-primary-deep/70"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">ChordWeaver</p>
            <h2 className="mt-1 text-[28px] leading-tight">{mode === "register" ? "Guarda tus progresiones" : "Bienvenido de vuelta"}</h2>
            <p className="mt-2 text-sm text-ink-mute">
              {mode === "register"
                ? "Crea una cuenta gratis para guardar, editar y compartir lo que descubras."
                : "Entra para ver tu biblioteca de progresiones."}
            </p>
          </div>
          <button type="button" onClick={closeDialog} aria-label="Cerrar" className="h-10 w-10 shrink-0 rounded-full border border-hairline text-lg hover:bg-canvas-soft">
            ×
          </button>
        </div>

        {mode === "register" ? (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Nombre (opcional)
            <input value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="nickname" className="min-h-11 rounded-md border border-hairline px-3 font-normal outline-none focus:border-ink" />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Email
          <input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className="min-h-11 rounded-md border border-hairline px-3 font-normal outline-none focus:border-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Contraseña
          <input type="password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} className="min-h-11 rounded-md border border-hairline px-3 font-normal outline-none focus:border-ink" />
          {mode === "register" ? <span className="text-xs font-normal text-ink-mute">Mínimo 8 caracteres.</span> : null}
        </label>

        {error ? <p role="alert" className="rounded-md bg-fn-dominant/10 px-3 py-2 text-sm text-fn-dominant">{error}</p> : null}

        <button type="submit" disabled={pending} className="min-h-11 rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep disabled:opacity-60">
          {pending ? "Un momento..." : mode === "register" ? "Crear cuenta" : "Entrar"}
        </button>
        <button type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(null) }} className="text-sm font-semibold text-ink-mute underline-offset-4 hover:text-ink hover:underline">
          {mode === "register" ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Créala gratis"}
        </button>
      </form>
    </dialog>
  )
}
