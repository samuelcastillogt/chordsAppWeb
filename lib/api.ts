const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "")
const TOKEN_KEY = "chordweaver-token"

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export function getStoredToken(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private mode or blocked storage: the session simply won't persist.
  }
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value))
    })
  }
  return url.toString()
}

async function readError(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const body = JSON.parse(text)
    if (typeof body.detail === "string") return body.detail
    if (Array.isArray(body.detail)) return body.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(". ")
  } catch {
    // Not JSON: fall through to the raw text.
  }
  return text || res.statusText
}

async function request<T>(path: string, init?: RequestInit, params?: Record<string, string | number | undefined>): Promise<T> {
  const token = getStoredToken()
  let res: Response
  try {
    res = await fetch(buildUrl(path, params), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(`No se pudo conectar con la API en ${BASE_URL}`, 0)
  }
  if (!res.ok) throw new ApiError(await readError(res), res.status)
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  return request<T>(path, undefined, params)
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) })
}

export async function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) })
}

export async function del(path: string): Promise<void> {
  return request<void>(path, { method: "DELETE" })
}

export function getApiBaseUrl() {
  return BASE_URL
}

/** Absolute URL of a page in this app, including the GitHub Pages base path. */
export function appUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
  return `${window.location.origin}${basePath}${path}`
}
