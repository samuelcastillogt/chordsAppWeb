"use client"

import { useEffect } from "react"

import { env } from "@/lib/env"

/**
 * Browser error monitoring with Sentry, loaded only when NEXT_PUBLIC_SENTRY_DSN is set.
 * Visiting any page with ?probar-monitoreo=1 sends a test message to check the setup.
 */
export default function Monitoring() {
  useEffect(() => {
    if (!env.sentryDsn) return
    let cancelled = false
    void import("@sentry/browser").then(Sentry => {
      if (cancelled) return
      Sentry.init({ dsn: env.sentryDsn, environment: process.env.NODE_ENV, sendDefaultPii: false, tracesSampleRate: 0 })
      if (new URLSearchParams(window.location.search).has("probar-monitoreo")) {
        Sentry.captureMessage("Prueba de monitoreo de ChordWeaver web")
      }
    })
    return () => {
      cancelled = true
    }
  }, [])
  return null
}
