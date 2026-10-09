/**
 * Public configuration, read once from NEXT_PUBLIC_* variables (inlined at build time).
 * Every variable is documented in `.env.example`.
 *
 * Each variable must be read with its literal name (`process.env.NEXT_PUBLIC_X`): Next.js only
 * inlines static references, so `process.env[name]` would be undefined in the browser.
 */

const DEFAULT_API_URL = "https://chords-api-python.vercel.app"

export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, ""),
  /** Prefix the app is served under (GitHub Pages sets it), used to build absolute links. */
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
  },
  /** Public URL of the deployed site (canonical links, sitemap, social previews). */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://samuelcastillogt.github.io/chordsAppWeb").replace(/\/$/, ""),
  /** Address for privacy, terms and account requests; empty shows the GitHub issues link instead. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  /** Content of Search Console's HTML-tag verification (google-site-verification). */
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "",
  /** host:port of the Firebase Auth emulator (e.g. "127.0.0.1:9099"); empty in production. */
  firebaseAuthEmulatorHost: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "",
} as const

/** Accounts need the four required Firebase web settings; without them the app runs signed-out. */
export const isFirebaseConfigured = Boolean(env.firebase.apiKey && env.firebase.authDomain && env.firebase.projectId && env.firebase.appId)
