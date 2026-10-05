# ChordWeaver Frontend Technical Overview

## Purpose

The frontend is a Next.js 14 App Router application that turns the ChordWeaver API into an interactive harmonic exploration tool. The primary screen lets users inspect chord relationships, assemble a progression, listen to it, analyze tension, and persist ideas.

## Runtime Stack

- Next.js 14 with React client components for the explorer.
- TanStack Query for API data fetching, caching, invalidation, and mutations.
- D3 for SVG graph rendering in `ChordGraph`.
- Tailwind CSS for token-based layout and styling.
- Web Audio API for local triad playback.
- Vitest for helper-level regression tests.

## Data Sources

The API base URL is resolved in `lib/api.ts`:

```txt
NEXT_PUBLIC_API_URL || http://localhost:8000
```

The explorer uses these backend endpoints:

- `GET /health`: reports whether accounts are enabled on the server (`accounts`).
- `GET /api/v1/chords`: loads the 192-chord catalog (`notes`, `triad`, `family`).
- `GET /api/v1/chords/{id}`: loads metadata for the selected chord (any spelling: `Bb`, `SOLm`).
- `POST /api/v1/chords/parse`: normalises pasted chord symbols in the analyzer and deep links.
- `GET /api/v1/chords/{id}/connections`: loads recommended next chords for the selected tonality.
- `POST /api/v1/analyze`: key detection, roman numerals, functions, substitutions and tension curve.
- `POST /api/v1/tablature`: generates deterministic guitar tablature for the current progression.
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`: accounts (JWT Bearer).
- `GET /api/v1/progressions`: lists the signed-in user's progressions.
- `POST /api/v1/progressions`: creates a progression (requires login).
- `GET /api/v1/progressions/{id}`: loads an owned or public (shared) progression.
- `PUT /api/v1/progressions/{id}`: updates a progression; `{"isPublic": true}` shares it.
- `DELETE /api/v1/progressions/{id}`: deletes an owned progression.

## Analyzer (home page)

`components/Analyzer.tsx` is the entry point of the product. The submitted text is split with `splitChordInput`, normalised with `/chords/parse` (unknown tokens such as `x2` or `N.C.` are listed as ignored) and analysed with `/analyze`. The whole pipeline is a React Query query keyed by the submitted text and key, so deep links (`?chords=`), example buttons and substitution clicks all reuse the same code path and cache. Each degree card can replace its chord with a suggested substitution, which rewrites the input and re-runs the analysis.

## Screen Architecture

`app/explorer/page.tsx` owns the main application state:

- `selectedChord`: current graph/source chord.
- `tonality`: tonal context passed to the connection and analysis endpoints.
- `progressionName`: editable saved progression name.
- `progression`: ordered chord IDs for playback, analysis, and persistence.
- `mode`: `connections` or `mandala` graph mode.
- `selectedProgressionId`: controls create vs update behavior.
- `isTablatureModalOpen`: controls the generated tablature export modal.
- `message` and `errorMessage`: local user feedback after mutations and failures.

TanStack Query separates reads from writes. Reads are keyed by chord, tonality, and collection names. Mutations invalidate `progressions` after save/delete so the library stays current without a full page refresh.

## Harmonic Map

`components/ChordGraph.tsx` renders all SVG children imperatively with D3 inside `useEffect`.

In `connections` mode:

- The selected source chord is centered.
- Recommended target chords are placed around it using circle-of-fifths distance.
- Links are colored by tension category and weighted by score.

In `mandala` mode:

- Every chord is visible.
- Chord families are separated into rings by `getChordRing`.
- Major chords follow the outer circle-of-fifths loop.
- Relative major/minor relationships are drawn with subtle teal links.
- Active connection lines originate from the actual selected source node.

Graph nodes are interactive with mouse and keyboard. Each node has `tabindex`, `role="button"`, and an `aria-label`; pressing Enter or Space selects the chord.

## Music Helpers

`lib/music.ts` centralizes reusable music logic:

- `noteToFrequency`: maps note names to oscillator frequencies.
- `categoryColor`: maps connection categories to UI colors.
- `connectionLabel`: maps API category values to readable Spanish labels.
- `getChordRoot`: extracts the pitch root from a chord ID.
- `getIntervalName`: describes root-to-root intervals.
- `getCircleAngle` and `getCircleDistance`: place chords by circle-of-fifths position.
- `getChordRing`: assigns chord families to mandala rings.

Keeping this logic outside components makes graph behavior testable and avoids coupling display code to music calculations.

## Playback

Playback uses the browser Web Audio API. `playProgression` creates an `AudioContext`, finds each chord's triad in the loaded catalog, and schedules triangle oscillators about one second apart.

Playback is intentionally local-only:

- It does not call the backend.
- It does not persist audio state.
- It degrades silently if `AudioContext` is unavailable.

## Tablature Export

The frontend sends the current progression to `POST /api/v1/tablature` with the current progression name as the title. The backend returns normalized chord IDs, six chord-position tablature lines, six arpeggio lines, and a complete plain-text representation. The arpeggio section intentionally shows only string lines and frets, not chord labels.

The modal supports two local exports:

- TXT: downloads the backend-provided text directly.
- PNG: renders the same text into a browser canvas and downloads the resulting image.

This keeps tablature generation authoritative on the backend while keeping image export lightweight and dependency-free in the browser.

## Resilience And UX Guards

The frontend now handles these common breakpoints:

- Full API catalog failure shows a blocking API connection panel with the active base URL.
- Connection fetch failure keeps the page usable and displays a graph-level recovery message.
- Saved library failure shows a local library error state instead of an empty-looking panel.
- Empty suggestions and empty progression states explain what to do next.
- Analysis buttons are disabled until at least two chords exist.
- Tablature generation is disabled until at least one chord exists.
- Save is disabled for empty progressions and blank names.
- Editing the progression resets stale analysis results.
- Delete requires browser confirmation before calling the API.
- Network-level fetch failures return `No se pudo conectar con la API...` instead of a generic fetch exception.

## Design Implementation

The layout follows the product design file:

- Night surfaces (`thread-bg`) for heros and the sticky header; paper (`canvas-soft`) for reading.
- Harmonic-function colours (`fn-tonic`, `fn-subdominant`, `fn-dominant`, `fn-borrowed`, `fn-chromatic`) shared with the mobile app.
- Fraunces for display, Inter for UI, JetBrains Mono for chord symbols and tablature (loaded with `next/font`).
- Warm ink text rather than pure black; golden focus ring.
- Minimum 44px touch targets for primary controls; no page-level horizontal scroll at 375px.

## Known Limitations

- Saved progressions are persisted per user in the API database. On Vercel they only survive restarts when `DATABASE_URL` points to PostgreSQL; without `SECRET_KEY` the server disables accounts and the UI hides saving.
- Playback uses simple synthesized triads, not sampled instruments or inversions.
- The SVG graph is redrawn on relevant data changes instead of using fine-grained D3 updates. This is acceptable for the current catalog size.
- Confirmation uses `window.confirm`; a custom modal would provide stronger visual consistency if destructive actions become more prominent.
- No browser E2E suite exists yet. Current automated coverage is helper-level (`lib/music.ts`) plus Next production build; the analyzer, auth and sharing flows were verified manually against a local API.

## Verification

Run these commands from `frontend/`:

```bash
npm test -- --run
npm run build
```

The latest local verification passed both commands.
