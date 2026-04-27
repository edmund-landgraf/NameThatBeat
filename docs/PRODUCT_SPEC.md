# Product Spec

## One-Liner

`namethatbeat.com` turns failed music identification attempts into a persistent search problem and a playable human verification game.

## Problem

Music identification products usually behave as one-shot systems. A user records a sample, the service tries to match it, and if it fails, the sample is discarded or effectively abandoned.

That leaves value on the table:

- The sample may become identifiable later.
- Other users may have submitted similar samples.
- Partial metadata may narrow the search.
- Humans may recognize a fragment when machines cannot.
- Multiple weak signals may combine into a strong match.

## Target Users

### Casual players

People who enjoy music trivia and short audio challenges.

Needs:

- Fast, fun game rounds
- Familiar multiple-choice interactions
- Score, streaks, and progression
- Optional genre/decade filters

### Searchers

People trying to identify a specific unknown song.

Needs:

- Submit or import a failed sample
- See that the system keeps working over time
- Receive notifications when candidates appear
- Help validate possible matches

### Expert listeners

DJs, collectors, music fans, producers, radio archivists, and niche genre communities.

Needs:

- Filter by specialty
- Review difficult samples
- Build reputation
- Contribute high-signal judgments

### Operators and moderators

Internal team members responsible for data quality, abuse prevention, and verification.

Needs:

- Inspect samples and candidates
- Review confidence history
- Merge duplicates
- Suppress illegal or abusive content
- Override or finalize identifications

## Core Workflows

### 1. Failed Sample Ingestion

1. User records or uploads a sample.
2. Client captures source context where available: timestamp, location opt-in, device, failed service, user notes.
3. API creates a sample record.
4. Audio is uploaded to object storage through a signed URL.
5. Ingestion job normalizes and fingerprints the sample.
6. Agent workflow begins.

### 2. Async Candidate Discovery

1. Agents run fingerprint, embedding, catalog, and web/source searches.
2. Each match attempt writes structured evidence.
3. Candidates are scored and ranked.
4. If candidates cross a threshold, the sample enters human verification.
5. If confidence remains low, the sample stays in retry and clustering pools.

### 3. Known-Track Game

1. Player starts a round.
2. System selects a known track and distractors.
3. Player hears a tiny preview chunk from legally available game audio.
4. Player chooses from at least eight choices.
5. If players miss, the system reveals more of the preview or a different allowed chunk.
6. System records answer, latency, confidence, reveal step, and context.
7. Player receives feedback and score.

### 4. Solo Practice Mode

1. Player selects genres they know well or want to practice.
2. System selects easy tracks from those genres.
3. Player hears a 10-second chunk.
4. Player chooses from at least eight choices.
5. If wrong, the system reveals another 10-second chunk.
6. Round ends when the player answers correctly, skips, fails, or runs out of chunks.

### 5. Unknown Sample A/B Verification

1. Agent narrows an unknown sample to two or more likely candidates.
2. Qualified players hear the unknown snippet.
3. Player compares candidate snippets or metadata.
4. System records preference and confidence.
5. Aggregation model updates candidate confidence.

## MVP Scope

### Must Have

- User accounts
- Upload or submit failed audio sample
- Audio normalization and feature extraction
- Sample status page
- Background job pipeline
- Candidate table with evidence
- Solo practice mode with genre selection
- Easy classical seed catalog
- Known-track multiple-choice game with at least eight choices
- Progressive reveal of tiny preview chunks
- Basic A/B verification for uncertain samples
- Admin dashboard for samples and candidates

### Should Have

- Duplicate detection
- User expertise scoring by genre/decade
- Notifications for candidate updates
- Spectrogram and waveform display
- Rate limits and abuse reporting

### Later

- Mobile app
- Browser extension or share-sheet capture flow
- Direct integrations with music identification services, if legally and technically available
- Public leaderboards
- Community playlists
- API for partners

## Success Metrics

### Identification Metrics

- Percent of unknown samples with at least one candidate
- Percent of unknown samples verified
- Median time to first candidate
- Median time to verified match
- False positive rate after verification

### Game Metrics

- Daily active players
- Rounds per active player
- Completion rate
- Repeat play rate
- Accuracy by difficulty
- Average reveal step before correct answer
- Guess rate by number of answer choices
- Human verification agreement rate

### Data Quality Metrics

- Duplicate sample rate
- Low-quality audio rate
- Candidate disagreement rate
- Moderator override rate
- Abuse report rate

## Product Risks

- Copyright and licensing constraints around storing and replaying music snippets
- Preview availability varying by track, artist, territory, and source terms
- Poor quality recordings reducing matching performance
- Bot activity contaminating human verification
- Low player volume for obscure samples
- Overconfidence from weak automated evidence

## MVP Principle

The MVP should optimize for learning whether persistent search plus human comparison produces better outcomes than one-shot identification. It should avoid expensive catalog licensing, heavy ML training, or complex marketplace mechanics until that loop is proven.
