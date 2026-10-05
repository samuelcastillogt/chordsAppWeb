"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { get, getStoredToken, post, storeToken } from "@/lib/api"
import { TokenResponse, User } from "@/types"

type AuthContextValue = {
  user: User | null
  ready: boolean
  accountsEnabled: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName?: string) => Promise<void>
  logout: () => void
  dialogOpen: boolean
  openDialog: () => void
  closeDialog: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [accountsEnabled, setAccountsEnabled] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        const health = await get<{ accounts?: boolean }>("/health")
        if (!cancelled) setAccountsEnabled(health.accounts !== false)
      } catch {
        // API offline: pages show their own connection errors.
      }
      if (getStoredToken()) {
        try {
          const me = await get<User>("/api/v1/auth/me")
          if (!cancelled) setUser(me)
        } catch {
          storeToken(null)
        }
      }
      if (!cancelled) setReady(true)
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const handleToken = useCallback(
    (response: TokenResponse) => {
      storeToken(response.accessToken)
      setUser(response.user)
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ["progressions"] })
    },
    [queryClient],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      accountsEnabled,
      login: async (email, password) => handleToken(await post<TokenResponse>("/api/v1/auth/login", { email, password })),
      register: async (email, password, displayName) =>
        handleToken(await post<TokenResponse>("/api/v1/auth/register", { email, password, displayName: displayName || null })),
      logout: () => {
        storeToken(null)
        setUser(null)
        queryClient.removeQueries({ queryKey: ["progressions"] })
      },
      dialogOpen,
      openDialog: () => setDialogOpen(true),
      closeDialog: () => setDialogOpen(false),
    }),
    [user, ready, accountsEnabled, dialogOpen, handleToken, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
