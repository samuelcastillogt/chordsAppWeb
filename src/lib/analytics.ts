import { getApp, getApps, initializeApp } from "firebase/app"
import type { Analytics } from "firebase/analytics"

import { env, isFirebaseConfigured } from "@/lib/env"

/**
 * Product events, sent to Google Analytics 4 through Firebase Analytics (the stream of
 * NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID). Without a measurement ID every call is a no-op.
 */
export type AnalyticsEvent =
  | "analyze"
  | "save"
  | "share"
  | "sign_up"
  | "login"
  | "pro_click"
  | "begin_checkout"
  | "purchase"
  | "plan_limit_reached"
  | "cancel_subscription"
  | "delete_account"
  | "feedback"

type Params = Record<string, string | number | boolean | undefined>

let analytics: Promise<Analytics | null> | null = null

function load(): Promise<Analytics | null> {
  if (analytics) return analytics
  analytics = (async () => {
    if (typeof window === "undefined" || !isFirebaseConfigured || !env.firebase.measurementId) return null
    const { getAnalytics, isSupported } = await import("firebase/analytics")
    if (!(await isSupported())) return null
    const app = getApps().length ? getApp() : initializeApp(env.firebase)
    return getAnalytics(app)
  })().catch(() => null)
  return analytics
}

export function track(event: AnalyticsEvent, params?: Params) {
  void load().then(async instance => {
    if (!instance) return
    const { logEvent } = await import("firebase/analytics")
    logEvent(instance, event as string, params)
  })
}

/** Starts analytics on page load so page views are counted even before the first event. */
export function initAnalytics() {
  void load()
}
