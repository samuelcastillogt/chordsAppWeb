import type { Metadata } from "next"
import Link from "next/link"

import KeyDetector from "@/components/learn/KeyDetector"
import LearnArticle from "@/components/learn/LearnArticle"
import { absoluteUrl } from "@/lib/site"

const TITLE = "Detector de tonalidad por acordes"
const LEAD = "Escribe los acordes de una canción, en cifrado americano o latino, y te decimos en qué tonalidad está y qué papel cumple cada acorde."

export const metadata: Metadata = {
  title: "Detector de tonalidad por acordes: ¿en qué tono está mi canción?",
  description:
    "Pega los acordes de una canción y descubre su tonalidad al instante, con los grados de cada acorde. Acepta cifrado americano (C, Am) y latino (DO, LAm).",
  alternates: { canonical: absoluteUrl("/detector-de-tonalidad/") },
  openGraph: { title: TITLE, description: LEAD, url: absoluteUrl("/detector-de-tonalidad/") },
}

const FAQ = [
  {
    q: "¿La tonalidad es el primer acorde de la canción?",
    a: "Muchas veces sí, pero no siempre. Hay canciones que empiezan en el IV o en el vi. El detector mira todos los acordes y cuáles pertenecen a cada tonalidad, no solo el primero.",
  },
  {
    q: "¿Cómo distingue entre una tonalidad mayor y su relativa menor?",
    a: "Las dos usan las mismas notas, así que se fija en qué acorde funciona como centro: con cuál empieza y termina la progresión y hacia cuál resuelve la dominante (por ejemplo, Mi mayor yendo a La menor).",
  },
  {
    q: "¿Qué significa el porcentaje de confianza?",
    a: "Qué tan claro es el resultado. Con pocos acordes o con muchos acordes prestados baja; en ese caso puedes elegir la tonalidad a mano en el analizador.",
  },
]

export default function DetectorDeTonalidadPage() {
  return (
    <LearnArticle path="/detector-de-tonalidad/" eyebrow="Herramienta gratis" title={TITLE} lead={LEAD} tool={<KeyDetector />} faq={FAQ}>
      <h2>Qué es la tonalidad de una canción</h2>
      <p>
        Es la nota y el modo alrededor de los cuales gira la música: el acorde donde la canción «descansa». Si una canción está en Sol mayor, el acorde de Sol
        es su casa; los demás acordes crean movimiento y tensión, y casi siempre vuelven a él.
      </p>
      <h2>Cómo se detecta a partir de los acordes</h2>
      <p>
        Cada tonalidad mayor tiene siete acordes propios (por ejemplo, en Sol: Sol, Lam, Sim, Do, Re, Mim y Fa#dim). El detector compara los acordes de tu
        canción con los de las 24 tonalidades mayores y menores y elige la que mejor los explica. Suma puntos si la canción empieza o termina en la tónica y si
        aparece la resolución de la dominante a la tónica (V → I), que delata cuál es la casa.
      </p>
      <p>
        Los acordes que no encajan no son errores: suelen ser acordes prestados del modo paralelo o dominantes secundarias, recursos que dan color. El análisis
        completo te dice cuáles son y por qué funcionan.
      </p>
      <h2>Para qué te sirve saberla</h2>
      <ul>
        <li>Para transportar la canción a un tono que se acomode a tu voz o usar capo.</li>
        <li>Para improvisar: la escala de la tonalidad te dice qué notas suenan bien encima.</li>
        <li>Para componer: conocer los acordes de la tonalidad te da opciones seguras y te muestra cuándo estás saliendo de ella.</li>
      </ul>
      <p>
        Si quieres ir más allá, el <Link href="/">analizador</Link> muestra la función de cada acorde (tónica, subdominante, dominante), su curva de tensión y
        acordes con los que puedes reemplazarlo.
      </p>
    </LearnArticle>
  )
}
