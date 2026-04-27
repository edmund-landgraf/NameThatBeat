# Roadmap

## Phase 0: Foundation

Goal: prove the product shape and reduce legal/technical ambiguity.

Deliverables:

- Product requirements
- Rights and privacy review
- Initial known-track source strategy
- Sample ingestion prototype
- Audio processing proof of concept
- Candidate scoring design

Exit criteria:

- Team agrees on legal posture for MVP content.
- One uploaded sample can be normalized, fingerprinted, and stored.
- Known-track snippets can be used in a compliant game prototype.

## Phase 1: MVP Ingestion and Game

Goal: build the first usable system.

Deliverables:

- Next.js web app
- User accounts
- Solo practice mode with genre selection
- Easy classical seed catalog
- Upload flow for failed samples
- Object storage integration
- Postgres schema
- Redis/BullMQ worker pipeline
- Python audio processing worker
- Known-track multiple-choice game
- Basic admin dashboard

Exit criteria:

- Users can upload samples.
- Workers produce fingerprints/features.
- Players can complete known-track rounds.
- Admins can inspect sample status.

## Phase 2: Candidate Discovery

Goal: start generating useful candidate matches.

Deliverables:

- Known-track catalog import
- Fingerprint matching
- Embedding similarity search
- Candidate scoring
- Duplicate/cluster detection
- Agent run audit log

Exit criteria:

- Unknown samples can produce ranked candidates.
- Operators can see why a candidate was suggested.
- Duplicate unknown samples can be grouped.

## Phase 3: Human Verification

Goal: connect agent uncertainty to player judgment.

Deliverables:

- A/B verification challenges
- Player expertise scoring
- Weighted vote aggregation
- Candidate confidence updates
- Moderator verification workflow

Exit criteria:

- Ambiguous samples can be routed to qualified players.
- Human responses affect candidate confidence.
- Moderators can finalize or reject a match.

## Phase 4: Retention and Notifications

Goal: make the persistent-search promise visible to users.

Deliverables:

- Sample status page
- Email or push notifications
- Search retry policies
- Reprocessing when catalog or model changes
- User-facing candidate updates

Exit criteria:

- Submitters can track progress over time.
- Old samples can improve when new data or models are added.

## Phase 5: Scale and Quality

Goal: improve reliability, trust, and coverage.

Deliverables:

- Temporal workflows if BullMQ orchestration becomes limiting
- Better audio embeddings
- OpenSearch metadata index
- Expanded moderation tooling
- Observability dashboards
- Cost monitoring
- Abuse detection

Exit criteria:

- System handles larger sample volume.
- Agent performance is measurable by strategy.
- False positives are tracked and reduced.

## Phase 6: Growth

Goal: expand acquisition and content coverage.

Options:

- Mobile app
- Browser extension
- Community expert programs
- Partner integrations
- Public API
- Premium search features
- Creator and DJ workflows

Growth should wait until the identification loop shows real lift over one-shot matching.
