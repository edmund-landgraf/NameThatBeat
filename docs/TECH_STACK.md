# Tech Stack

## Stack Recommendation

Use a pragmatic split between a TypeScript product surface and Python audio intelligence workers.

| Layer | Choice | Why |
| --- | --- | --- |
| Web app | Next.js, React, TypeScript | Fast product iteration, good SEO for public pages, strong ecosystem |
| API | Fastify or NestJS, TypeScript | Shared types with frontend, efficient request handling, mature auth patterns |
| Database | PostgreSQL | Relational integrity for samples, attempts, candidates, users, and votes |
| Vector search | pgvector first | Keeps MVP simple while supporting audio/text embedding similarity |
| Object storage | S3-compatible bucket | Durable storage for uploaded snippets, normalized audio, spectrograms, and derived files |
| Queue | Redis + BullMQ | Simple background job orchestration for ingestion, fingerprinting, and candidate generation |
| Workflow engine | Temporal later | Useful once retries, long-running agent workflows, and auditability become central |
| Audio processing | Python, FFmpeg, librosa, Essentia, pyacoustid/Chromaprint | Best ecosystem for DSP, fingerprints, embeddings, and research workflows |
| Search | OpenSearch later | Useful for large catalog metadata, source indexing, and explainable candidate retrieval |
| Auth | Clerk, Auth0, or Lucia/Auth.js | Use managed auth early unless identity customization is strategic |
| Payments | Stripe | Optional for future premium workflows or creator tools |
| Observability | OpenTelemetry, Sentry, Prometheus/Grafana | Required for async agents and data quality monitoring |
| Infrastructure | Docker, Terraform, AWS or GCP | Portable local development and repeatable cloud deploys |

## Primary App Stack

### Frontend

- Next.js App Router
- TypeScript
- React Server Components where they simplify data loading
- Tailwind CSS or CSS Modules
- shadcn/ui only if the product needs a fast internal dashboard
- Web Audio API for playback, waveform previews, and A/B tests

Key frontend areas:

- Public game experience
- User account/profile
- Upload or import failed samples
- Moderator/reviewer dashboard
- Internal operations dashboard for agent activity

### Backend API

Start with a TypeScript API using either:

- **Fastify** for a lean service with explicit routing
- **NestJS** if the team wants a more opinionated framework with DI, modules, and decorators

Recommended default: **Fastify** for MVP speed and lower framework weight.

Responsibilities:

- Auth and sessions
- Sample ingestion metadata
- Signed upload/download URLs
- Game challenge generation
- Vote and response capture
- Candidate and verification APIs
- Admin/reviewer APIs

## Audio Processing Stack

Audio processing should run in Python workers, separate from the request API.

Core tools:

- **FFmpeg:** normalization, trimming, transcoding, loudness analysis
- **librosa:** tempo, chroma, MFCCs, onset, beat tracking
- **Essentia:** production-grade audio feature extraction and music analysis
- **Chromaprint/AcoustID:** acoustic fingerprint generation and lookup compatibility
- **PyTorch:** learned embeddings and later custom models
- **NumPy/SciPy:** signal processing utilities

Derived artifacts:

- Normalized preview audio
- Spectrogram images
- Chromaprint fingerprints
- Beat/tempo/chroma features
- Embeddings for similarity search
- Quality metrics such as SNR, clipping, duration, silence percentage

## Data Stores

### PostgreSQL

Use Postgres as the system of record.

It should store:

- Users
- Samples
- Audio artifacts
- Fingerprints
- Agent runs
- Match attempts
- Candidate tracks
- Game challenges
- Votes and responses
- Verification decisions
- Audit events

### pgvector

Use pgvector for MVP similarity search:

- Audio embeddings
- Candidate embeddings
- Optional text embeddings for catalog metadata

Move to a dedicated vector database only if scale or recall demands it.

### Redis

Use Redis for:

- BullMQ queues
- Rate limiting
- Short-lived game state
- Deduplication locks

### Object Storage

Store binary assets outside the database:

- Original uploaded snippets
- Normalized snippets
- Spectrograms
- Model outputs
- Export bundles

Use signed URLs and short expirations for access.

## Agent Orchestration

Start with BullMQ if the workflows are simple:

- Ingest sample
- Normalize audio
- Extract fingerprints
- Run candidate search
- Score candidates
- Generate human verification task

Move long-running workflows to Temporal when agent behavior includes:

- Multi-day retries
- External API polling
- Complex branching
- Strong audit requirements
- Recoverable state machines

## Deployment

Recommended MVP deployment:

- Vercel for Next.js frontend if the API is separate
- Fly.io, Render, Railway, AWS ECS, or GCP Cloud Run for API/workers
- Managed Postgres
- Managed Redis
- S3-compatible object storage

Recommended production deployment:

- AWS ECS or EKS
- RDS Postgres
- ElastiCache Redis
- S3
- OpenSearch
- CloudFront
- Terraform

## Why Not a Monolith Only?

A single Next.js app can get the website online quickly, but audio processing and matching workloads will become CPU-heavy, retry-heavy, and operationally distinct. Keeping Python workers separate from the product API gives the system cleaner scaling and better failure isolation.

## Why Not Python Everywhere?

Python is excellent for audio and ML, but TypeScript is a better default for the product interface, typed APIs, realtime game state, and frontend/backend shared models. The split lets each language do the work it is best at.
