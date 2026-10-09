"use client"

import Link from "next/link"
import { useEffect } from "react"

import { track } from "@/lib/analytics"

/** Shown when a save is refused because the Gratis plan is full. */
export default function PlanLimitNotice({ message, placement }: { message: string; placement: string }) {
  useEffect(() => track("plan_limit_reached", { placement }), [placement])
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-lg border border-surface-violet-soft bg-surface-violet-soft/15 p-3 text-sm text-ink">
      <p>{message}</p>
      <Link
        href="/precios"
        onClick={() => track("pro_click", { placement: `limit:${placement}` })}
        className="inline-flex min-h-10 w-fit items-center rounded-md bg-primary px-4 font-bold text-on-primary hover:bg-primary-deep"
      >
        Ver planes
      </Link>
    </div>
  )
}
