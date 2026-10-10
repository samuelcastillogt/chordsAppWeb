import type { Metadata } from "next"
import Link from "next/link"

import LearnArticle from "@/components/learn/LearnArticle"
import PopProgression from "@/components/learn/PopProgression"
import { absoluteUrl } from "@/lib/site"

const TITLE = "La progresión I–V–vi–IV"
const LEAD = "Los cuatro acordes más usados del pop, en cualquier tonalidad. Escúchalos, cambia el orden y descubre por qué funcionan."

export const metadata: Metadata = {
  title: "Progresión I–V–vi–IV: los cuatro acordes del pop en todos los tonos",
  description:
    "Qué es la progresión I–V–vi–IV (Do–Sol–Lam–Fa), por qué suena tan bien, sus variantes vi–IV–I–V e I–vi–IV–V y cómo tocarla en cualquier tonalidad.",
  alternates: { canonical: absoluteUrl("/progresion-i-v-vi-iv/") },
  openGraph: { title: TITLE, description: LEAD, url: absoluteUrl("/progresion-i-v-vi-iv/") },
}

const FAQ = [
  {
    q: "¿Qué canciones usan I–V–vi–IV?",
    a: "Muchísimas. Por ejemplo, la estrofa de «Let It Be» (Do–Sol–Lam–Fa), «No Woman, No Cry» (Do–Sol–Lam–Fa), «With or Without You» (Re–La–Sim–Sol) y «Someone Like You» (La–Mi–Fa#m–Re).",
  },
  {
    q: "¿Cómo la toco en mi tonalidad?",
    a: "Elige la tónica arriba y la herramienta te da los cuatro acordes. En guitarra, las tonalidades más cómodas sin cejilla son Do (C–G–Am–F, con Fa con cejilla), Sol (G–D–Em–C) y Re (D–A–Bm–G).",
  },
  {
    q: "¿Es lo mismo que vi–IV–I–V?",
    a: "Son los mismos cuatro acordes empezando en otro punto. Al empezar en el vi, la progresión suena más melancólica porque arranca en un acorde menor.",
  },
]

export default function ProgresionPopPage() {
  return (
    <LearnArticle path="/progresion-i-v-vi-iv/" eyebrow="Progresiones famosas" title={TITLE} lead={LEAD} tool={<PopProgression />} faq={FAQ}>
      <h2>Qué significan los números</h2>
      <p>
        Los números romanos indican el grado de cada acorde dentro de la tonalidad: el I es el acorde de la tónica, el V el de la quinta nota, el vi el de la
        sexta y el IV el de la cuarta. Las mayúsculas son acordes mayores y las minúsculas, menores. Así la misma progresión sirve en cualquier tono: en Do es
        Do–Sol–Lam–Fa; en Sol, Sol–Re–Mim–Do.
      </p>
      <h2>Por qué funciona tan bien</h2>
      <p>
        Recorre las tres funciones de la armonía con muy poco esfuerzo. El I es reposo; el V crea tensión y pide volver; el vi, en lugar de resolver, nos lleva
        a un lugar más emotivo (es la relativa menor del I y comparte dos de sus tres notas); y el IV abre el camino de regreso al I. Entre acordes vecinos casi
        todas las voces se mueven un paso o quedan quietas, por eso suena fluida.
      </p>
      <h2>Sus variantes</h2>
      <ul>
        <li>
          <strong>vi–IV–I–V</strong>: el mismo ciclo empezando en el acorde menor. Suena más melancólica; es muy común en baladas.
        </li>
        <li>
          <strong>I–vi–IV–V</strong>: la de los años cincuenta (conocida como progresión «doo-wop»). El V al final empuja con fuerza a volver al I.
        </li>
      </ul>
      <h2>Cómo hacerla tuya</h2>
      <p>
        Prueba sustituir un acorde por otro con la misma función: el IV por el ii (Rem en Do), o el V por un V7 para más tensión. El{" "}
        <Link href="/">analizador</Link> te sugiere sustituciones para cada acorde y el <Link href="/explorer">explorador</Link> te muestra qué más puede
        seguir. También puedes cambiar el ritmo armónico: dos compases en el I y uno en cada uno de los demás ya cambia el carácter.
      </p>
    </LearnArticle>
  )
}
