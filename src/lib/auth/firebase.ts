import { getApp, getApps, initializeApp } from "firebase/app"
import { Auth, browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from "firebase/auth"

import { env, isFirebaseConfigured } from "@/lib/env"

let auth: Auth | null = null

/** The Firebase Auth instance, or null when Firebase is not configured or during prerendering. */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured || typeof window === "undefined") return null
  if (auth) return auth

  const app = getApps().length ? getApp() : initializeApp(env.firebase)
  auth = getAuth(app)
  auth.languageCode = "es"
  void setPersistence(auth, browserLocalPersistence)
  if (env.firebaseAuthEmulatorHost) {
    connectAuthEmulator(auth, `http://${env.firebaseAuthEmulatorHost}`, { disableWarnings: true })
  }
  return auth
}
