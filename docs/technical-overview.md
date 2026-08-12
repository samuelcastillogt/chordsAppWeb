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

- `GET /api/v1/chords`: loads the full chord catalog.
- `GET /api/v1/chords/{id}`: loads metadata for the selected chord.
- `GET /api/v1/chords/{id}/connections`: loads recommended next chords for the selected tonality.
- `POST /api/v1/analyze`: analyzes progression tension.
- `POST /api/v1/tablature`: generates deterministic guitar tablature for the current progression.
- `GET /api/v1/progressions`: lists saved progressions.
- `POST /api/v1/progressions`: creates a progression.
- `PUT /api/v1/progressions/{id}`: updates the selected saved progression.
- `DELETE /api/v1/progressions/{id}`: deletes a saved progression.

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

- Indigo hero with violet/teal atmospheric gradients.
- White and off-white content sections.
- Deep-teal closing CTA band.
- Rounded pills only in the hero.
- Rounded-rectangle body CTAs.
- Warm grey text rather than pure black.
- Minimum 44px touch targets for primary controls.

## Known Limitations

- Saved progressions depend on the backend implementation. The current local backend stores them in memory, so data is lost after backend restart.
- Playback uses simple synthesized triads, not sampled instruments or inversions.
- The SVG graph is redrawn on relevant data changes instead of using fine-grained D3 updates. This is acceptable for the current catalog size.
- Confirmation uses `window.confirm`; a custom modal would provide stronger visual consistency if destructive actions become more prominent.
- No browser E2E suite exists yet. Current automated coverage is helper-level plus Next production build.

## Verification

Run these commands from `frontend/`:

```bash
npm test -- --run
npm run build
```

The latest local verification passed both commands.
