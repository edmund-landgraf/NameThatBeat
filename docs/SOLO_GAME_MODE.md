# Solo Game Mode

## Goal

Solo mode lets one player practice music identification against tracks selected by genre and difficulty. It is the simplest playable version of `namethatbeat.com` and should be the first mode used to test game feel, catalog data, audio chunking, scoring, and answer-choice generation.

## Player Flow

1. Player chooses one or more genres they feel good at, or chooses genres they want to practice.
2. Player starts a solo round set.
3. System selects an easy track from the chosen genre pool.
4. Player hears a 10-second chunk.
5. Player chooses from exactly eight answer choices for the MVP.
6. If correct, the round ends and the next track begins.
7. If wrong, that choice is eliminated and the player hears another 10-second chunk from the same track.
8. The player can keep guessing until they identify the track, skip, or eliminate seven wrong answers.
9. If the player eliminates seven wrong answers, the eighth remaining choice is correct and the player gets 0 points.

## Player Instructions

Solo mode rules:

1. Pick a genre and difficulty.
2. Listen to 10 seconds of audio.
3. Choose from 8 possible answers.
4. A correct first answer earns the maximum score.
5. Each wrong answer reveals another 10 seconds and lowers the possible score.
6. Earlier correct answers are worth more points.
7. If you make 7 wrong guesses, the last remaining answer is correct, but the round is worth 0 points.
8. Skip any round you do not want to guess.

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

Easy tracks should be widely recognizable and should use famous sections when possible. Easy answer choices should be very different from each other, such as metal versus pop, classical versus hip-hop, or piano solo versus electronic dance music.

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

Medium tracks can be famous but less immediately obvious, use less iconic chunks, or include moderately related distractors.

### Hard

Hard tracks can include less familiar works, similar-sounding distractors, obscure movements, or chunks away from the hook. Hard answer choices should come from the same or similar genre when possible.

## Chunk Rules

Default solo mode uses 10-second chunks. The first 10-second chunk is played before the player sees or answers the eight choices.

Recommended round budget:

- Chunk 1: 10 seconds
- Chunk 2 and later: another 10 seconds after each wrong answer
- Maximum exposed audio: enough chunks to support up to seven wrong guesses where preview rights allow

The system should store which chunk caused recognition.

For tracks with less preview audio available:

- Use fewer chunks.
- Prefer the most recognizable allowed section for `easy`.
- Mark the round as unavailable if the preview cannot support a fair challenge.

## Answer Choices

Solo multiple-choice rounds should use exactly eight choices for the MVP.

For classical tracks, answer choices can be either:

- Work title only, such as `Fur Elise`
- Composer plus work, such as `Beethoven - Fur Elise`
- Composer, work, and movement when needed, such as `Vivaldi - The Four Seasons: Spring, I. Allegro`

Recommended MVP format: `Composer - Work or movement`.

Distractors should be controlled by difficulty:

- `easy`: choices should be highly distinct across genre, instrumentation, era, or style.
- `medium`: choices can share one or two traits, such as era or instrumentation.
- `hard`: choices should be in the same or similar genre and can be intentionally confusable.

For classical-only seed testing, easy distractors may still come from the classical seed list until cross-genre seed data exists. Once multiple genres are seeded, easy classical rounds should include more obviously different choices.

General distractor rules:

- Same genre
- Similar era where possible
- Similar instrumentation where possible
- Similar familiarity level
- Avoid two choices that differ only by obscure movement naming until users can inspect metadata clearly

## Scoring

Use a simple score first:

- Correct first answer after first 10 seconds: 100 points
- Correct after later chunks: fewer points
- Each wrong answer lowers the possible score
- Seven wrong answers leaves only the correct answer and scores 0 points
- Skip or fail: 0 points

Track:

- Accuracy
- Average chunk before correct answer
- Wrong guesses before correct answer
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
  "wrongGuessCount": 0,
  "maxWrongGuesses": 7,
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
- Keep the eight choices stable for the full round.
- Eliminate wrong choices as the player guesses.
- Reveal another 10-second chunk after every wrong guess.

Do not build adaptive difficulty until the basic loop feels good.

## Open Questions

- Should the UI show composer names before the first answer, or only work titles?
- Should easy classical use the most famous section first, or start slightly before the famous section?
- Should a solo round set be 5 tracks, 10 tracks, or endless?
