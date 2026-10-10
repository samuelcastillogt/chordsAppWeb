import type { Metadata } from "next"

import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Mis progresiones",
  description: "Tu biblioteca de progresiones guardadas en ChordWeaver.",
  alternates: { canonical: absoluteUrl("/progressions/") },
  openGraph: {
    title: "Mis progresiones · ChordWeaver",
    description: "Tu biblioteca de progresiones guardadas en ChordWeaver.",
    url: absoluteUrl("/progressions/"),
  },
  robots: { index: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
