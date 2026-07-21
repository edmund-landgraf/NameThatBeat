# SoundCloud Selection Module

The selection module turns a user-entered genre, tag, or keyword string into a 10-track game pool.

Examples:

- `classical`
- `jazz`
- `piano jazz`
- `bass jazz`
- `piano classical`

## Source Strategy

For now, SoundCloud controls relevance. NameThatBeat does not try to classify or rank the catalog beyond basic game eligibility.

The selector:

1. Searches SoundCloud tracks with the user query.
2. Searches SoundCloud playlists with the same query.
3. Pulls usable tracks directly from track results.
4. Pulls usable tracks from returned playlist results.
5. Fetches playlist details through `/playlists/:id` when playlist search results do not include track payloads.
6. Deduplicates by SoundCloud track id.
7. Requires at least 10 playable or preview tracks.
8. Randomly selects 10 tracks for the game pool.

If fewer than 10 usable tracks are found, the UI asks the user to revise the query string.

## Eligibility

A track is eligible when:

- SoundCloud marks access as `playable` or `preview`.
- Duration is at least 10 seconds.
- A permalink URL exists for widget playback.
- Title and uploader name are present.

Blocked tracks are excluded.

## API Boundary

Local route:

```text
GET /api/soundcloud/select?q=piano%20jazz&count=10&limit=50
```

Server environment:

```text
SOUNDCLOUD_CLIENT_ID=...
SOUNDCLOUD_CLIENT_SECRET=...
SOUNDCLOUD_REDIRECT_URI=http://127.0.0.1:3000/api/soundcloud/auth/callback
```

The route calls SoundCloud from the server, not from the browser, so tokens are not exposed.

## Game Pool Output

Each selected track includes:

- SoundCloud id
- title
- artist/uploader name
- answer label
- source URL
- access level
- duration
- discovery source: direct track result or playlist result
- playlist context when applicable
- genre, tags, description, and publisher metadata when available
- generated 10-second chunk windows
- sanitized narrative hints

The visible game answer choices use labels. The hidden player uses the source URL.

## Open Risks

SoundCloud playlist search behavior may differ from the public web search UI. If the official API does not return enough playlist track payloads for a query, the fallback is to use direct track results only and ask the user for a broader query.

SoundCloud API availability and token access level will determine how much metadata and playlist detail is returned.
