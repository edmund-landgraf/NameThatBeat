# Solo Game Mode

## Goal

Solo mode lets one player practice music identification against tracks selected by genre and difficulty. It is the simplest playable version of `namethatbeat.com` and should be the first mode used to test game feel, catalog data, audio chunking, scoring, and answer-choice generation.

## Player Flow

1. Player chooses one or more genres they feel good at, or chooses genres they want to practice.
2. Player starts a solo round set.
3. System selects an easy track from the chosen genre pool.
4. Player hears a 10-second chunk.
5. Player chooses from at least eight answer choices.
6. If correct, the round ends and the next track begins.
7. If wrong, the player hears another 10-second chunk from the same track.
8. The round continues until the player answers correctly, runs out of chunks, skips, or fails the round.

## Initial Genre Selection

For the first test version, use broad genre buckets:

- Classical
- Rock
- Pop
- Hip-hop
- Electronic
- Jazz
- Country
- R&B
- Latin
- Film and TV

The initial seeded playable genre should be **Classical** because it has recognizable public-domain compositions and well-known canonical works.

## Difficulty

Start with three levels:

- `easy`
- `medium`
- `hard`

### Easy

Easy tracks should be widely recognizable and should use famous sections when possible.

Classical examples:

- Beethoven - Symphony No. 5, I. Allegro con brio
- Beethoven - Fur Elise
- Vivaldi - The Four Seasons: Spring, I. Allegro
- Mozart - Eine kleine Nachtmusik, I. Allegro
- Tchaikovsky - 1812 Overture
- Bach - Toccata and Fugue in D minor
- Handel - Messiah: Hallelujah Chorus
- Rossini - William Tell Overture: Finale

### Medium

Medium tracks can be famous but less immediately obvious, or use less iconic chunks.

### Hard

Hard tracks can include less familiar works, similar-sounding distractors, obscure movements, or chunks away from the hook.

## Chunk Rules

Default solo mode uses 10-second chunks.

Recommended round budget:

- Chunk 1: 10 seconds
- Chunk 2: another 10 seconds from a different section when available
- Chunk 3: another 10 seconds, preferably a more recognizable section
- Maximum exposed audio: 30 seconds per round for MVP testing

The system should store which chunk caused recognition.

For tracks with less preview audio available:

- Use fewer chunks.
- Prefer the most recognizable allowed section for `easy`.
- Mark the round as unavailable if the preview cannot support a fair challenge.

## Answer Choices

Solo multiple-choice rounds should use at least eight choices.

For classical tracks, answer choices can be either:

- Work title only, such as `Fur Elise`
- Composer plus work, such as `Beethoven - Fur Elise`
- Composer, work, and movement when needed, such as `Vivaldi - The Four Seasons: Spring, I. Allegro`

Recommended MVP format: `Composer - Work or movement`.

Distractors should be plausible:

- Same genre
- Similar era where possible
- Similar instrumentation where possible
- Similar familiarity level
- Avoid two choices that differ only by obscure movement naming until users can inspect metadata clearly

## Scoring

Use a simple score first:

- Correct on chunk 1: 100 points
- Correct on chunk 2: 60 points
- Correct on chunk 3: 30 points
- Skip or fail: 0 points
- Wrong answer penalty: optional for MVP; record wrong answers even if score is not penalized

Track:

- Accuracy
- Average chunk before correct answer
- Genre selected
- Difficulty
- Time to answer
- Wrong choices
- Replays

## Round State

Suggested round state:

```json
{
  "roundId": "round_123",
  "mode": "solo",
  "genre": "classical",
  "difficulty": "easy",
  "trackId": "classical_beethoven_symphony_5_mvt_1",
  "currentChunkIndex": 0,
  "maxChunks": 3,
  "choiceCount": 8,
  "status": "awaiting_answer"
}
```

## MVP Seed Data

Use [../seeds/classical_easy_tracks.json](../seeds/classical_easy_tracks.json) as the first test catalog.

The seed file intentionally separates track metadata from audio URLs. Before implementation, each seed track needs an approved preview source with rights metadata.

## Implementation Notes

The first implementation can be deterministic:

- Pick `classical`.
- Pick `easy`.
- Shuffle the easy classical seed list.
- Select one correct track.
- Select seven distractors from the same seed list.
- Reveal chunks in declared order.

Do not build adaptive difficulty until the basic loop feels good.

## Open Questions

- Should a wrong answer immediately reveal the next chunk, or should the player be allowed to keep guessing after hearing the same chunk?
- Should the UI show composer names before the first answer, or only work titles?
- Should easy classical use the most famous section first, or start slightly before the famous section?
- Should a solo round set be 5 tracks, 10 tracks, or endless?
