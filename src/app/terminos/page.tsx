import type { Metadata } from "next"
import Link from "next/link"

import LegalPage, { Contact } from "@/components/legal/LegalPage"
import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Las condiciones para usar ChordWeaver, sus planes y su contenido.",
  alternates: { canonical: absoluteUrl("/terminos/") },
}

export default function TerminosPage() {
  return (
    <LegalPage title="Términos de uso" updated="9 de octubre de 2026">
      <p>Al usar ChordWeaver (el sitio web, la API y la app móvil) aceptas estos términos. Si no estás de acuerdo, no uses el servicio.</p>

      <h2>El servicio</h2>
      <p>
        ChordWeaver analiza progresiones de acordes y sugiere cómo continuarlas. Los análisis son orientativos: la teoría musical admite varias lecturas y el
        resultado no reemplaza el criterio de un músico o docente.
      </p>

      <h2>Tu cuenta</h2>
      <ul>
        <li>Eres responsable de lo que hagas con tu cuenta y de mantener tu contraseña segura.</li>
        <li>Debes tener al menos 13 años para crear una cuenta.</li>
        <li>
          Puedes eliminar tu cuenta cuando quieras desde <Link href="/cuenta">Mi cuenta</Link>.
        </li>
      </ul>

      <h2>Tu contenido</h2>
      <p>
        Las progresiones que guardas son tuyas. Nos das permiso para almacenarlas y mostrarlas a quien tú decidas (por ejemplo, al compartirlas con un enlace).
        Los acordes de una canción no suelen tener derechos de autor por sí solos, pero las letras sí: no subas ni compartas letras completas de canciones que
        no te pertenecen.
      </p>

      <h2>Uso aceptable</h2>
      <ul>
        <li>No intentes saturar, vulnerar ni extraer masivamente datos del servicio o de la API.</li>
        <li>No uses ChordWeaver para infringir derechos de terceros ni para actividades ilegales.</li>
      </ul>
      <p>Podemos suspender cuentas que incumplan estos términos.</p>

      <h2>Planes y pagos</h2>
      <ul>
        <li>
          El plan Gratis permite usar todas las herramientas de análisis y guardar hasta 5 progresiones. Los precios de Pro y Vitalicio están en{" "}
          <Link href="/precios">Precios</Link>.
        </li>
        <li>
          <strong>Modo de prueba:</strong> mientras los pagos no estén activos, los planes de pago se pueden activar sin costo. Avisaremos con antelación antes
          de empezar a cobrar y nadie será cobrado sin aceptar el pago de forma expresa.
        </li>
        <li>
          Las suscripciones se renuevan al final de cada periodo hasta que las canceles. Al cancelar conservas el plan hasta el final del periodo pagado y luego
          vuelves a Gratis sin perder tus progresiones.
        </li>
        <li>El plan Vitalicio da acceso a Pro mientras ChordWeaver siga en funcionamiento.</li>
      </ul>

      <h2>Disponibilidad y responsabilidad</h2>
      <p>
        Ofrecemos el servicio &quot;tal cual&quot; y trabajamos para que esté disponible, pero puede haber interrupciones o errores. En la medida que permita la
        ley, no somos responsables de daños indirectos derivados del uso del servicio.
      </p>

      <h2>Cambios</h2>
      <p>Podemos actualizar estos términos. Si el cambio es importante, lo avisaremos en el sitio antes de que entre en vigor.</p>

      <h2>Contacto</h2>
      <p>
        Escríbenos a <Contact />. Estos términos se rigen por las leyes de la República de Guatemala.
      </p>
    </LegalPage>
  )
}
