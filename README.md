# ChordWeaver Web

ChordWeaver (Tejedor de Acordes) le da la vuelta a la típica web de acordes: en vez de solo mostrar cómo se toca una canción, **explica por qué funciona** y te ayuda a escribir la tuya.

- **Analizar** (`/`): pega acordes (`Bm G D A`, `DO SOL/SI LAm`, `Dm7-G7-Cmaj7`) y obtén tonalidad, grados romanos, función de cada acorde (tónica, subdominante, dominante, prestado, dominante secundaria) y curva de fluidez. Las sustituciones arman una **variante B** que puedes escuchar y comparar con la original (A/B) antes de quedarte con ella o guardar ambas.
- **Explorar** (`/explorer`): mapa de opciones y **mandala armónico** para elegir el siguiente acorde. El mandala (inspirado en *Armonía Ilustrada* de Brian Callipari) gira con la tonalidad: el pétalo dorado es la tonalidad, el violeta los préstamos, cada 7 orbita junto al acorde al que resuelve, los nodos se colorean por función, las flechas son los caminos desde el acorde actual y tu progresión se teje encima como un hilo dorado. Las sugerencias se filtran por intención (segura / interesante / atrevida), se reordenan por estilo (pop / jazz-lite / cinemático), explican el porqué con el desglose de los siete criterios del motor y se pueden escuchar antes de agregarlas. La progresión se reordena arrastrando, se reproduce con tempo, loop y volumen, y se exporta como tablatura TXT/PNG o MIDI; el mapa y la curva de tensión, como PNG/SVG.
- **Mástil** (`/fretboard`) y **Piano** (`/piano`): toca notas en el instrumento y descubre qué acordes las contienen y hacia dónde moverte.
- **Mis progresiones** (`/progressions`): biblioteca personal con cuenta; cada progresión puede compartirse con un enlace público.

Producción: <https://samuelcastillogt.github.io/chordsAppWeb/> (GitHub Pages, export estático) contra la API <https://chords-api-python.vercel.app>.

## Desarrollo

Requisitos: Node 20+ (`.nvmrc`) y la API corriendo (repo del backend).

```bash
npm install
cp .env.example .env.local   # completa las variables (ver abajo)
npm run dev                  # http://localhost:3000
```

### Variables de entorno

Todas son públicas (`NEXT_PUBLIC_*`, se incrustan en el bundle al compilar) y están documentadas en [`.env.example`](.env.example). En el código se leen solo desde [`src/lib/env.ts`](src/lib/env.ts).

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | no | URL de la API. Vacía: la de producción. |
| `NEXT_PUBLIC_BASE_PATH` | no | Prefijo de la app para enlaces absolutos (lo fija el workflow de GitHub Pages). |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | para cuentas | Configuración web de Firebase. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | para cuentas | 〃 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | para cuentas | 〃 (el mismo que `FIREBASE_PROJECT_ID` en la API). |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | para cuentas | 〃 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_MEASUREMENT_ID` | no | Resto de la configuración web. |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | no | `127.0.0.1:9099` para usar el emulador local de Firebase Auth. |

Sin las cuatro variables obligatorias de Firebase la app funciona igual, pero sin cuentas (se ocultan las acciones de guardar y compartir).

**En producción (GitHub Pages)** las variables se leen de *Settings → Secrets and variables → Actions → Variables* del repositorio (son públicas, por eso van como *variables* y no como *secrets*).

## Enlaces profundos

| URL | Efecto |
| --- | --- |
| `/?chords=Bm,G,D,A` | Carga y analiza la progresión. |
| `/?chords=...&key=Bm` | Fuerza la tonalidad. |
| `/?...&utm_content=song:soda-stereo/de-musica-ligera` | Muestra “Vienes de *De musica ligera*” y guarda el origen en la progresión. Lo usa el cancionero Universo Soda/Cerati. |
| `/explorer?chords=Bm,G,D,A&key=Bm` | Abre el explorador con esa progresión. |
| `/explorer?p=<id>` | Abre una progresión compartida (pública) o propia. |

## Cuentas (Firebase Authentication)

El registro y el inicio de sesión ocurren en Firebase: email y contraseña (con verificación de correo y recuperación de contraseña) o Google. [`src/lib/auth/AuthProvider.tsx`](src/lib/auth/AuthProvider.tsx) escucha la sesión de Firebase, registra en el cliente de la API cómo obtener el **ID token** (que Firebase renueva solo) y pide a la API el usuario (`GET /api/v1/auth/me`, que lo crea la primera vez). `useAuth()` expone `user`, `signedIn`, `signIn`, `signUp`, `signInWithGoogle`, `resetPassword`, `logout` y el diálogo de acceso.

Si alguien tenía cuenta antes de Firebase, al entrar con el mismo email la API la vincula **cuando el correo está verificado**. Mientras tanto, el diálogo muestra "Verifica tu correo" con las opciones de reenviar el correo y de reintentar.

Configurar Firebase:

1. Crea un proyecto en <https://console.firebase.google.com> y registra una **app web**: copia su configuración a las variables `NEXT_PUBLIC_FIREBASE_*`.
2. **Authentication → Sign-in method**: activa *Correo electrónico/contraseña* y *Google*.
3. **Authentication → Settings → Authorized domains**: agrega `localhost` y `samuelcastillogt.github.io`.
4. En la API define `FIREBASE_PROJECT_ID` con el mismo Project ID.

## Estructura

```
src/
├── app/                      # Rutas (App Router): /, /explorer, /estilo, /fretboard, /piano, /progressions
├── components/
│   ├── analyzer/             # Analyzer, TensionCurve
│   ├── auth/                 # AuthDialog
│   ├── explorer/             # HarmonicMandala, ChordGraph, SuggestionPanel, StylePicker, ChordSelector
│   ├── instruments/          # GuitarFretboard, InstrumentRecommendations
│   ├── layout/               # SiteHeader
│   └── ui/                   # ConfirmDialog, PlayerControls
├── lib/
│   ├── api.ts                # Cliente tipado: token de Firebase, reintento ante 401, errores legibles
│   ├── env.ts                # Única lectura de variables de entorno
│   ├── export.ts             # SVG/PNG y descargas
│   ├── auth/                 # AuthProvider, inicialización de Firebase, mensajes de error
│   ├── audio/                # Síntesis Web Audio, usePlayer, MIDI
│   └── music/                # Teoría, mandala, sugerencias, progresión, canción, recorrido, estilo (+ tests)
└── types/                    # Contratos de la API
```

Más detalle en `docs/technical-overview.md`; el sistema visual está en `DESIGN.md`.

## Calidad

```bash
npm run check        # typecheck + ESLint + Prettier + tests (lo mismo que la CI)
npm run format       # formatea con Prettier
npm run build        # build de producción
```

- **CI** (`.github/workflows/ci.yml`): en cada PR y push a otras ramas ejecuta typecheck, lint, formato, tests y build.
- **Despliegue** (`.github/workflows/nextjs.yml`): cada push a `main` verifica, compila como export estático y publica en GitHub Pages.
- **Docker**: `docker build --build-arg NEXT_PUBLIC_API_URL=... --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... -t chordweaver-web .` genera el servidor standalone de Next.js.
