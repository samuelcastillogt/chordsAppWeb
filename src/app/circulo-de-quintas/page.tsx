import type { Metadata } from "next"
import Link from "next/link"

import CircleOfFifths from "@/components/learn/CircleOfFifths"
import LearnArticle from "@/components/learn/LearnArticle"
import { absoluteUrl } from "@/lib/site"

const TITLE = "Círculo de quintas interactivo"
const LEAD = "Toca una tonalidad y mira sus acordes, su relativa menor y sus vecinas. Escucha la cadencia I–IV–V–I en cualquier tono."

export const metadata: Metadata = {
  title: "Círculo de quintas interactivo: qué es y cómo usarlo",
  description:
    "Aprende el círculo de quintas tocándolo: tonalidades mayores y menores, armaduras, acordes de cada tono y por qué unas tonalidades suenan cerca de otras.",
  alternates: { canonical: absoluteUrl("/circulo-de-quintas/") },
  openGraph: { title: TITLE, description: LEAD, url: absoluteUrl("/circulo-de-quintas/") },
}

const FAQ = [
  {
    q: "¿Para qué sirve el círculo de quintas?",
    a: "Para saber qué acordes pertenecen a una tonalidad, cuántos sostenidos o bemoles tiene y qué tonalidades están cerca para modular o cambiar de tono sin que suene brusco.",
  },
  {
    q: "¿Cómo encuentro la relativa menor?",
    a: "Está en el mismo lugar del círculo, en el anillo interior: baja tres semitonos desde la tónica mayor. La relativa de Do mayor es La menor; la de Sol mayor, Mi menor.",
  },
  {
    q: "¿Por qué Fa# y Sol♭ aparecen juntas?",
    a: "Porque suenan igual en la guitarra y el piano: son la misma tonalidad escrita con 6 sostenidos o con 6 bemoles. En ese punto el círculo se cierra.",
  },
]

export default function CirculoDeQuintasPage() {
  return (
    <LearnArticle path="/circulo-de-quintas/" eyebrow="Teoría práctica" title={TITLE} lead={LEAD} tool={<CircleOfFifths />} faq={FAQ}>
      <h2>Qué es el círculo de quintas</h2>
      <p>
        Es un mapa de las doce tonalidades mayores ordenadas por quintas: si avanzas en el sentido del reloj, cada tonalidad está una quinta justa (siete
        semitonos) por encima de la anterior: Do, Sol, Re, La, Mi… Con cada paso se agrega un sostenido a la armadura. En el sentido contrario se avanza por
        cuartas y se agregan bemoles: Fa, Si♭, Mi♭… Después de doce pasos vuelves a Do.
      </p>
      <h2>Cómo leerlo para tocar</h2>
      <p>
        Cada tonalidad mayor tiene seis acordes que se usan casi siempre: el I, el IV y el V son mayores; el ii, el iii y el vi son menores (el vii° es
        disminuido y aparece menos). Lo útil del círculo es que <strong>esos acordes están juntos</strong>: la tónica, sus dos vecinas (el IV a la izquierda y
        el V a la derecha) y, en el anillo interior, las tres menores que quedan debajo. Si tocas en Sol, tus acordes son Sol, Do y Re por fuera, y Mim, Lam y
        Sim por dentro.
      </p>
      <p>
        Por eso el círculo sirve para sacar canciones de oído: si una canción está en Re y suena un acorde mayor nuevo, lo más probable es que sea Sol o La, sus
        vecinos.
      </p>
      <h2>Vecinas, relativas y modulaciones</h2>
      <p>
        Dos tonalidades vecinas comparten seis de sus siete notas, así que pasar de una a otra suena natural. Las que están en lados opuestos (Do y Fa#, por
        ejemplo) comparten muy pocas, y saltar entre ellas suena sorpresivo. La relativa menor comparte <em>todas</em> las notas con su mayor: Do mayor y La
        menor usan las mismas siete notas, pero cada una gira alrededor de un centro distinto.
      </p>
      <h2>El círculo en las sugerencias de ChordWeaver</h2>
      <p>
        El motor de ChordWeaver mide la distancia en el círculo entre dos acordes como uno de sus siete criterios: cuanto más cerca, más natural suena el
        cambio. Lo puedes ver en acción en el <Link href="/explorer">explorador</Link>, que te propone qué acorde puede seguir, o pegando los acordes de una
        canción en el <Link href="/">analizador</Link>.
      </p>
    </LearnArticle>
  )
}
