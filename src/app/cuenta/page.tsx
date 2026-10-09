import type { Metadata } from "next"

import Account from "@/components/billing/Account"

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } }

export default function CuentaPage() {
  return <Account />
}
