/** Spanish messages for the Firebase Auth errors users can actually run into. */
const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/wrong-password": "Email o contraseña incorrectos.",
  "auth/user-not-found": "Email o contraseña incorrectos.",
  "auth/invalid-email": "Ese email no es válido.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email. Inicia sesión o recupera tu contraseña.",
  "auth/weak-password": "La contraseña es muy débil: usa al menos 8 caracteres.",
  "auth/missing-password": "Escribe tu contraseña.",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  "auth/network-request-failed": "Sin conexión con Firebase. Revisa tu internet.",
  "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.",
  "auth/account-exists-with-different-credential": "Ya tienes una cuenta con ese email usando otro método. Entra con email y contraseña.",
  "auth/operation-not-allowed": "Ese método de inicio de sesión no está activado en Firebase.",
  "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains).",
  "auth/user-disabled": "Esta cuenta está deshabilitada.",
}

/** Closing the Google popup is a choice, not an error worth showing. */
const SILENT = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"])

export function authErrorCode(error: unknown): string | null {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null
}

/** Message to show for an auth error, or null when nothing should be shown. */
export function authErrorMessage(error: unknown): string | null {
  const code = authErrorCode(error)
  if (code && SILENT.has(code)) return null
  if (code && MESSAGES[code]) return MESSAGES[code]
  return error instanceof Error && error.message ? error.message : "No se pudo completar. Inténtalo de nuevo."
}
