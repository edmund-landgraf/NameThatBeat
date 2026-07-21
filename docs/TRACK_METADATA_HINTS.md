# Track Metadata And Hints

NameThatBeat should capture narrative metadata because it can make the game more playable after wrong guesses without turning the first screen into trivia.

Hints are not shown at the start of a round. The first planned reveal point is after the second wrong guess.

## Metadata Sources

For SoundCloud tracks, capture:

- uploader name
- title
- description
- genre
- tags
- label metadata
- publisher metadata
- writer or composer metadata
- album or release metadata
- playlist title when the track came from a playlist result

Later enrichment agents can add:

- artist biography
- producer credits
- album context
- release history
- chart or cultural context
- instrumentation
- era, region, or scene
- similar recordings

## Hint Rules

Hints must not reveal the answer directly.

Before display, hints should remove or mask:

- exact track title
- exact artist/uploader name
- known album title if it is identical to the answer
- obvious URL slugs

Examples of acceptable hints:

- `The SoundCloud genre is jazz.`
- `Tags include piano, instrumental, lounge.`
- `SoundCloud surfaced this track from a playlist result.`
- `The upload includes label metadata.`

Examples to avoid:

- `This is Vivaldi - The Four Seasons - Summer.`
- `The uploader is the correct artist.`
- `This track appears on the exact album title shown in the answer choice.`

## Gameplay Use

Initial state:

- no metadata hint
- only answer choices are visible

After first wrong guess:

- no narrative hint
- play another 10-second chunk

After second wrong guess:

- reveal one sanitized hint
- allow another 10-second chunk

Future versions can reveal a second hint after the fourth wrong guess and a stronger hint after the sixth wrong guess.

## Storage Shape

Track metadata should be stored separately from the answer label so the game can decide what is safe to reveal.

Suggested fields:

```text
track_metadata.id
track_metadata.track_id
track_metadata.source
track_metadata.genre
track_metadata.tags
track_metadata.description
track_metadata.publisher_metadata_json
track_metadata.playlist_context
track_metadata.narrative_hints_json
track_metadata.created_at
track_metadata.updated_at
```

The raw source metadata should be retained for agent enrichment, but only sanitized hints should be sent to the game client during a round.
