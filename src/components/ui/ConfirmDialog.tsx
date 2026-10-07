"use client"

import { useEffect, useRef } from "react"

type Props = {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Native <dialog> confirmation for destructive actions (replaces window.confirm). */
export default function ConfirmDialog({ open, title, body, confirmLabel = "Eliminar", onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onCancel={event => {
        event.preventDefault()
        onCancel()
      }}
      aria-labelledby="confirm-title"
      className="w-[min(92vw,420px)] rounded-xl border border-hairline bg-canvas p-0 text-ink shadow-2xl backdrop:bg-primary/60"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-2xl">
          {title}
        </h2>
        {body ? <p className="mt-2 text-sm leading-6 text-ink-mute">{body}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} autoFocus className="min-h-11 rounded-md border border-hairline px-4 font-semibold hover:border-ink">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="min-h-11 rounded-md bg-fn-dominant px-4 font-bold text-on-primary hover:brightness-110">
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
