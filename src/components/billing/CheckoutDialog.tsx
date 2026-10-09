"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { track } from "@/lib/analytics"
import { post } from "@/lib/api"
import { useAuth } from "@/lib/auth/AuthProvider"
import { PERIOD_LABEL, formatPrice } from "@/lib/billing"
import { CheckoutResponse, Plan, Price } from "@/types"

type Props = {
  /** The plan and price being bought; null closes the dialog. */
  selection: { plan: Plan; price: Price } | null
  /** "mock" while payments are simulated. */
  provider: string
  onClose: () => void
}

export default function CheckoutDialog({ selection, provider, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const queryClient = useQueryClient()
  const { reloadUser } = useAuth()
  const isMock = provider === "mock"

  const checkout = useMutation({
    mutationFn: ({ plan, price }: { plan: Plan; price: Price }) =>
      post<CheckoutResponse>("/api/v1/billing/checkout", { plan: plan.id, period: price.period, region: price.region }),
    onSuccess: async (result, { plan, price }) => {
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl)
        return
      }
      const params = { plan: plan.id, period: price.period, region: price.region, value: price.amount, currency: price.currency }
      // Simulated purchases are tracked apart so they never count as revenue.
      track(result.provider === "mock" ? "begin_checkout" : "purchase", { ...params, mock: result.provider === "mock" })
      queryClient.setQueryData(["subscription"], result.subscription)
      await reloadUser()
    },
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (selection && !dialog.open) {
      checkout.reset()
      dialog.showModal()
    }
    if (!selection && dialog.open) dialog.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection])

  const done = checkout.isSuccess && !checkout.data.checkoutUrl

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="checkout-title"
      onCancel={event => {
        event.preventDefault()
        if (!checkout.isPending) onClose()
      }}
      className="w-[min(92vw,30rem)] rounded-2xl border border-hairline bg-canvas p-0 text-ink shadow-card backdrop:bg-primary/60"
    >
      {selection ? (
        <div className="flex flex-col gap-4 p-6">
          {done ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fn-tonic">Listo</p>
              <h2 id="checkout-title" className="text-3xl leading-tight">
                Ya tienes {selection.plan.name}
              </h2>
              <p className="text-ink-mute">Puedes guardar progresiones sin límite. {isMock ? "Es una suscripción de prueba: no se te cobró nada." : ""}</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  onClick={onClose}
                  className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep"
                >
                  Analizar una canción
                </Link>
                <Link
                  href="/cuenta"
                  onClick={onClose}
                  className="inline-flex min-h-11 items-center rounded-md border border-hairline px-5 font-semibold hover:border-ink"
                >
                  Ver mi cuenta
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Confirmar plan</p>
              <h2 id="checkout-title" className="text-3xl leading-tight">
                {selection.plan.name}
              </h2>
              <p className="flex items-baseline gap-2">
                <span className="font-display text-4xl">{formatPrice(selection.price.amount)}</span>
                <span className="text-ink-mute">{PERIOD_LABEL[selection.price.period]}</span>
              </p>
              {selection.price.region === "latam" ? <p className="-mt-2 text-sm text-ink-mute">Precio para Latinoamérica.</p> : null}
              {isMock ? (
                <p role="note" className="rounded-lg border border-surface-violet-soft bg-surface-violet-soft/15 p-3 text-sm">
                  <strong>Modo de prueba.</strong> Los pagos aún no están activos: al confirmar se activa el plan y <strong>no se te cobra nada</strong>. Te
                  avisaremos antes de empezar a cobrar.
                </p>
              ) : (
                <p className="text-sm text-ink-mute">Te llevaremos a la página de pago segura del procesador.</p>
              )}
              {checkout.isError ? (
                <p role="alert" className="text-sm text-fn-dominant">
                  {(checkout.error as Error).message}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={checkout.isPending}
                  className="min-h-11 rounded-md border border-hairline px-5 font-semibold hover:border-ink disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => checkout.mutate(selection)}
                  disabled={checkout.isPending}
                  className="min-h-11 rounded-md bg-surface-teal-deep px-5 font-bold text-on-primary hover:bg-surface-teal-mid disabled:opacity-60"
                >
                  {checkout.isPending ? "Activando…" : isMock ? "Activar sin costo" : "Ir a pagar"}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </dialog>
  )
}
