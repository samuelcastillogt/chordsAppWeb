import { ApiError } from "@/lib/api"
import { Plan, Price, PricePeriod, PriceRegion } from "@/types"

/** The API answers 402 when the Gratis plan reaches its saved-progressions limit. */
export function isPlanLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 402
}

// Countries that get the Latin American price, guessed from the browser's time zone. US, Canada
// and Spain keep the global price; the processor will check the real billing country later.
const LATAM_ZONE =
  /^America\/(?!New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana|Kentucky|North_Dakota|Juneau|Sitka|Nome|Adak|Metlakatla|Yakutat|Menominee|Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Glace_Bay|Goose_Bay|Whitehorse|Dawson|Iqaluit|Rankin_Inlet|Resolute|Cambridge_Bay|Inuvik|Atikokan|Creston|Fort_Nelson|Dawson_Creek|Swift_Current|Rainy_River|Thunder_Bay|Nipigon|Pangnirtung|Yellowknife|Godthab|Nuuk|Danmarkshavn|Scoresbysund|Thule)/

export function detectRegion(): PriceRegion {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""
    return LATAM_ZONE.test(zone) ? "latam" : "global"
  } catch {
    return "global"
  }
}

/** The plan's price for a period in a region, falling back to the global price. */
export function priceFor(plan: Plan, period: PricePeriod, region: PriceRegion): Price | null {
  const matches = plan.prices.filter(price => price.period === period)
  return matches.find(price => price.region === region) ?? matches.find(price => price.region === "global") ?? null
}

export function formatPrice(amount: number): string {
  // Latin American Spanish writes "$19.99"; the pricing page states that prices are in USD.
  return new Intl.NumberFormat("es-419", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: amount % 1 ? 2 : 0,
  }).format(amount)
}

export const PERIOD_LABEL: Record<PricePeriod, string> = { monthly: "al mes", yearly: "al año", once: "un solo pago" }
