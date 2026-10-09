"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import CheckoutDialog from "@/components/billing/CheckoutDialog"
import { track } from "@/lib/analytics"
import { get } from "@/lib/api"
import { useAuth } from "@/lib/auth/AuthProvider"
import { PERIOD_LABEL, detectRegion, formatPrice, priceFor } from "@/lib/billing"
import { Plan, PlansResponse, Price, PricePeriod, PriceRegion } from "@/types"

const FAQ = [
  {
    q: "¿Necesito pagar para usar ChordWeaver?",
    a: "No. El analizador, el explorador, el mástil y el piano son gratis y sin límite. El plan Pro quita el límite de progresiones guardadas y suma funciones para quien toca o enseña todas las semanas.",
  },
  {
    q: "¿Qué pasa si cancelo?",
    a: "Vuelves al plan Gratis al terminar el periodo. Tus progresiones se conservan: puedes abrirlas, compartirlas y borrarlas, pero no guardar nuevas por encima del límite.",
  },
  {
    q: "¿Por qué el precio es menor en Latinoamérica?",
    a: "Ajustamos el plan anual y el vitalicio al poder de compra de la región. Lo detectamos por la zona horaria de tu dispositivo; al pagar se confirma con tu país de facturación.",
  },
  {
    q: "¿Qué es el plan Vitalicio fundador?",
    a: "Un solo pago para tener Pro para siempre. Es una oferta para los primeros usuarios y no se repetirá a este precio.",
  },
]

