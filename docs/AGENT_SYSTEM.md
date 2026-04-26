# Agent System

## Goal

The agent system keeps working after a one-shot music identification attempt fails. It should treat every unmatched sample as an evolving investigation with evidence, retries, candidates, and human verification.

## Design Principles

- **Persistent:** samples are not discarded after failure.
- **Explainable:** agents write evidence and reasoning signals, not opaque guesses.
- **Asynchronous:** workflows can run over minutes, days, or weeks.
- **Multi-strategy:** no single matching method is trusted as sufficient.
- **Human-aware:** agents know when to ask people for comparison.
- **Auditable:** every attempt is logged with inputs, outputs, version, and confidence.

## Agent Types

### 1. Fingerprint Agent

Uses acoustic fingerprinting against available known catalogs.

Inputs:

- Chromaprint fingerprint
- Duration
- Sample quality metrics

Outputs:

- Candidate tracks
- Match offsets
- Fingerprint confidence
- Source catalog

### 2. Embedding Similarity Agent

Compares learned or handcrafted audio embeddings.

Inputs:

- Audio embeddings
- Chroma/tempo features
- Known-track embedding index

Outputs:

- Nearest known tracks
- Similar unknown samples
- Distance metrics

### 3. Metadata Context Agent

Uses user-provided and capture metadata.

Inputs:

- User notes
- Approximate time/place if user opted in
- Source app or platform
- Device metadata
- Genre guesses

Outputs:

- Candidate search constraints
- Weighted hints
- Possible event/location context

### 4. Catalog Search Agent

Searches licensed, public, or partner metadata catalogs.

Inputs:

- Extracted lyrics fragments, if available and legally permitted
- Tempo/key/genre hints
- Text notes
- Prior candidates

Outputs:

- Candidate tracks
- Artist/title metadata
- Source links
- Catalog identifiers

### 5. Web Discovery Agent

Searches approved web sources for public clues, depending on policy.

Inputs:

- User notes
- Possible lyrics
- Candidate titles/artists
- Scene/context clues

Outputs:

- Supporting evidence
- Contradicting evidence
- New metadata leads

This agent must respect robots.txt, terms of service, rate limits, and copyright policy.

### 6. Cluster Agent

Finds related unknown samples.

Inputs:

- Unknown sample embeddings
- Fingerprints
- User/context metadata

Outputs:

- Duplicate groups
- Similar sample clusters
- Shared candidate sets

### 7. Human Routing Agent

Decides whether and how to ask players for help.

Inputs:

- Candidate scores
- Candidate separation
- Sample quality
- Player expertise profiles
- Required confidence threshold

Outputs:

- A/B challenge
- Multiple-choice challenge
- Expert review task
- Moderator escalation

## Workflow Stages

### Stage 1: Intake

- Validate file
- Normalize audio
- Extract fingerprints
- Extract features
- Compute quality metrics
- Check duplicate and near-duplicate samples

### Stage 2: First-Pass Matching

- Run fingerprint lookup
- Run embedding nearest-neighbor search
- Compare with known catalog
- Compare with existing unknown clusters

### Stage 3: Candidate Expansion

- Enrich top candidates
- Search adjacent tracks, remixes, covers, live versions, slowed/sped-up versions
- Look for samples with similar tempo/key/chroma profile

### Stage 4: Candidate Scoring

Score candidates using:

- Fingerprint alignment
- Embedding distance
- Tempo/key agreement
- Metadata agreement
- Source reliability
- Historical agent accuracy
- Human verification results

### Stage 5: Human Verification

Trigger human verification when:

- There are two to five plausible candidates
- The top candidate is not decisive
- Human comparison is likely to add information
- The audio is safe and allowed for playback

### Stage 6: Resolution

A sample can become:

- `unmatched`
- `candidate_found`
- `human_review`
- `verified`
- `rejected`
- `needs_more_data`
- `blocked_policy`

## Confidence Model

Each candidate should have separate component scores:

- `fingerprint_score`
- `embedding_score`
- `metadata_score`
- `human_score`
- `source_score`
- `recency_score`
- `overall_confidence`

Avoid collapsing everything into one score too early. Operators need to know why a candidate is winning.

## Human Feedback Weighting

Human responses should be weighted by:

- Player accuracy on known-track challenges
- Genre/decade expertise
- Response time
- Consistency
- Prior agreement with verified outcomes
- Bot/fraud risk

Do not treat raw vote count as truth.

## Agent Run Record

Every agent run should capture:

- Agent name
- Agent version
- Input artifact IDs
- External sources queried
- Started and finished timestamps
- Error state
- Output candidates
- Evidence payload
- Cost metrics where relevant

## Failure Handling

Common failures:

- Audio too short
- Audio too noisy
- Copyright or policy block
- External API timeout
- Rate limit
- Candidate ambiguity
- No catalog coverage

Agents should write structured failure reasons so the system can retry intelligently.

## MVP Agent Set

Start with:

1. Audio quality and fingerprint agent
2. Embedding similarity agent
3. Candidate scoring agent
4. Human routing agent
5. Cluster/duplicate agent

Add external web discovery only after legal and source policies are defined.
