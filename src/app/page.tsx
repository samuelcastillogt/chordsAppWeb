import { Suspense } from "react"

import Analyzer from "@/components/analyzer/Analyzer"

export default function Home() {
  return (
    <Suspense>
      <Analyzer />
    </Suspense>
  )
}
