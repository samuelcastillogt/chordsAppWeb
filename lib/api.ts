const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function buildUrl(path: string, params?: Record<string, string | number>) {
  const url = new URL(`${BASE_URL}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  return url.toString()
}

async function request<T>(path: string, init?: RequestInit, params?: Record<string, string | number>): Promise<T> {
  let res: Response
  try {
    res = await fetch(buildUrl(path, params), {
      headers: { "Content-Type": "application/json", ...init?.headers },
      ...init,
    })
  } catch {
    throw new Error(`No se pudo conectar con la API en ${BASE_URL}`)
  }
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `Error de API: ${res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
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
