# ChordWeaver Web

ChordWeaver (Tejedor de Acordes) le da la vuelta a la típica web de acordes: en vez de solo mostrar cómo se toca una canción, **explica por qué funciona** y te ayuda a escribir la tuya.

- **Analizar** (`/`): pega acordes (`Bm G D A`, `DO SOL/SI LAm`, `Dm7-G7-Cmaj7`) y obtén tonalidad, grados romanos, función de cada acorde (tónica, subdominante, dominante, prestado, dominante secundaria) y curva de fluidez. Las sustituciones arman una **variante B** que puedes escuchar y comparar con la original (A/B) antes de quedarte con ella o guardar ambas.
- **Explorar** (`/explorer`): mapa de opciones y **mandala armónico** para elegir el siguiente acorde. El mandala (inspirado en *Armonía Ilustrada* de Brian Callipari) gira con la tonalidad: el pétalo dorado es la tonalidad, el violeta los préstamos, cada 7 orbita junto al acorde al que resuelve, los nodos se colorean por función, las flechas son los caminos desde el acorde actual y tu progresión se teje encima como un hilo dorado. Las sugerencias se filtran por intención (segura / interesante / atrevida), se reordenan por estilo (pop / jazz-lite / cinemático), explican el porqué con el desglose de los siete criterios del motor y se pueden escuchar antes de agregarlas. La progresión se reordena arrastrando, se reproduce con tempo, loop y volumen, y se exporta como tablatura TXT/PNG o MIDI; el mapa y la curva de tensión, como PNG/SVG.
- **Mástil** (`/fretboard`) y **Piano** (`/piano`): toca notas en el instrumento y descubre qué acordes las contienen y hacia dónde moverte.
- **Mis progresiones** (`/progressions`): biblioteca personal con cuenta; cada progresión puede compartirse con un enlace público.

Producción: <https://samuelcastillogt.github.io/chordsAppWeb/> (GitHub Pages, export estático) contra la API <https://chords-api-python.vercel.app>.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Abre `http://localhost:3000`. Necesitas la API corriendo (ver el repo del backend).

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL de la API. Por defecto la de producción. |
| `NEXT_PUBLIC_BASE_PATH` | Prefijo de la app para construir enlaces absolutos (los fija el workflow de GitHub Pages). |

## Enlaces profundos

| URL | Efecto |
| --- | --- |
| `/?chords=Bm,G,D,A` | Carga y analiza la progresión. |
| `/?chords=...&key=Bm` | Fuerza la tonalidad. |
| `/?...&utm_content=song:soda-stereo/de-musica-ligera` | Muestra “Vienes de *De musica ligera*” y guarda el origen en la progresión. Lo usa el cancionero Universo Soda/Cerati. |
| `/explorer?chords=Bm,G,D,A&key=Bm` | Abre el explorador con esa progresión. |
| `/explorer?p=<id>` | Abre una progresión compartida (pública) o propia. |

## Cuentas

`lib/auth.tsx` guarda el JWT en `localStorage`, consulta `/health` para saber si las cuentas están activas en el servidor y expone `useAuth()` (`user`, `login`, `register`, `logout`, `openDialog`). Analizar y explorar no requieren cuenta; guardar y compartir sí. Si el servidor no tiene `SECRET_KEY` configurada, la interfaz oculta las acciones de cuenta.

## Estructura

- `app/page.tsx` + `components/Analyzer.tsx`: analizador (página de inicio).
- `app/explorer/page.tsx`: explorador armónico, editor de progresión, tablatura y biblioteca lateral.
- `app/progressions/page.tsx`: biblioteca, compartir y eliminar.
- `app/fretboard`, `app/piano`: exploradores por instrumento.
- `components/SiteHeader.tsx`, `AuthDialog.tsx`, `ConfirmDialog.tsx`, `TensionCurve.tsx`, `ChordGraph.tsx`, `HarmonicMandala.tsx`, `SuggestionPanel.tsx`, `PlayerControls.tsx`, `GuitarFretboard.tsx`, `InstrumentRecommendations.tsx`, `ChordSelector.tsx`.
- `lib/api.ts`: cliente tipado (token, errores legibles, `appUrl`).
- `lib/auth.tsx`, `lib/audio.ts` (Web Audio: secuencias con tempo/loop/volumen/stop) + `lib/usePlayer.ts`, `lib/music.ts` (frecuencias, intervalos, colores por función, `splitChordInput`).
- `lib/mandala.ts` (geometría y grados del mandala), `lib/suggestions.ts` (modos, estilos, explicación y desglose), `lib/progression.ts` (reordenar, diferencias A/B), `lib/midi.ts` (archivo MIDI), `lib/export.ts` (SVG/PNG y descargas).
- `types.ts`: contratos de la API.

Más detalle en `docs/technical-overview.md`; el sistema visual está en `DESIGN.md`.

## Calidad

```bash
npx tsc --noEmit
npm test -- --run
npm run build
```

El workflow `.github/workflows/nextjs.yml` corre los tests y publica en GitHub Pages en cada push a `main`.
