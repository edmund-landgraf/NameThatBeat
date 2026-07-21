# namethatbeat.com

`namethatbeat.com` is a music identification and game platform built around the samples that conventional music identification services fail to match.

The core insight: a failed Shazam-style lookup still contains useful audio evidence. Instead of discarding that sample, the platform stores it, fingerprints it, enriches it, and keeps searching asynchronously. When automated agents narrow an unknown sample to a small candidate set, the product can ask humans to compare likely answers through lightweight game mechanics.

## Product Pillars

1. **Unmatched sample capture**
   - Accept audio snippets from failed identification attempts.
   - Store durable audio, fingerprints, metadata, and provenance.
   - Track confidence, matching attempts, and candidate evolution over time.

2. **Async identification agents**
   - Run background agents that retry, search, compare, cluster, and enrich samples.
   - Use multiple strategies rather than a single one-shot lookup.
   - Promote high-confidence candidates into human verification workflows.

3. **Name That Beat game**
   - Let players identify known music through tiny progressive preview chunks.
   - Use at least eight choices for multiple-choice rounds so guessing is less effective.
   - Use the game to train ranking, estimate user expertise, and build trust signals.
   - Present uncertain samples as A/B or multiple-choice comparisons when agents narrow the search.

4. **Human correlation layer**
   - Aggregate player choices, expertise-weighted votes, response time, and disagreement.
   - Use human feedback as a signal, not as a blind source of truth.
   - Escalate confident human-machine agreement into verified identifications.

## Recommended Stack

See [TECH_STACK.md](TECH_STACK.md) for the detailed stack decision.

Short version:

- **Web app:** Next.js, React, TypeScript
- **API:** NestJS or Fastify on Node.js
- **Database:** PostgreSQL with pgvector
- **Cache/queue:** Redis plus BullMQ
- **Object storage:** S3-compatible storage
- **Audio processing:** Python workers with FFmpeg, librosa, Essentia, Chromaprint
- **Search/indexing:** OpenSearch for metadata and lyrics/source text where licensing allows
- **ML/agents:** Python agent workers orchestrated through Temporal or BullMQ first, Temporal when workflows mature
- **Infra:** Docker, Terraform, AWS or GCP

## Documentation

- [PRODUCT_SPEC.md](PRODUCT_SPEC.md) - product goals, users, flows, and MVP scope
- [TECH_STACK.md](TECH_STACK.md) - recommended technology choices and rationale
- [APP_DESIGN.md](APP_DESIGN.md) - web app structure, screens, and UX principles
- [ARCHITECTURE.md](ARCHITECTURE.md) - system architecture and service boundaries
- [AGENT_SYSTEM.md](AGENT_SYSTEM.md) - async music identification agent design
- [GAME_DESIGN.md](GAME_DESIGN.md) - player experience and human verification mechanics
- [GAP_ANALYSIS_NAME_THAT_TUNE.md](GAP_ANALYSIS_NAME_THAT_TUNE.md) - gap analysis vs Name That Tune game-show format
- [SOLO_GAME_MODE.md](SOLO_GAME_MODE.md) - solo practice mode, 10-second reveals, and seed track rules
- [AUDIOSOURCES.md](AUDIOSOURCES.md) - audio providers, source options, and provider selection rules
- [AUDIO_SOURCES.md](AUDIO_SOURCES.md) - SoundCloud/source URL windows and non-overlap tracking
- [WEB_CLIP_SOURCES.md](WEB_CLIP_SOURCES.md) - design for harvesting random web clips into the game catalog
- [DATA_MODEL.md](DATA_MODEL.md) - core entities and event model
- [PRIVACY_LEGAL.md](PRIVACY_LEGAL.md) - privacy, copyright, licensing, and abuse concerns
- [ROADMAP.md](ROADMAP.md) - phased implementation plan

## Current MVP (v0.2)

The repository includes a catalog-driven solo game MVP on Next.js 15 + React 19 + Tailwind:

- [`../src/app/page.tsx`](../src/app/page.tsx) - app entry
- [`../src/components/solo-game/solo-mvp-game.tsx`](../src/components/solo-game/solo-mvp-game.tsx) - solo set UI
- [`../src/lib/catalog/`](../src/lib/catalog/) - seed catalog load + solo set builder
- [`../src/app/api/catalog/route.ts`](../src/app/api/catalog/route.ts) - catalog metadata API
- [`../src/app/api/game/solo-set/route.ts`](../src/app/api/game/solo-set/route.ts) - builds 5-track / 8-choice sets
- [`../seeds/solo_tracks.json`](../seeds/solo_tracks.json) - classical, jazz, pop, and rock seed catalog

### What works now

1. Pick genre + difficulty from the seed catalog.
2. Start a target 5-track solo set with 8 multiple-choice answers per round.
3. Play progressive clips that start at 2s and grow after wrong guesses (window history in `localStorage` key `ntb_audio_windows_v1`).
4. Type the title first (free-text); miss or “Show choices” opens 8-option multiple choice. Wrong answers are eliminated; score drops per miss; skip supported; set summary at the end.
5. Approved seed URLs play immediately; missing audio is resolved through SoundCloud search when connected.
6. Live SoundCloud fill-in is used only when the catalog cannot supply enough playable rounds.
7. **Identify unknown:** upload a clip Shazam failed to recognize, generate catalog/SoundCloud candidates, run A/B human verification, and mark an ID when confident (stored under `.local/samples/`).
8. **Harvest clips:** pull CC/PD audio from the Internet Archive into `.local/harvest/active.json`, merge into the solo catalog, and play via HTML5 streams (`POST /api/harvest/run`).

### Run locally

```powershell
npm install
npm run dev
```

Optional SoundCloud credentials (see [`.env.example`](../.env.example)):

```env
SOUNDCLOUD_CLIENT_ID=
SOUNDCLOUD_CLIENT_SECRET=
SOUNDCLOUD_REDIRECT_URI=http://127.0.0.1:3000/api/soundcloud/auth/callback
```

Then open `http://127.0.0.1:3000/`.

## MVP Definition

The first useful version should prove three things:

1. The platform can store failed audio samples and preserve enough metadata for later analysis.
2. Background workers can generate candidates through more than one matching strategy.
3. Human game interactions improve confidence on ambiguous samples.

The playable solo loop in this repo proves the game feel and catalog/audio window model. Upload, accounts, and identification agents remain roadmap work.
