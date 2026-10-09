import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import DeletedNotice from "@/components/legal/DeletedNotice"
import LegalPage, { Contact } from "@/components/legal/LegalPage"
import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Eliminar tu cuenta",
  description: "Cómo eliminar tu cuenta de ChordWeaver y qué datos se borran.",
  alternates: { canonical: absoluteUrl("/eliminar-cuenta/") },
}

export default function EliminarCuentaPage() {
  return (
    <LegalPage title="Eliminar tu cuenta" updated="9 de octubre de 2026">
      <Suspense>
        <DeletedNotice />
      </Suspense>

      <h2>Desde la web</h2>
      <ol className="list-decimal pl-6">
        <li>
          Entra a <Link href="/cuenta">Mi cuenta</Link> con tu correo o con Google.
        </li>
        <li>Pulsa «Eliminar mi cuenta» y confirma.</li>
        <li>Por seguridad, si iniciaste sesión hace más de unos minutos te pediremos entrar de nuevo antes de borrarla.</li>
      </ol>

      <h2>Desde la app móvil</h2>
      <p>
        La app usa la misma cuenta. Abre esta página o <Link href="/cuenta">Mi cuenta</Link> en el navegador del teléfono y sigue los mismos pasos.
      </p>

      <h2>Si no puedes entrar</h2>
      <p>
        Escríbenos a <Contact /> desde el correo de la cuenta con el asunto «Eliminar mi cuenta». La borramos en un máximo de 7 días y te confirmamos por
        correo.
      </p>

      <h2>Qué se borra</h2>
      <ul>
        <li>Tu acceso (correo, nombre y foto) en Firebase Authentication.</li>
        <li>Tu perfil y tu plan.</li>
        <li>Todas tus progresiones, incluidas las públicas: sus enlaces dejan de funcionar.</li>
      </ul>
      <p>
        El borrado es inmediato y no se puede deshacer. Las copias de seguridad de los proveedores se renuevan en un máximo de 30 días. Los datos de analítica
        que no te identifican se conservan de forma agregada. Si tenías una suscripción pagada, cancélala antes para que no se renueve.
      </p>
    </LegalPage>
  )
}
