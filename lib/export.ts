export function slugify(title: string, fallback = "chordweaver") {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return slug || fallback
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const FONT_FALLBACKS: Record<string, string> = {
  "--font-mono": "'JetBrains Mono', ui-monospace, monospace",
  "--font-display": "Fraunces, Georgia, serif",
  "--font-ui": "Inter, system-ui, sans-serif",
}

/**
 * Serialises an on-screen SVG into a standalone file: explicit size, paper background
 * and CSS font variables replaced by real font stacks (they don't resolve outside the page).
 */
export function serializeSvg(svg: SVGSVGElement, background = "#fffdf8"): { markup: string; width: number; height: number } {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const viewBox = svg.viewBox.baseVal
  const width = viewBox?.width || svg.clientWidth || 600
  const height = viewBox?.height || svg.clientHeight || 600
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))
  clone.setAttribute("font-family", FONT_FALLBACKS["--font-ui"])
  clone.removeAttribute("class")
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
  rect.setAttribute("x", String(viewBox?.x ?? 0))
  rect.setAttribute("y", String(viewBox?.y ?? 0))
  rect.setAttribute("width", "100%")
  rect.setAttribute("height", "100%")
  rect.setAttribute("fill", background)
  clone.insertBefore(rect, clone.firstChild)
  const markup = new XMLSerializer()
    .serializeToString(clone)
    .replace(/var\((--font-[a-z]+)\)/g, (_, name: string) => FONT_FALLBACKS[name] ?? FONT_FALLBACKS["--font-ui"])
  return { markup, width, height }
}

export function downloadSvg(svg: SVGSVGElement, title: string) {
  const { markup } = serializeSvg(svg)
  downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), `${slugify(title)}.svg`)
}

export function downloadSvgAsPng(svg: SVGSVGElement, title: string, scale = 2) {
  const { markup, width, height } = serializeSvg(svg)
  const image = new Image()
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }))
  image.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = width * scale
    canvas.height = height * scale
    const context = canvas.getContext("2d")
    URL.revokeObjectURL(url)
    if (!context) return
    context.scale(scale, scale)
    context.drawImage(image, 0, 0, width, height)
    canvas.toBlob(blob => blob && downloadBlob(blob, `${slugify(title)}.png`), "image/png")
  }
  image.onerror = () => URL.revokeObjectURL(url)
  image.src = url
}
