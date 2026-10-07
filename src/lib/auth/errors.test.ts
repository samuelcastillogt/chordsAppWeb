import { describe, expect, it } from "vitest"

import { authErrorCode, authErrorMessage } from "@/lib/auth/errors"

const firebaseError = (code: string) => Object.assign(new Error(`Firebase: Error (${code}).`), { code })

describe("auth error messages", () => {
  it("translates the errors users run into", () => {
    expect(authErrorMessage(firebaseError("auth/invalid-credential"))).toBe("Email o contraseña incorrectos.")
    expect(authErrorMessage(firebaseError("auth/email-already-in-use"))).toMatch(/Ya existe una cuenta/)
    expect(authErrorMessage(firebaseError("auth/unauthorized-domain"))).toMatch(/Authorized domains/)
  })

  it("stays silent when the user closes the Google popup", () => {
    expect(authErrorMessage(firebaseError("auth/popup-closed-by-user"))).toBeNull()
  })

  it("falls back to the error text or a generic message", () => {
    expect(authErrorMessage(new Error("La API no responde"))).toBe("La API no responde")
    expect(authErrorMessage("boom")).toMatch(/No se pudo completar/)
    expect(authErrorCode({ code: 42 })).toBeNull()
  })
})
