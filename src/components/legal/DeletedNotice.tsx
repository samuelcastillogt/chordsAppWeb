"use client"

import { useSearchParams } from "next/navigation"

/** Confirmation shown after the account page deletes the account and lands here. */
export default function DeletedNotice() {
  const deleted = useSearchParams().get("eliminada") === "1"
  if (!deleted) return null
  return (
    <p role="status" className="rounded-lg border border-fn-tonic/40 bg-fn-tonic/10 p-4 font-semibold text-fn-tonic">
      Tu cuenta y tus datos se eliminaron. Gracias por haber probado ChordWeaver.
    </p>
  )
}
