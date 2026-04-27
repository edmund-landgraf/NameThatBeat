# Game Design

## Purpose

The game has two jobs:

1. Be enjoyable enough that people play repeatedly.
2. Produce useful human judgments for ambiguous music identification.

The product should separate normal game rounds from verification rounds internally, while keeping the player experience simple.

## Core Modes

### Solo Practice

The player chooses genres they know well or want to practice, then plays tracks in a single-player loop. Each round starts with 10 seconds of audio and 8 choices. Wrong guesses eliminate choices, reveal more audio, and reduce the score. If the player makes 7 wrong guesses, the last remaining choice is correct and the round scores 0.

Useful for:

- Fast MVP testing
- Player calibration
- Genre preference collection
- Seed catalog validation

### Classic Multiple Choice

The player hears a very small preview chunk from a known track and chooses the correct answer from at least eight options. If no player identifies the track, the round reveals more audio or switches to a different preview chunk.

Useful for:

- Entertainment
- Skill measurement
- Player calibration
- Distractor testing

### A/B Candidate Match

The player hears an unknown sample and compares it against two candidate tracks or snippets.

Prompt examples:

- Which candidate sounds more like the sample?
- Are these the same recording?
- Is this a remix, cover, live version, or unrelated?

Useful for:

- Ambiguous agent outputs
- Candidate ordering
- Remix/cover detection

### Expert Queue

Experienced players can review harder samples in genres where they have proven skill.

Useful for:

- Niche genres
- Low-confidence candidates
- Samples with poor audio quality

## Round Structure

### Solo Practice Round

1. Player selects one or more genres.
2. System selects an easy track from that pool.
3. Player hears a 10-second chunk.
4. Player chooses from 8 answer choices.
5. If wrong, that answer is eliminated and the next 10-second chunk is revealed.
6. Continue until correct, skipped, or 7 wrong guesses leave the correct answer.
7. Award more points for earlier correct answers.
8. Award 0 points if the player reaches the final remaining answer.
9. Record the chunk number and wrong-guess count that led to the correct answer.

### Known-Track Round

1. Show compact player UI.
2. Play the smallest useful chunk, often 1-3 seconds.
3. Present at least eight answer choices.
4. Capture answer, latency, chunk number, replay count, and confidence if asked.
5. If nobody answers correctly, reveal a longer chunk or a different chunk from the same preview source.
6. Continue until a player answers correctly, the available preview budget is exhausted, or the round times out.
7. Reveal result.
8. Update score, streak, and expertise profile.

### Unknown Verification Round

1. Play unknown snippet.
2. Play candidate A and candidate B, or show candidate options.
3. Ask for the closest match or "neither" where appropriate.
4. Capture response, latency, replay count, and uncertainty.
5. Do not reveal sensitive or unresolved truth as final.

## Preview Audio Source

Known-track game audio should prefer legally available commerce previews from music purchase or streaming preview sources. Many stores expose short preview segments for tracks being sold, and the available preview duration varies by artist, label, track, territory, and platform policy.

`namethatbeat.com` does not need much audio to run a good challenge. The game should treat each preview as a limited audio budget and reveal it sparingly.

Important rules:

- Store source, rights status, territory, and expiration metadata for every preview.
- Do not assume that a preview available on one storefront can be cached, transformed, or replayed without restrictions.
- Track how much of a preview has been exposed in a round.
- Prefer tiny chunks before longer excerpts.
- Support multiple chunks from different parts of the available preview when allowed.

## Progressive Reveal

Progressive reveal is the default known-track mechanic.

Round example:

1. Start with a 1-second chunk.
2. If both head-to-head players miss, reveal a second 1-2 second chunk.
3. If both still miss, either extend the first chunk or play a different allowed chunk.
4. Continue until one player guesses correctly or the round reaches its reveal limit.

This produces better difficulty control than always playing the same fixed-length snippet. It also reduces audio usage while preserving the game experience.

For multiplayer head-to-head rounds:

- Both players hear the same chunk.
- Lock guesses after each reveal step.
- Award more points for earlier identification.
- Record which chunk caused recognition.

For solo multiple-choice rounds:

- Reveal additional chunks after incorrect answers, skipped answers, or timeout.
- Reduce score as more chunks are revealed and wrong guesses accumulate.
- Keep answer options stable during a round.
- Disable wrong choices after selection.
- Treat the eighth remaining choice as correct but worth 0 points.

## Difficulty

Difficulty can be controlled by:

- Snippet length
- Number of chunks revealed
- Whether the next reveal extends the same audio or jumps to another section
- Hook versus obscure section
- Distractor similarity
- Genre familiarity
- Track popularity
- Audio quality
- Whether metadata is shown

## Distractor Strategy

Good distractors make the game fun and the data useful.

Multiple-choice challenges should use at least eight choices by default. Four-choice rounds are too easy to guess and produce weaker calibration data.

Solo difficulty should mainly change distractor similarity:

- Easy: choices should be very different, such as metal versus pop or classical versus hip-hop.
- Medium: choices can share some traits, such as era, tempo, instrumentation, or popularity.
- Hard: choices should come from the same or similar genre and can be intentionally confusable.

Distractors should be selected by:

- Same genre
- Similar era
- Similar artist popularity
- Similar tempo/key
- Similar instrumentation
- Commonly confused artist or title

Avoid obviously wrong choices in serious calibration rounds.

If the available UI space is tight, use an eight-choice layout with compact rows, search-style filtering for expert modes, or a two-stage selection such as artist first and track second. Do not reduce to four choices just to simplify layout.

## Player Expertise Model

Track expertise by:

- Genre
- Decade
- Region
- Language
- Popularity tier
- Instrumental/vocal
- Mainstream versus obscure

Signals:

- Accuracy
- Response time
- Earliest recognized chunk
- Replay count
- Confidence
- Consistency
- Performance on control questions

## Verification Aggregation

For unknown samples, aggregate:

- Weighted votes
- Agreement rate
- Expert agreement
- Control-question performance
- Candidate separation
- "Neither" rate
- Time-to-choice distribution

Example outcome:

- Candidate A wins 72% raw vote
- Expert-weighted vote is 84%
- Fast responses favor A
- "Neither" rate is low
- Agent fingerprint score also favors A

That should increase confidence more than a simple majority vote.

## Anti-Abuse

Risks:

- Bot voting
- Users farming points without listening
- Coordinated false answers
- Copyright abuse through uploads
- Guessing based on metadata leaks

Controls:

- Known-answer calibration rounds
- Rate limits
- Replay and latency anomaly detection
- Hidden control challenges
- Reputation weighting
- Moderation queue
- Conservative unresolved-sample display

## Rewards

Start simple:

- Score
- Streak
- Accuracy
- Genre badges
- Daily challenge

Avoid overbuilding economy mechanics before the verification loop is proven.

## UX Principles

- The audio player is the primary interface.
- Rounds should start quickly.
- Choices should be large and readable.
- Replay should be allowed but recorded.
- Verification rounds should feel like game rounds, not unpaid moderation.
- The system should not claim a final answer until confidence is high.

## MVP Game

Build:

- Solo practice mode with genre selection
- Easy classical seed set
- Eight-choice known-track challenge
- Progressive reveal using tiny preview chunks
- Basic score and streak
- Genre/decade filter
- A/B verification round
- Player accuracy profile
- Admin view of verification results

Defer:

- Global leaderboards
- Social sharing
- Teams
- Complex achievements
- Real-money rewards
