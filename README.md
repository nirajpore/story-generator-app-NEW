# Personal AI Reading Coach (Family-Only MVP)

Mobile-first Next.js app for one child + parents, designed for iPhone Safari reading practice with local-first data storage.

## Features implemented

- Child home screen with simple theme cards and **Surprise Me**
- Single local child profile initialized near end of Blue (internal), progressing toward Grey
- Parent mode with PIN gate (`2468` default), internal level visibility, and theme management:
  - add / rename / delete
  - favorite / unfavorite
  - reorder
- AI provider abstraction:
  - `GeminiProvider` (default when `GEMINI_API_KEY` is set)
  - `MockAIProvider` fallback
- Theme research abstraction before story generation
- Structured story JSON:
  - `title`, `theme`, `difficulty`, `pages[]`, `wordCount`, `metadata`
- Book-style reader:
  - multi-page view
  - tap buttons + swipe navigation
  - large text and mobile-friendly layout
- Reading session lifecycle:
  - START / FINISH
  - timer + words-per-minute tracking
  - motivational completion feedback
- Replaceable speech service architecture:
  - recording-first (`MediaRecorderSpeechService`) baseline
  - browser live transcription adapter
  - Whisper / native iOS / cloud placeholders for future engines
- Parent speech test panel:
  - record sample
  - inspect transcript
  - compare expected text
  - view processing time + confidence
- Reading analysis:
  - accuracy, fluency proxy, punctuation/expression proxy, speed, improvement
  - score 1–10
  - difference classes: `confirmed_mistake`, `possible_mistake`, `recognition_uncertain`
  - difficult-word tracking
- Adaptive difficulty profile updates based on multiple sessions
- Offline-friendly behavior:
  - previously generated stories remain available
  - clear message when internet is needed for new story generation

---

## Tech stack

- Next.js 14 (App Router)
- React 18
- Local storage (`localStorage`) for all child/parent app data
- Gemini API (server-side only) or mock fallback

---

## Installation and local run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

---

## Gemini API setup

1. Get a Gemini API key.
2. Set `GEMINI_API_KEY` in `.env.local`.
3. Optional: set `GEMINI_MODEL` (defaults to `gemini-1.5-flash`).

The API key is only used in server routes (`/api/story`) and is never exposed in browser JS.

---

## Speech recognition options

Current engines are selected in Parent Dashboard:

- `recording-first` (recommended): records with Safari `MediaRecorder`, with optional live browser baseline transcript
- `browser-live`: baseline Web Speech API mode
- `whisper`, `native-ios`, `cloud`: future upgrade placeholders

### iPhone/Safari limitation notes

- Safari web apps cannot directly call Apple native Speech framework APIs.
- Native iOS speech would require a wrapper app path in the future.
- This MVP keeps the speech architecture portable to support that migration.

---

## Local storage and privacy

Stored locally:
- child profile
- themes
- generated stories
- reading sessions
- difficult words
- speech engine preference

Raw audio is treated as temporary session data and not retained long-term in this MVP state model.

No ads, no analytics SDKs, no public sharing.

---

## Provider / engine switching

- AI provider selection happens in server factory:
  - `lib/server/ai/providerFactory.js`
- Speech engine selection happens in parent mode and uses:
  - `lib/speech/factory.js`

---

## Deployment

Deploy as a standard Next.js app (e.g., Vercel). Configure environment variables in deployment settings:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional)

Without `GEMINI_API_KEY`, the app still works using `MockAIProvider`.
