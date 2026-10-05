# ChordWeaver · Sistema visual

> Reemplaza el documento anterior, que era un análisis de la marca de un producto de email. ChordWeaver necesita una identidad propia: musical, cálida y didáctica.

## Idea

**Hilos que se tejen.** Cada acorde es un hilo; la armonía es cómo se cruzan. La interfaz alterna una **noche** (superficies oscuras donde se toca y se escucha) con **papel** (superficies claras donde se lee y se entiende). El color no decora: **codifica la función armónica**, igual en las tarjetas del analizador, en el mapa y en la app móvil.

## Color

Los nombres de token se mantienen estables para no reescribir componentes; su papel es el siguiente:

| Token | Valor | Rol |
| --- | --- | --- |
| `primary` | `#16132a` | Noche: cabecera, hero, botones principales sobre papel. |
| `primary-deep` | `#0d0b1a` | Hover/pressed y fondos de formularios en el hero. |
| `on-primary` | `#fbf7ef` | Texto sobre noche. |
| `on-dark-mute` | `#c9c3da` | Texto secundario sobre noche. |
| `hairline-dark` | `#3a3555` | Bordes sobre noche. |
| `surface-violet-soft` | `#f2c14e` | **Hilo dorado**: acento y CTA principal sobre noche (nombre histórico). |
| `canvas` | `#fffdf8` | Tarjetas. |
| `canvas-soft` | `#f6f1e7` | Papel: fondo de página. |
| `hairline` | `#e7dfd0` | Bordes sobre papel. |
| `ink` / `ink-mute` / `ink-faint` | `#1f1b16` / `#6b645a` / `#a39b8e` | Texto principal, secundario y terciario. Nunca negro puro. |
| `surface-teal-deep` / `-mid` | `#123b36` / `#1c5a52` | Acción de guardar y bandas de cierre. |

### Color funcional (obligatorio y consistente)

| Token | Valor | Significado |
| --- | --- | --- |
| `fn-tonic` | `#1f8a70` | Tónica (I, vi, iii · i, III, VI): reposo. |
| `fn-subdominant` | `#c98a14` | Subdominante (ii, IV · ii°, iv): movimiento. |
| `fn-dominant` | `#d4462b` | Dominante y dominantes secundarias: tensión que pide resolver. |
| `fn-borrowed` | `#7b5cd6` | Acorde prestado del modo paralelo. |
| `fn-chromatic` | `#6b7280` | Fuera de la tonalidad. |

`lib/music.ts → functionColor()` (web) y `src/lib/music.ts` (móvil) son la única fuente de estos valores en código. Las categorías de conexión del motor (natural / media / tensa / extrema) conservan verde / amarillo / naranja / rojo.

## Tipografía

| Familia | Uso |
| --- | --- |
| **Fraunces** (`font-display`) | Titulares, grados romanos, nombres de tonalidad. Serif con carácter editorial y musical. |
| **Inter** (`font-sans`) | Interfaz y texto. |
| **JetBrains Mono** (`font-mono`) | Cifrados de acordes y tablaturas: la alineación importa. |

Cargadas con `next/font/google` en `app/layout.tsx` (sin peticiones a terceros en tiempo de ejecución).

Escala: hero 40→68 px, títulos de sección 28–44 px, cuerpo 16 px, etiquetas 12 px en mayúsculas con tracking 0,2 em.

## Superficies y forma

- `thread-bg` (en `globals.css`): noche con dos halos (dorado y verde) y un tramado diagonal sutil. Úsalo solo en heros.
- Tarjetas: `rounded-xl`, borde `hairline`, sombra `shadow-card`. Las tarjetas de acorde llevan un **borde superior de 6 px en el color funcional**.
- Botones: rectángulos `rounded-md` sobre papel; el CTA dorado sobre noche puede ser `rounded-full`. Altura mínima 44 px.
- Chips de sustitución: mono, fondo papel, con la clase de sustitución en versalitas.

## Componentes clave

- **Cabecera** fija en noche con el logotipo de dos hilos (dorado y verde) y navegación con scroll horizontal en móvil.
- **Tarjeta de grado** (analizador): acorde en mono, número romano en Fraunces del color funcional, insignia de función, explicación y sustituciones.
- **Curva de fluidez**: línea en tinta con puntos coloreados por categoría y guía punteada en 50.
- **Diálogo de cuenta**: `<dialog>` nativo, papel, un solo CTA.

## Accesibilidad

- Contraste AA en texto; el color funcional siempre va acompañado de una etiqueta textual (“Tónica”, “Prestado”…).
- Foco visible dorado (`:focus-visible`).
- Objetivos táctiles ≥ 44 px; sin scroll horizontal de página a 375 px (solo dentro del menú y las tablaturas).
