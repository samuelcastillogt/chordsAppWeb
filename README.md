# ChordWeaver Frontend

Next.js dashboard for exploring harmonic connections, building chord progressions, listening to triads, and saving ideas through the ChordWeaver API.

## Run

```bash
npm install
npm run dev
```

Set the API URL in `.env.local` when needed:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Open `http://localhost:3000`.

## Main Flow

1. Pick an active chord and tonality in the hero panel.
2. Read recommended connections in the harmonic map and suggestions list.
3. Add chords to the progression from the base CTA, graph selection, or suggestion actions.
4. Listen to the progression with the Web Audio playback button.
5. Analyze tension when the progression has at least two chords.
6. Generate tablature and export it as TXT or PNG.
7. Save, reload, update, or delete progressions from the library.

## Implemented Features

- Interactive SVG/D3 harmonic map using circle-of-fifths positions.
- Mandala mode for global chord-family overview across major, minor, dominant, diminished, augmented, and diminished-seventh rings.
- Keyboard-selectable graph nodes with accessible SVG labels.
- Suggestions panel with direct add-to-progression actions.
- Progression editor with empty state, chip removal, save/update, and guarded analysis actions.
- Tablature generation modal with chord positions, suggested string/fret arpeggio, and TXT/PNG downloads.
- Saved progression library with empty/error states and delete confirmation.
- Progression analysis panel with tension curve and category colors.
- Basic Web Audio playback of chord triads.
- API connection errors surfaced with user-facing recovery text.

## Project Structure

- `app/explorer/page.tsx`: main dashboard, data loading, mutation handling, progression state, playback, analysis UI.
- `components/ChordGraph.tsx`: D3-rendered harmonic map and mandala.
- `components/ChordSelector.tsx`: reusable chord dropdown.
- `lib/api.ts`: typed API wrapper and API base URL resolution.
- `lib/music.ts`: music helpers for note frequency, circle distance, intervals, labels, and colors.
- `types.ts`: frontend contracts matching backend response shapes.
- `docs/technical-overview.md`: technical architecture and QA notes.

## Design

The UI follows `DESIGN.md`: indigo hero, white/off-white content body, deep-teal closing band, warm ink colors, and rounded-rectangle buttons outside the hero.

## Checks

```bash
npm run build
npm test -- --run
```

Current verified state: both commands pass locally.
