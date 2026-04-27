# Solo Game Mode

## Goal

Solo mode lets one player practice music identification against tracks selected by genre and difficulty. It is the simplest playable version of `namethatbeat.com` and should be the first mode used to test game feel, catalog data, audio chunking, scoring, and answer-choice generation.

## Player Flow

1. Player chooses a genre they feel good at, such as Classical or Jazz.
2. The game says, in effect, "Identify these 5 tracks."
3. The system builds a 5-track set from the chosen genre.
4. For each track, the player is shown 8 possible answers before audio plays.
5. Each answer includes track/work title plus artist or composer, such as `Vivaldi - The Four Seasons: Summer`.
6. The player presses Play.
7. The player hears 10 seconds of audio.
8. The player can enter a choice at any time after the first play.
9. If correct, the round ends and the next track begins.
10. If wrong, that choice is eliminated and the player can press Play again for the next 10-second chunk.
11. The player can keep guessing until they identify the track, skip, or eliminate seven wrong answers.
12. If the player eliminates seven wrong answers, the eighth remaining choice is correct and the player gets 0 points.

## Player Instructions

Solo mode rules:

1. Pick a genre and difficulty.
2. The game starts a 5-track set for that genre.
3. Look at the 8 possible answers.
4. Press Play to hear 10 seconds of audio.
5. Choose an answer any time after audio starts.
6. If wrong, press Play again for another 10 seconds.
7. A correct first answer earns the maximum score.
8. Each wrong answer reveals another 10 seconds and lowers the possible score.
9. Earlier correct answers are worth more points.
10. If you make 7 wrong guesses, the last remaining answer is correct, but the round is worth 0 points.
11. Skip any round you do not want to guess.

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

Default solo mode uses 10-second chunks. The player sees the eight choices first, then presses Play to hear each 10-second chunk.

Recommended round budget:

- Chunk 1: 10 seconds
- Chunk 2 and later: another 10 seconds after each wrong answer, triggered by the player's next Play press
- Maximum exposed audio: enough chunks to support up to seven wrong guesses where preview rights allow

The system should store which chunk caused recognition.

When using SoundCloud or another stream source, each chunk should be represented as a source URL plus a time window, such as `1:04-1:14` or `2:53-3:03`. The client should record requested windows in localStorage so the same player does not repeatedly receive overlapping windows from the same source track.

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

Use [../seeds/solo_tracks.json](../seeds/solo_tracks.json) as the first solo test catalog. It starts with 5 classical tracks and 5 jazz tracks.

The seed file intentionally separates track metadata from audio URLs where source URLs are not approved yet. Before public gameplay, each seed track needs an approved preview source with rights metadata. Aim for source quality around 128 kbps or better.

## Implementation Notes

The first implementation can be deterministic:

- Pick `classical`.
- Pick `easy`.
- Select one correct track from the chosen genre.
- Select seven distractors from all easy seeded tracks.
- Keep the eight choices stable for the full round.
- Eliminate wrong choices as the player guesses.
- Enable the next 10-second Play after every wrong guess.

Do not build adaptive difficulty until the basic loop feels good.

## Open Questions

- Should the UI show composer names before the first answer, or only work titles?
- Should easy classical use the most famous section first, or start slightly before the famous section?
- Should a solo round set be 5 tracks, 10 tracks, or endless?
