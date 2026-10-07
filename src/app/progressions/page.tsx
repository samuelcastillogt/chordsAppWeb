"use client"

import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { appUrl, del, get, put } from "@/lib/api"
import { useAuth } from "@/lib/auth/AuthProvider"
import { Progression } from "@/types"

export default function ProgressionsPage() {
  const { user, ready, accountsEnabled, openDialog } = useAuth()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Progression | null>(null)

  const { data, isLoading, error } = useQuery<{ progressions: Progression[]; total: number }>({
    queryKey: ["progressions", user?.id],
    queryFn: () => get("/api/v1/progressions"),
    enabled: !!user,
  })

  const toggleShare = useMutation({
    mutationFn: (progression: Progression) => put<Progression>(`/api/v1/progressions/${progression.id}`, { isPublic: !progression.isPublic }),
    onSuccess: async saved => {
      queryClient.invalidateQueries({ queryKey: ["progressions"] })
      if (!saved.isPublic) {
        setMessage(`"${saved.name}" vuelve a ser privada.`)
        return
      }
      const link = appUrl(`/explorer?p=${saved.id}`)
      try {
        await navigator.clipboard.writeText(link)
        setMessage(`Enlace copiado: ${link}`)
      } catch {
        setMessage(`Comparte este enlace: ${link}`)
      }
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/v1/progressions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progressions"] }),
  })

  return (
    <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Biblioteca</p>
      <h1 className="mt-2 text-[44px] leading-none">Mis progresiones</h1>
      <p className="mt-3 max-w-xl text-ink-mute">Todo lo que guardes desde el analizador o el explorador. Compártelo con un enlace o sigue trabajándolo.</p>

      <section className="mt-8">
        {!ready ? null : !accountsEnabled ? (
          <p className="rounded-xl border border-hairline bg-canvas p-6 text-ink-mute">Las cuentas aún no están activas en este servidor.</p>
        ) : !user ? (
          <div className="rounded-xl border border-hairline bg-canvas p-8 shadow-card">
            <h2 className="text-2xl">Tu biblioteca te espera</h2>
            <p className="mt-2 text-ink-mute">Crea una cuenta gratis para guardar progresiones y abrirlas desde cualquier dispositivo.</p>
            <button type="button" onClick={openDialog} className="mt-5 min-h-11 rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep">
              Crear cuenta o entrar
            </button>
          </div>
        ) : isLoading ? (
          <ul role="status" aria-label="Cargando progresiones" className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="h-24 animate-pulse rounded-xl bg-hairline/60" />
            ))}
          </ul>
        ) : error ? (
          <p className="rounded-xl border border-fn-dominant/30 bg-fn-dominant/10 p-5 text-fn-dominant">{(error as Error).message}</p>
        ) : data && data.total === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline bg-canvas p-8 text-center">
            <p className="text-ink-mute">Aún no has guardado nada.</p>
            <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-on-primary">
              Analizar una canción
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {data?.progressions.map(progression => (
              <li
                key={progression.id}
                className="flex flex-col gap-3 rounded-xl border border-hairline bg-canvas p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-display text-xl">{progression.name}</p>
                  <p className="mt-1 truncate font-mono text-sm text-ink-mute">{progression.chords.join("  ")}</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    {progression.tonality ? `Tonalidad ${progression.tonality} · ` : ""}
                    {progression.isPublic ? "Pública" : "Privada"} · {new Date(progression.updatedAt).toLocaleDateString("es")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/explorer?p=${progression.id}`}
                    className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-bold text-on-primary"
                  >
                    Abrir
                  </Link>
                  <Link
                    href={`/?chords=${encodeURIComponent(progression.chords.join(","))}${progression.tonality ? `&key=${encodeURIComponent(progression.tonality)}` : ""}`}
                    className="inline-flex min-h-10 items-center rounded-md border border-hairline px-4 text-sm font-semibold hover:border-ink"
                  >
                    Analizar
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleShare.mutate(progression)}
                    className="min-h-10 rounded-md border border-hairline px-4 text-sm font-semibold hover:border-ink"
                  >
                    {progression.isPublic ? "Hacer privada" : "Compartir"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(progression)}
                    className="min-h-10 rounded-md border border-hairline px-4 text-sm font-semibold text-fn-dominant hover:border-fn-dominant"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {message ? (
          <p role="status" className="mt-4 break-all text-sm text-fn-tonic">
            {message}
          </p>
        ) : null}
      </section>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`¿Eliminar "${pendingDelete?.name ?? ""}"?`}
        body={pendingDelete?.isPublic ? "El enlace público dejará de funcionar." : "No se puede deshacer."}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </main>
  )
}
