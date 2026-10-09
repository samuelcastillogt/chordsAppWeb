"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  GoogleAuthProvider,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  deleteUser,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth"

import { track } from "@/lib/analytics"
import { ApiError, del, get, patch, setTokenProvider } from "@/lib/api"
import { getFirebaseAuth } from "@/lib/auth/firebase"
import { isFirebaseConfigured } from "@/lib/env"
import { User } from "@/types"

type AuthContextValue = {
  /** The API user, present once Firebase signed in and the API accepted the token. */
  user: User | null
  /** Firebase finished restoring the session (whether or not someone is signed in). */
  ready: boolean
  /** Someone is signed in to Firebase, even if the API has not accepted the session yet. */
  signedIn: boolean
  /** Firebase is configured here and the API has accounts enabled. */
  accountsEnabled: boolean
  emailVerified: boolean
  /** Why a Firebase session could not be used by the API (e.g. an unverified email to link). */
  sessionProblem: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resendVerification: () => Promise<void>
  /** Re-reads the Firebase account (after verifying the email) and retries with the API. */
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
  /** Re-reads the API user (e.g. after the plan changed). */
  reloadUser: () => Promise<void>
  /**
   * Deletes the user's data in the API and the Firebase account. Firebase only allows it right
   * after signing in, so an older session gets `RecentLoginRequiredError` before anything is deleted.
   */
  deleteAccount: () => Promise<void>
  dialogOpen: boolean
  openDialog: () => void
  closeDialog: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Firebase deletes an account only within a few minutes of signing in. */
const RECENT_LOGIN_MS = 4 * 60 * 1000

export class RecentLoginRequiredError extends Error {
  constructor() {
    super("Por seguridad, vuelve a iniciar sesión y luego elimina la cuenta.")
  }
}

function requireAuth() {
  const auth = getFirebaseAuth()
  if (!auth) throw new Error("Las cuentas no están configuradas en esta versión de la app.")
  return auth
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!isFirebaseConfigured)
  const [apiAccounts, setApiAccounts] = useState(true)
  const [sessionProblem, setSessionProblem] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    get<{ accounts?: boolean }>("/health")
      .then(health => setApiAccounts(health.accounts !== false))
      .catch(() => undefined) // API offline: pages show their own connection errors.
  }, [])

  /** Asks the API for the user behind the current Firebase session (it creates it the first time). */
  const syncWithApi = useCallback(async (current: FirebaseUser | null) => {
    if (!current) {
      setUser(null)
      setSessionProblem(null)
      return
    }
    try {
      setUser(await get<User>("/api/v1/auth/me"))
      setSessionProblem(null)
    } catch (error) {
      setUser(null)
      setSessionProblem(error instanceof ApiError && error.status === 403 ? error.message : null)
    }
  }, [])

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) return
    setTokenProvider(async forceRefresh => (auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null))
    // Fires on sign-in, sign-out and token refresh; only identity changes need the API.
    let lastUid: string | null | undefined
    const unsubscribe = onIdTokenChanged(auth, async current => {
      setFirebaseUser(current)
      if (current?.uid !== lastUid) {
        lastUid = current?.uid ?? null
        await syncWithApi(current)
        queryClient.invalidateQueries({ queryKey: ["progressions"] })
      }
      setReady(true)
    })
    return () => {
      unsubscribe()
      setTokenProvider(null)
    }
  }, [queryClient, syncWithApi])

  const finishSignIn = useCallback(() => setDialogOpen(false), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      accountsEnabled: isFirebaseConfigured && apiAccounts,
      signedIn: firebaseUser !== null,
      emailVerified: firebaseUser?.emailVerified ?? false,
      sessionProblem,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(requireAuth(), email.trim(), password)
        track("login", { method: "password" })
        finishSignIn()
      },
      signUp: async (email, password, displayName) => {
        const auth = requireAuth()
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
        track("sign_up", { method: "password" })
        const name = displayName?.trim()
        if (name) {
          await updateProfile(credential.user, { displayName: name })
          // The sign-in event may have created the API user without a name: set it, then re-read.
          await patch<User>("/api/v1/auth/me", { displayName: name })
          await syncWithApi(credential.user)
        }
        await sendEmailVerification(credential.user)
      },
      signInWithGoogle: async () => {
        const result = await signInWithPopup(requireAuth(), new GoogleAuthProvider())
        const created = result.user.metadata.creationTime === result.user.metadata.lastSignInTime
        track(created ? "sign_up" : "login", { method: "google" })
        finishSignIn()
      },
      resetPassword: async email => {
        await sendPasswordResetEmail(requireAuth(), email.trim())
      },
      resendVerification: async () => {
        const current = requireAuth().currentUser
        if (current) await sendEmailVerification(current)
      },
      refreshSession: async () => {
        const current = requireAuth().currentUser
        if (!current) return
        await current.reload()
        await current.getIdToken(true)
        setFirebaseUser(requireAuth().currentUser)
        await syncWithApi(current)
      },
      logout: async () => {
        await signOut(requireAuth())
        queryClient.removeQueries({ queryKey: ["progressions"] })
        queryClient.removeQueries({ queryKey: ["subscription"] })
      },
      reloadUser: async () => {
        await syncWithApi(requireAuth().currentUser)
      },
      deleteAccount: async () => {
        const auth = requireAuth()
        const current = auth.currentUser
        if (!current) return
        const lastSignIn = Date.parse(current.metadata.lastSignInTime ?? "")
        if (!lastSignIn || Date.now() - lastSignIn > RECENT_LOGIN_MS) throw new RecentLoginRequiredError()
        await del("/api/v1/auth/me")
        await deleteUser(current)
        track("delete_account")
        queryClient.clear()
      },
      dialogOpen,
      openDialog: () => setDialogOpen(true),
      closeDialog: () => setDialogOpen(false),
    }),
    [user, ready, apiAccounts, firebaseUser, sessionProblem, dialogOpen, finishSignIn, syncWithApi, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
