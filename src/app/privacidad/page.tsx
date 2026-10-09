import type { Metadata } from "next"
import Link from "next/link"

import LegalPage, { Contact } from "@/components/legal/LegalPage"
import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos guarda ChordWeaver, para qué los usa y cómo puedes borrarlos.",
  alternates: { canonical: absoluteUrl("/privacidad/") },
}

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad" updated="9 de octubre de 2026">
      <p>
        ChordWeaver es un analizador armónico en español: el sitio web, su API y la app móvil. Esta política explica qué datos recogemos, para qué y cómo puedes
        borrarlos. Puedes usar el analizador, el explorador, el mástil y el piano sin crear una cuenta.
      </p>

      <h2>Qué datos guardamos</h2>
      <ul>
        <li>
          <strong>Cuenta.</strong> Si te registras: tu correo, el nombre que elijas y, si entras con Google, tu foto de perfil. La contraseña la gestiona
          Firebase Authentication (Google); nosotros nunca la vemos.
        </li>
        <li>
          <strong>Progresiones guardadas.</strong> Nombre, acordes, tonalidad, si es pública y, si la analizaste desde un archivo, los primeros caracteres del
          texto de origen.
        </li>
        <li>
          <strong>Plan.</strong> Tu plan (Gratis, Pro o Vitalicio), su periodo y fechas. Cuando activemos los pagos, el procesador de pagos guardará tus datos
          de facturación; nosotros no guardamos números de tarjeta.
        </li>
        <li>
          <strong>Uso del sitio.</strong> Con Google Analytics (vía Firebase) medimos visitas y acciones como analizar, guardar o compartir, con datos del
          dispositivo y ubicación aproximada. No los usamos para publicidad personalizada.
        </li>
        <li>
          <strong>En tu navegador.</strong> Los estilos de banda que aprendes y algunas preferencias se guardan solo en tu dispositivo (almacenamiento local).
        </li>
      </ul>
      <p>Lo que analizas sin guardar (acordes pegados o archivos .txt) se procesa al momento y no se almacena.</p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Darte acceso a tu biblioteca desde cualquier dispositivo y mostrar las progresiones que decidas compartir.</li>
        <li>Aplicar los límites y beneficios de tu plan.</li>
        <li>Entender qué funciones se usan para mejorar el producto.</li>
        <li>Responder tus solicitudes de soporte.</li>
      </ul>
      <p>No vendemos ni alquilamos tus datos.</p>

      <h2>Con quién se comparten</h2>
      <p>Solo con los proveedores que hacen funcionar el servicio, que procesan los datos por cuenta nuestra:</p>
      <ul>
        <li>Google Firebase (autenticación, base de datos Firestore y Analytics).</li>
        <li>Vercel (servidor de la API) y GitHub Pages (sitio web).</li>
        <li>El procesador de pagos, cuando se active el cobro.</li>
      </ul>
      <p>Una progresión marcada como pública la puede ver cualquiera que tenga el enlace.</p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tengas la cuenta. Al eliminarla borramos tu perfil, tu plan y tus progresiones de inmediato; las copias de seguridad de los proveedores se
        renuevan en un máximo de 30 días. Los datos de analítica se conservan de forma agregada hasta 14 meses.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes ver y cambiar tus datos desde <Link href="/cuenta">Mi cuenta</Link>, descargar o borrar tus progresiones y{" "}
        <Link href="/eliminar-cuenta">eliminar tu cuenta</Link> cuando quieras. Para cualquier otra solicitud (acceso, corrección u oposición) escríbenos a{" "}
        <Contact />.
      </p>

      <h2>Menores</h2>
      <p>ChordWeaver no está dirigido a menores de 13 años. Si eres menor de esa edad, usa el sitio sin crear una cuenta o con ayuda de un adulto.</p>

      <h2>Cambios</h2>
      <p>Si cambiamos esta política de forma importante, lo avisaremos en el sitio antes de que entre en vigor.</p>
    </LegalPage>
  )
}
