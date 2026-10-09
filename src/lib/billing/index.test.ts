import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api"
import { Plan } from "@/types"
import { isPlanLimitError, priceFor } from "./index"

const pro: Plan = {
  id: "pro",
  name: "Pro",
  tagline: "",
  saveLimit: null,
  features: [],
  prices: [
    { period: "monthly", amount: 4.99, currency: "USD", region: "global" },
    { period: "yearly", amount: 29.99, currency: "USD", region: "global" },
    { period: "yearly", amount: 19.99, currency: "USD", region: "latam" },
  ],
}

describe("priceFor", () => {
  it("prefers the regional price and falls back to the global one", () => {
    expect(priceFor(pro, "yearly", "latam")?.amount).toBe(19.99)
    expect(priceFor(pro, "yearly", "global")?.amount).toBe(29.99)
    expect(priceFor(pro, "monthly", "latam")?.amount).toBe(4.99)
    expect(priceFor(pro, "once", "global")).toBeNull()
  })
})

describe("isPlanLimitError", () => {
  it("recognises the 402 answer of the API", () => {
    expect(isPlanLimitError(new ApiError("límite", 402))).toBe(true)
    expect(isPlanLimitError(new ApiError("otro", 400))).toBe(false)
    expect(isPlanLimitError(new Error("x"))).toBe(false)
  })
})
