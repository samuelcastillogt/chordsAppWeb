"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { track } from "@/lib/analytics"
import { get, post } from "@/lib/api"
import { RecentLoginRequiredError, useAuth } from "@/lib/auth/AuthProvider"
import { authErrorMessage } from "@/lib/auth/errors"
import { Subscription } from "@/types"

const PERIOD_NAME = { monthly: "mensual", yearly: "anual", once: "pago único" } as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })
}

export default function Account() {
  const { user, ready, accountsEnabled, openDialog, reloadUser, deleteAccount, logout } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    data: subscription,
    isLoading,
    error,
  } = useQuery<Subscription>({
    queryKey: ["subscription", user?.id],
    queryFn: () => get("/api/v1/billing/subscription"),
    enabled: !!user,
  })

  const cancel = useMutation({
    mutationFn: () => post<Subscription>("/api/v1/billing/cancel", {}),
    onSuccess: async result => {
      track("cancel_subscription", { plan: subscription?.plan })
      queryClient.setQueryData(["subscription", user?.id], result)
      await reloadUser()
    },
  })

  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => router.push("/eliminar-cuenta/?eliminada=1"),
    onError: async err => {
      if (err instanceof RecentLoginRequiredError) {
        setDeleteError(err.message)
        await logout()
        openDialog()
        return
      }
      setDeleteError(authErrorMessage(err))
    },
  })

  if (!ready) return <main className="min-h-[70vh]" />

  if (!accountsEnabled || !user) {
    return (
      <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-[44px] leading-none">Mi cuenta</h1>
        <div className="mt-8 rounded-xl border border-hairline bg-canvas p-8 shadow-card">
          {deleteError ? <p className="mb-4 rounded-md bg-surface-violet-soft/20 p-3 text-sm">{deleteError}</p> : null}
          <p className="text-ink-mute">{accountsEnabled ? "Entra para ver tu plan y tus datos." : "Las cuentas aún no están activas en este servidor."}</p>
          {accountsEnabled ? (
            <button type="button" onClick={openDialog} className="mt-5 min-h-11 rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep">
              Entrar
            </button>
          ) : null}
        </div>
      </main>
    )
  }

  const limit = subscription?.saveLimit ?? null
  const usage = subscription && limit ? Math.min(100, Math.round((subscription.saved / limit) * 100)) : 0
  const paid = subscription && subscription.plan !== "free"

  return (
    <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Cuenta</p>
      <h1 className="mt-2 flex flex-wrap items-center gap-3 text-[44px] leading-none">
        {user.displayName || "Mi cuenta"}
        {user.plan === "lifetime" ? (
          <span className="rounded-full bg-surface-violet-soft px-3 py-1 font-sans text-sm font-bold text-primary">Fundador</span>
        ) : null}
      </h1>
      <p className="mt-3 text-ink-mute">{user.email}</p>

      <section aria-labelledby="plan-title" className="mt-8 rounded-xl border border-hairline bg-canvas p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="plan-title" className="text-sm font-semibold uppercase tracking-[0.15em] text-ink-mute">
              Tu plan
            </h2>
            {isLoading ? (
              <div className="mt-2 h-9 w-40 animate-pulse rounded bg-hairline/60" />
            ) : error ? (
              <p className="mt-2 text-fn-dominant">{(error as Error).message}</p>
            ) : subscription ? (
              <>
                <p className="mt-1 font-display text-4xl">{subscription.planName}</p>
                <p className="mt-1 text-sm text-ink-mute">
                  {subscription.period ? `Pago ${PERIOD_NAME[subscription.period]}` : "Sin costo"}
                  {subscription.renewsAt ? ` · se renueva el ${formatDate(subscription.renewsAt)}` : ""}
                  {subscription.plan === "lifetime" ? " · para siempre" : ""}
                </p>
                {subscription.provider === "mock" ? (
                  <p className="mt-2 inline-block rounded-md bg-surface-violet-soft/20 px-2 py-1 text-xs font-semibold">
                    Suscripción de prueba: no se te cobra nada
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
          <Link href="/precios" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep">
            {paid ? "Ver planes" : "Pasar a Pro"}
          </Link>
        </div>

        {subscription ? (
          <div className="mt-6 border-t border-hairline pt-5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">Progresiones guardadas</span>
              <span className="font-mono">
                {subscription.saved}
                {limit ? ` / ${limit}` : " · sin límite"}
              </span>
            </div>
            {limit ? (
              <div
                role="progressbar"
                aria-valuenow={subscription.saved}
                aria-valuemin={0}
                aria-valuemax={limit}
                aria-label="Progresiones guardadas"
                className="mt-2 h-2 overflow-hidden rounded-full bg-hairline"
              >
                <div className={`h-full rounded-full ${usage >= 100 ? "bg-fn-dominant" : "bg-fn-tonic"}`} style={{ width: `${usage}%` }} />
              </div>
            ) : null}
            {limit && subscription.saved >= limit ? <p className="mt-2 text-sm text-fn-dominant">Llegaste al límite del plan Gratis.</p> : null}
          </div>
        ) : null}

        {paid ? (
          <div className="mt-6 border-t border-hairline pt-5">
            <button
              type="button"
              onClick={() => setConfirm("cancel")}
              disabled={cancel.isPending}
              className="text-sm font-semibold text-ink-mute underline hover:text-ink"
            >
              {subscription?.plan === "lifetime" ? "Renunciar al plan vitalicio" : "Cancelar suscripción"}
            </button>
            {cancel.isError ? <p className="mt-2 text-sm text-fn-dominant">{(cancel.error as Error).message}</p> : null}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="danger-title" className="mt-8 rounded-xl border border-fn-dominant/30 bg-canvas p-6">
        <h2 id="danger-title" className="text-2xl">
          Eliminar mi cuenta
        </h2>
        <p className="mt-2 text-sm text-ink-mute">
          Borra tu cuenta, tu plan y todas tus progresiones guardadas. No se puede deshacer.{" "}
          <Link href="/eliminar-cuenta" className="underline">
            Más información
          </Link>
        </p>
        {deleteError ? <p className="mt-3 text-sm text-fn-dominant">{deleteError}</p> : null}
        <button
          type="button"
          onClick={() => {
            setDeleteError(null)
            setConfirm("delete")
          }}
          disabled={remove.isPending}
          className="mt-4 min-h-11 rounded-md border border-fn-dominant px-5 font-semibold text-fn-dominant hover:bg-fn-dominant hover:text-on-primary disabled:opacity-60"
        >
          {remove.isPending ? "Eliminando…" : "Eliminar mi cuenta"}
        </button>
      </section>

      <ConfirmDialog
        open={confirm === "cancel"}
        title="¿Cancelar tu plan?"
        body="Vuelves al plan Gratis. Tus progresiones se conservan, pero no podrás guardar más de 5."
        confirmLabel="Cancelar plan"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          cancel.mutate()
        }}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="¿Eliminar tu cuenta para siempre?"
        body={`Se borrarán ${subscription ? `tus ${subscription.saved} progresiones, ` : ""}tu plan y tu acceso. No se puede deshacer.`}
        confirmLabel="Eliminar cuenta"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          remove.mutate()
        }}
      />
    </main>
  )
}
