"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"

import { track } from "@/lib/analytics"
import { post } from "@/lib/api"
import { useAuth } from "@/lib/auth/AuthProvider"

const RATINGS = [
  { value: 1, label: "Nada útil" },
  { value: 2, label: "Poco útil" },
  { value: 3, label: "Útil" },
  { value: 4, label: "Muy útil" },
  { value: 5, label: "Imprescindible" },
]

/** Short feedback form for testers and first users: a rating, a message and an optional email. */
export default function FeedbackForm() {
  const params = useSearchParams()
  const source = params.get("origen") === "app" ? "app" : "web"
  const { user } = useAuth()
  const [rating, setRating] = useState<number | null>(null)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (message.trim().length < 3) {
      setError("Cuéntanos un poco más.")
      return
    }
    setState("sending")
    setError(null)
    try {
      await post("/api/v1/feedback", {
        message,
        rating,
        email: email || undefined,
        page: document.referrer ? new URL(document.referrer).pathname : null,
        source,
        website,
      })
      track("feedback", { rating: rating ?? 0, source })
      setState("sent")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar. Inténtalo de nuevo.")
      setState("idle")
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-xl border border-fn-tonic/30 bg-fn-tonic/10 p-6">
        <h2 className="text-2xl">¡Gracias!</h2>
        <p className="mt-2 text-ink-mute">Leemos cada mensaje. Lo que nos cuentas decide qué construimos después.</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-on-primary">
          Volver a ChordWeaver
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-xl border border-hairline bg-canvas p-6 shadow-card">
      <fieldset>
        <legend className="font-semibold">¿Qué tan útil te resultó ChordWeaver?</legend>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
          {RATINGS.map(item => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={rating === item.value}
              onClick={() => setRating(item.value)}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${rating === item.value ? "border-primary bg-primary text-on-primary" : "border-hairline hover:border-ink"}`}
            >
              {item.value} · {item.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-2 font-semibold">
        ¿Qué te gustó, qué te faltó o qué falló?
        <textarea
          value={message}
          onChange={event => setMessage(event.target.value)}
          required
          maxLength={2000}
          rows={5}
          placeholder="Ej.: me sirvió para entender una canción de alabanza, pero me gustaría poder…"
          className="rounded-md border border-hairline px-3 py-2 font-normal outline-none focus:border-ink"
        />
      </label>
      {!user ? (
        <label className="flex flex-col gap-2 font-semibold">
          Tu correo (opcional, solo si quieres respuesta)
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            maxLength={200}
            autoComplete="email"
            className="min-h-11 rounded-md border border-hairline px-3 font-normal outline-none focus:border-ink"
          />
        </label>
      ) : (
        <p className="text-sm text-ink-mute">Lo enviamos con tu cuenta ({user.email}) para poder responderte.</p>
      )}
      {/* Honeypot: hidden from people, filled in by spam bots. */}
      <input
        type="text"
        value={website}
        onChange={event => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        name="website"
      />
      {error ? (
        <p role="alert" className="text-sm text-fn-dominant">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === "sending"}
        className="min-h-11 rounded-md bg-surface-teal-deep px-5 font-bold text-on-primary hover:bg-surface-teal-mid disabled:opacity-60"
      >
        {state === "sending" ? "Enviando…" : "Enviar opinión"}
      </button>
      <p className="text-xs text-ink-faint">
        Guardamos tu mensaje para mejorar el producto, como explica la{" "}
        <Link href="/privacidad" className="underline">
          política de privacidad
        </Link>
        .
      </p>
    </form>
  )
}
