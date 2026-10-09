import { getApiBaseUrl } from "@/lib/api"
import { Progression } from "@/types"

/**
 * Link to share a public progression. It points to the API's /p/{id} page, which carries the
 * preview (name and chords) that WhatsApp and social apps read, then opens the explorer.
 */
export function shareUrl(progression: Pick<Progression, "id">): string {
  return `${getApiBaseUrl()}/p/${encodeURIComponent(progression.id)}`
}

export function whatsappUrl(progression: Pick<Progression, "id" | "name" | "chords">): string {
  const text = `${progression.name}: ${progression.chords.join(" – ")}\nEscúchala y mira por qué funciona en ChordWeaver: ${shareUrl(progression)}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
