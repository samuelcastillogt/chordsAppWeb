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

## Suggestions, Playback And Export

- `lib/suggestions.ts` turns `/connections` (requested with `max_results=60`) into the sidebar list. Intention modes map to engine categories (`safe` = natural, `interesting` = media, `bold` = tensa + extrema). Style presets re-weight the seven raw criteria from `breakdown` (pop favours tonal fit, jazz-lite dominant chains and voice leading, cinematic parallel/relative moves and bridge notes); `balanced` keeps the engine score. The short explanation is the detail text of the two criteria with the highest weighted contribution. Everything is client-side, so no API change was needed.
- `lib/audio.ts → playSequence` schedules one chord at a time through a master gain node, which allows tempo (2 beats per chord), loop, volume and an immediate stop. `lib/usePlayer.ts` keeps one playback per screen and exposes the sounding index used to highlight chips and degree cards. Suggestion previews play `source → target` with the same player.
- The analyzer's substitutions no longer rewrite the input: they build variant B on top of A. B is analysed in A's key with the same React Query pipeline (`analyzeText`), and `CompareAB` shows both, the average-fluency delta, the changed degrees, and actions to keep B, save A and B (two progressions, the second suffixed "(variante)") or discard.
- `lib/export.ts` serialises the on-screen SVG (explicit size, paper background, CSS font variables replaced by real font stacks) to SVG or a 2x PNG through a canvas. `lib/midi.ts` writes a format-0 MIDI file (480 PPQ, piano, one block chord per two beats at the current tempo).

## Screen Architecture

`app/explorer/page.tsx` owns the main application state:

- `selectedChord`: current graph/source chord.
- `tonality`: tonal context passed to the connection and analysis endpoints.
- `progressionName`: editable saved progression name.
- `progression`: ordered chord IDs for playback, analysis, and persistence.
- `mode`: map view, `mandala` (default), `connections` or `fretboard`. Its selector sits next to the PNG/SVG download buttons above the map.
- `selectedProgressionId`: controls create vs update behavior.
- `isTablatureModalOpen`: controls the generated tablature export modal.
- `suggestionMode` / `stylePreset`: intention filter and ranking preset for suggestions (the graph shows the same filtered list).
- `dragIndex`: chip being dragged while reordering the progression.
- `pendingDelete`: progression awaiting confirmation in `ConfirmDialog`.
- `message` and `errorMessage`: local user feedback after mutations and failures.

TanStack Query separates reads from writes. Reads are keyed by chord, tonality, and collection names. Mutations invalidate `progressions` after save/delete so the library stays current without a full page refresh.

## Harmonic Map

Two views share the map card in the explorer.

`components/ChordGraph.tsx` (options map, D3): the selected chord in the centre and its ranked connections placed by circle-of-fifths distance, links coloured by category and weighted by score.

`components/HarmonicMandala.tsx` (harmonic mandala, declarative SVG) takes the idea of Brian Callipari's *Armonía Ilustrada* (chords connected by arrows that show where you can go, including paths to other tonal regions) and makes it a live, key-aware map. Geometry and theory live in `lib/mandala.ts`:

- **Rings by family, aligned spokes.** Outside in: dominant 7ths, majors, minors, diminished, augmented (off by default). Minors sit under their relative major, diminished chords under the major key where they are vii°, and each dominant 7th orbits right outside the chord it resolves to (G7 above C). A key therefore occupies one petal of three spokes: IV · I · V on top, ii · vi · iii under them and vii° in the middle (VI · III · VII / iv · i · v / ii° in minor).
- **Rotates with the key.** The tonic petal is always on top. The parallel key's petal (three spokes away) is tinted violet: that's where borrowed chords come from, so changing tonal region is literally moving to a neighbouring petal.
- **Colour = function in the selected key**, with the same tokens as the analyzer (tonic, subdominant, dominant, borrowed; secondary dominants as dominant). `degreeInKey` computes numerals client-side (diatonic → borrowed → secondary dominant → outside). Chords outside the key are drawn as paper nodes.
- **Paths:** the top 8 ranked connections from the selected chord as curved arrows coloured by category, so the explorer's intention modes and style presets filter the mandala too. Extensions (`Cmaj7`, `Am7`, `Bm7b5`, `G9`) land on their family node through `mandalaNodeId`; the hover card names the best variant.
- **Thread:** the current progression is woven over the mandala as a golden thread with numbered steps; the segment that is sounding is highlighted during playback.
- **Focus:** hovering or focusing a node dims everything unrelated and shows a card with numeral, function and, when there is a path, its score and explanation. Layers (key, paths, thread) and families can be toggled.
- **Audition before adding:** clicking (or Enter on) a node pins its card instead of changing the selection. From there you can play the chord alone, the move from the current chord, and the last three chords of the progression followed by it; pick the plain chord or the extension the engine ranked higher (Em / Em7); then add it to the progression or explore from it. Escape or × closes the card; on phones it flows below the mandala. While connections reload the mandala stays mounted so the card survives an add.

This replaced an earlier D3 mandala that drew relative-minor links to the wrong chord (C ↔ D#m instead of C ↔ Am), had no nodes for the 7th chords the engine recommends (their arrows fell into the centre) and coloured by chord family instead of function.

Nodes in both views are keyboard accessible (`tabindex`, `role="button"`, Enter/Space selects).

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
- Playback uses simple synthesized chords, not sampled instruments or inversions. `tone` is still a dependency but unused.
- Shown/applied suggestions are not tracked yet: the PRD's recommendation history needs an API endpoint and a privacy decision.
- Variants are saved as two separate progressions; the API has no variant relation.
- There is no dark mode or onboarding. The mandala uses sharps for every root because the catalog does (A#, not Bb).
- The SVG graph is redrawn on relevant data changes instead of using fine-grained D3 updates. This is acceptable for the current catalog size.
- No browser E2E suite exists yet. Automated coverage is helper-level (`lib/music.test.ts`, `lib/suggestions.test.ts`, `lib/progression.test.ts`: ranking, reordering, A/B diff, MIDI bytes, file names) plus the Next production build; the UI flows were verified manually against a local API.

## Verification

Run these commands from `frontend/`:

```bash
npm test -- --run
npm run build
```

The latest local verification passed both commands.
