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
- [SOLO_GAME_MODE.md](SOLO_GAME_MODE.md) - solo practice mode, 10-second reveals, and seed track rules
- [AUDIO_SOURCES.md](AUDIO_SOURCES.md) - SoundCloud/source URL windows and non-overlap tracking
- [DATA_MODEL.md](DATA_MODEL.md) - core entities and event model
- [PRIVACY_LEGAL.md](PRIVACY_LEGAL.md) - privacy, copyright, licensing, and abuse concerns
- [ROADMAP.md](ROADMAP.md) - phased implementation plan

## Prototype

The repository includes a dependency-free static solo-mode prototype at the repo root:

- [../index.html](../index.html) - browser entry point
- [../src/solo.js](../src/solo.js) - solo game state and reveal logic
- [../src/styles.css](../src/styles.css) - app styling
- [../scripts/static-server.js](../scripts/static-server.js) - optional local static server
- [../seeds/classical_easy_tracks.json](../seeds/classical_easy_tracks.json) - easy classical seed catalog

The prototype uses the seed catalog and tracks the intended gameplay loop. Approved audio preview URLs still need to be added before it can play real clips.

To run locally without dependencies:

```powershell
node scripts/static-server.js
```

Then open `http://127.0.0.1:8080/`. The page also has a built-in fallback seed list, so opening `index.html` directly is enough to test the game logic.

## MVP Definition

The first useful version should prove three things:

1. The platform can store failed audio samples and preserve enough metadata for later analysis.
2. Background workers can generate candidates through more than one matching strategy.
3. Human game interactions improve confidence on ambiguous samples.

The MVP does not need a fully autonomous music discovery engine. It needs a clean ingestion path, repeatable audio analysis, candidate tracking, and a game loop that produces measurable verification signals.