export default function Pricing() {
  const { user, ready, accountsEnabled, openDialog } = useAuth()
  const [period, setPeriod] = useState<Extract<PricePeriod, "monthly" | "yearly">>("yearly")
  const [region, setRegion] = useState<PriceRegion>("global")
  const [selection, setSelection] = useState<{ plan: Plan; price: Price } | null>(null)

  useEffect(() => setRegion(detectRegion()), [])

  const { data, isLoading, error } = useQuery<PlansResponse>({ queryKey: ["plans"], queryFn: () => get("/api/v1/plans"), staleTime: 60 * 60 * 1000 })

  function choose(plan: Plan, price: Price) {
    track("pro_click", { plan: plan.id, period: price.period, region, signed_in: !!user })
    if (!user) {
      openDialog()
      return
    }
    setSelection({ plan, price })
  }

  const yearlySaving = (() => {
    const pro = data?.plans.find(plan => plan.id === "pro")
    // Global prices on both sides: comparing a regional yearly price with the global monthly one would overstate the saving.
    const monthly = pro && priceFor(pro, "monthly", "global")
    const yearly = pro && priceFor(pro, "yearly", "global")
    return monthly && yearly ? Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100) : null
  })()

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Precios</p>
        <h1 className="mt-2 text-[clamp(36px,6vw,56px)] leading-none">Entiende tus canciones gratis. Guarda sin límite con Pro.</h1>
        <p className="mt-4 text-ink-mute">Sin anuncios ni pop-ups en ningún plan. Cancela cuando quieras. Precios en dólares (USD).</p>
      </div>

      {data?.provider === "mock" ? (
        <p role="note" className="mx-auto mt-8 max-w-2xl rounded-lg border border-surface-violet-soft bg-surface-violet-soft/15 p-3 text-center text-sm">
          <strong>Estamos en modo de prueba:</strong> puedes activar Pro o Vitalicio sin costo mientras habilitamos los pagos.
        </p>
      ) : null}

      <div className="mt-8 flex justify-center">
        <div role="radiogroup" aria-label="Periodo de pago" className="inline-flex rounded-full border border-hairline bg-canvas p-1 text-sm font-semibold">
          {(["monthly", "yearly"] as const).map(option => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={period === option}
              onClick={() => setPeriod(option)}
              className={`min-h-10 rounded-full px-5 transition ${period === option ? "bg-primary text-on-primary" : "text-ink-mute hover:text-ink"}`}
            >
              {option === "monthly" ? "Mensual" : "Anual"}
              {option === "yearly" && yearlySaving ? <span className="ml-2 text-xs text-fn-tonic">−{yearlySaving}%</span> : null}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div role="status" aria-label="Cargando planes" className="mt-10 grid gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-96 animate-pulse rounded-2xl bg-hairline/60" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-10 rounded-xl border border-fn-dominant/30 bg-fn-dominant/10 p-5 text-center text-fn-dominant">{(error as Error).message}</p>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {data?.plans.map(plan => {
            const price = plan.id === "lifetime" ? priceFor(plan, "once", region) : priceFor(plan, period, region)
            const featured = plan.id === "pro"
            const current = user?.plan === plan.id
            const dark = featured
            return (
              <section
                key={plan.id}
                aria-labelledby={`plan-${plan.id}`}
                className={`relative flex flex-col rounded-2xl border p-6 shadow-card ${dark ? "border-primary bg-primary text-on-primary" : "border-hairline bg-canvas"}`}
              >
                {featured ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-surface-violet-soft px-3 py-1 text-xs font-bold text-primary">El más elegido</span>
                ) : null}
                <h2 id={`plan-${plan.id}`} className="text-3xl">
                  {plan.name}
                </h2>
                <p className={`mt-2 min-h-12 text-sm ${dark ? "text-on-dark-mute" : "text-ink-mute"}`}>{plan.tagline}</p>
                <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-5xl">{formatPrice(price?.amount ?? 0)}</span>
                  <span className={dark ? "text-on-dark-mute" : "text-ink-mute"}>{price ? PERIOD_LABEL[price.period] : "para siempre"}</span>
                </p>
                <p className={`mt-1 min-h-5 text-xs ${dark ? "text-on-dark-mute" : "text-ink-faint"}`}>
                  {price?.region === "latam"
                    ? "Precio para Latinoamérica"
                    : plan.id === "pro" && period === "yearly" && price
                      ? `${formatPrice(price.amount / 12)} al mes`
                      : ""}
                </p>
                <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex gap-2">
                      <svg viewBox="0 0 20 20" aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? "text-surface-violet-soft" : "text-fn-tonic"}`}>
                        <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {!ready ? (
                    <div className="h-11" />
                  ) : current ? (
                    <p
                      className={`flex min-h-11 items-center justify-center rounded-md border font-semibold ${dark ? "border-hairline-dark" : "border-hairline"}`}
                    >
                      Tu plan actual
                    </p>
                  ) : plan.id === "free" ? (
                    user ? null : (
                      <button
                        type="button"
                        onClick={openDialog}
                        disabled={!accountsEnabled}
                        className="min-h-11 w-full rounded-md border border-hairline font-semibold hover:border-ink disabled:opacity-60"
                      >
                        Crear cuenta gratis
                      </button>
                    )
                  ) : price ? (
                    <button
                      type="button"
                      onClick={() => choose(plan, price)}
                      disabled={!accountsEnabled || (plan.id === "pro" && user?.plan === "lifetime")}
                      className={`min-h-11 w-full rounded-md font-bold disabled:opacity-60 ${dark ? "bg-surface-violet-soft text-primary hover:bg-white" : "bg-primary text-on-primary hover:bg-primary-deep"}`}
                    >
                      {user ? `Elegir ${plan.name}` : "Crear cuenta y elegir"}
                    </button>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <section aria-labelledby="faq-title" className="mx-auto mt-16 max-w-3xl">
        <h2 id="faq-title" className="text-3xl">
          Preguntas frecuentes
        </h2>
        <div className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-canvas">
          {FAQ.map(item => (
            <details key={item.q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span aria-hidden="true" className="text-ink-mute transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-ink-mute">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-ink-mute">
          ¿Eres una iglesia, academia o docente con varios usuarios? Escríbenos y armamos un plan de equipo.
        </p>
      </section>

      <CheckoutDialog selection={selection} provider={data?.provider ?? "mock"} onClose={() => setSelection(null)} />
    </main>
  )
}
