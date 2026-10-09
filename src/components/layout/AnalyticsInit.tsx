"use client"

import { useEffect } from "react"

import { initAnalytics } from "@/lib/analytics"

/** Loads Google Analytics after hydration (page views are recorded automatically). */
export default function AnalyticsInit() {
  useEffect(() => initAnalytics(), [])
  return null
}
