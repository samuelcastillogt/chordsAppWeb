"use client"

import { FormEvent, useEffect, useRef, useState } from "react"

import { useAuth } from "@/lib/auth/AuthProvider"
import { authErrorMessage } from "@/lib/auth/errors"

type Mode = "register" | "login" | "reset"

const COPY: Record<Mode, { title: string; body: string; submit: string }> = {
  register: { title: "Guarda tus progresiones", body: "Crea una cuenta gratis para guardar, editar y compartir lo que descubras.", submit: "Crear cuenta" },
  login: { title: "Bienvenido de vuelta", body: "Entra para ver tu biblioteca de progresiones.", submit: "Entrar" },
  reset: { title: "Recupera tu contraseña", body: "Te enviamos un enlace para crear una nueva.", submit: "Enviar enlace" },
}

const inputClass = "min-h-11 rounded-md border border-hairline px-3 font-normal outline-none focus:border-ink"

export default function AuthDialog() {
  const auth = useAuth()
  const { dialogOpen, closeDialog, signedIn, user, sessionProblem } = auth
  const [mode, setMode] = useState<Mode>("register")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (dialogOpen && !dialog.open) dialog.showModal()
    if (!dialogOpen && dialog.open) dialog.close()
  }, [dialogOpen])

  /** Runs an auth action showing progress and a readable error. */
  async function attempt(action: () => Promise<void>, success?: string) {
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      if (success) setNotice(success)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setPending(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode === "reset") {
      attempt(() => auth.resetPassword(email), `Si existe una cuenta con ${email.trim()}, te llegará un correo para cambiar la contraseña.`)
      return
    }
    if (mode === "login") {
      attempt(async () => {
        await auth.signIn(email, password)
        setPassword("")
      })
      return
    }
    attempt(async () => {
      await auth.signUp(email, password, displayName)
      setPassword("")
    }, `Cuenta creada. Te enviamos un correo a ${email.trim()} para verificarla.`)
  }

  // Signed in to Firebase but the API needs a verified email to link an older account.
  const needsVerification = signedIn && !user && sessionProblem
  const copy = COPY[mode]

  return (
    <dialog
      ref={dialogRef}
      onClose={closeDialog}
      aria-labelledby="auth-title"
      className="w-[min(420px,calc(100vw-32px))] rounded-xl border border-hairline bg-canvas p-0 text-ink shadow-2xl backdrop:bg-primary-deep/70"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">ChordWeaver</p>
            <h2 id="auth-title" className="mt-1 text-[28px] leading-tight">
              {needsVerification ? "Verifica tu correo" : signedIn && user ? "¡Listo!" : copy.title}
            </h2>
            <p className="mt-2 text-sm text-ink-mute">
              {needsVerification ? sessionProblem : signedIn && user ? "Ya puedes guardar y compartir tus progresiones." : copy.body}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            aria-label="Cerrar"
            className="h-10 w-10 shrink-0 rounded-full border border-hairline text-lg hover:bg-canvas-soft"
          >
            ×
          </button>
        </div>

        {notice ? (
          <p role="status" className="rounded-md bg-fn-tonic/10 px-3 py-2 text-sm text-fn-tonic">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-md bg-fn-dominant/10 px-3 py-2 text-sm text-fn-dominant">
            {error}
          </p>
        ) : null}

        {needsVerification ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => attempt(auth.refreshSession)}
              className="min-h-11 rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep disabled:opacity-60"
            >
              Ya verifiqué mi correo
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => attempt(auth.resendVerification, "Te enviamos otro correo de verificación.")}
              className="min-h-11 rounded-md border border-hairline px-5 font-semibold hover:border-ink disabled:opacity-60"
            >
              Reenviar correo
            </button>
            <button
              type="button"
              onClick={() => attempt(auth.logout)}
              className="text-sm font-semibold text-ink-mute underline-offset-4 hover:text-ink hover:underline"
            >
              Usar otra cuenta
            </button>
          </div>
        ) : signedIn && user ? (
          <button type="button" onClick={closeDialog} className="min-h-11 rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep">
            Continuar
          </button>
        ) : (
          <>
            {mode !== "reset" ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => attempt(auth.signInWithGoogle)}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-hairline px-5 font-semibold hover:border-ink disabled:opacity-60"
                >
                  <GoogleMark />
                  Continuar con Google
                </button>
                <p className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-ink-faint">
                  <span className="h-px flex-1 bg-hairline" />o con tu email
                  <span className="h-px flex-1 bg-hairline" />
                </p>
              </>
            ) : null}

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              {mode === "register" ? (
                <label className="flex flex-col gap-1 text-sm font-semibold">
                  Nombre (opcional)
                  <input
                    value={displayName}
                    onChange={event => setDisplayName(event.target.value)}
                    autoComplete="nickname"
                    maxLength={80}
                    className={inputClass}
                  />
                </label>
              ) : null}
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Email
                <input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className={inputClass} />
              </label>
              {mode !== "reset" ? (
                <label className="flex flex-col gap-1 text-sm font-semibold">
                  <span className="flex items-baseline justify-between">
                    Contraseña
                    {mode === "login" ? (
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="text-xs font-semibold text-ink-mute underline-offset-4 hover:text-ink hover:underline"
                      >
                        ¿La olvidaste?
                      </button>
                    ) : null}
                  </span>
                  <input
                    type="password"
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    className={inputClass}
                  />
                  {mode === "register" ? <span className="text-xs font-normal text-ink-mute">Mínimo 8 caracteres.</span> : null}
                </label>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="min-h-11 rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep disabled:opacity-60"
              >
                {pending ? "Un momento..." : copy.submit}
              </button>
            </form>

            <button
              type="button"
              onClick={() => switchMode(mode === "register" ? "login" : mode === "login" ? "register" : "login")}
              className="text-sm font-semibold text-ink-mute underline-offset-4 hover:text-ink hover:underline"
            >
              {mode === "register" ? "¿Ya tienes cuenta? Inicia sesión" : mode === "login" ? "¿No tienes cuenta? Créala gratis" : "Volver a iniciar sesión"}
            </button>
          </>
        )}
      </div>
    </dialog>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
