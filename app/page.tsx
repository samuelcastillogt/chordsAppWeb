import { Suspense } from "react"

import Analyzer from "@/components/Analyzer"

export default function Home() {
  return (
    <Suspense>
      <Analyzer />
    </Suspense>
  )
}
