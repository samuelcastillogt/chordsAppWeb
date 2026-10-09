import type { Metadata } from "next"

import Pricing from "@/components/billing/Pricing"
import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Precios: Gratis, Pro y Vitalicio",
  description:
    "ChordWeaver es gratis para analizar canciones. Pro guarda progresiones sin límite desde USD 4,99 al mes, con precio especial para Latinoamérica.",
  alternates: { canonical: absoluteUrl("/precios/") },
}

export default function PreciosPage() {
  return <Pricing />
}
