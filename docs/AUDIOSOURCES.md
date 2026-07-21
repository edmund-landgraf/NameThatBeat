# Audio Sources And Providers

## Goal

NameThatBeat needs short playable audio windows for game rounds and, later, for agent verification. The product does not need high fidelity. A practical target is **128 kbps or better**, with 10-second chunks and enough metadata to build fair answer choices.

The architecture should use an **audio providers** layer. SoundCloud is one provider, not the core dependency.

## Provider Contract

Every provider adapter should answer the same questions:

- Can we discover tracks by query, tag, genre, artist, playlist, or URL?
- Can we play a 10-second window without storing the full track?
- Can we seek to a time offset?
- Can we cache audio, metadata, or derived chunks?
- Can we download the source audio for local processing?
- Can we transform the file into normalized clips, waveforms, fingerprints, or embeddings?
- Can we show attribution?
- Can we use the track in a game context?
- What metadata is available for hints?
- What rate limits, auth, and legal terms apply?

Suggested provider result:

```json
{
  "provider": "soundcloud",
  "provider_track_id": "123",
  "source_url": "https://soundcloud.com/example/track",
  "title": "Track title",
  "artist": "Artist or uploader",
  "album": null,
  "duration_seconds": 180,
  "genre": "jazz",
  "tags": ["piano", "jazz"],
  "playback_method": "embedded_widget_seek",
  "can_seek": true,
  "can_download_audio": false,
  "can_transform_audio": false,
  "can_cache_audio": false,
  "can_cache_metadata": true,
  "target_bitrate_kbps": 128,
  "rights_status": "provider_terms",
  "chunk_windows": [
    { "start_seconds": 64, "duration_seconds": 10 }
  ]
}
```

## Provider Types

### 1. Embedded Streaming Providers

Use when the provider allows embedded playback and seeking.

Examples:

- SoundCloud widget
- YouTube iframe player
- Bandcamp embedded players, where allowed

Strengths:

- No audio files need to be stored.
- Easier legal posture than downloading.
- Works well for known URLs.

Limitations:

- Search APIs may require credentials.
- Widget UI can leak metadata unless hidden or controlled carefully.
- Exact seek accuracy and autoplay behavior vary by browser/provider.
- Provider terms may restrict games, caching, or commercial use.

MVP use:

- Good for manually seeded tracks.
- Good for proof-of-concept rounds.
- Not reliable as the only discovery layer.

### 2. Official Catalog APIs With Preview Audio

Use APIs that expose official preview URLs or catalog metadata.

Examples:

- Apple Music API and iTunes Search API previews
- Spotify Web API preview URLs where present
- Deezer preview URLs
- MusicBrainz metadata plus provider-specific preview links

Strengths:

- Structured metadata.
- Often includes artist, album, ISRC, artwork, release date, genre.
- Preview URLs are designed for short samples.

Limitations:

- Preview availability varies by territory and track.
- Some platforms no longer expose preview URLs broadly.
- Terms may restrict game use or caching.
- Auth and rate limits vary.

MVP use:

- Strong candidate for known-track game data when previews are available.
- Use as metadata enrichment even when audio is unavailable.

### 3. Purchase And Commerce Preview Providers

Use stores that expose short previews for tracks being sold.

Examples:

- iTunes/Apple preview clips
- 7digital previews
- Qobuz or other stores if preview terms allow
- Beatport previews for electronic genres, subject to terms

Strengths:

- Previews are intentionally short.
- Quality is usually sufficient for game use.
- Metadata is commerce-grade.

Limitations:

- Terms need careful review.
- Preview length and availability vary.
- API access may be paid or restricted.

MVP use:

- Good fit for the 10-second reveal model if terms permit.

### 4. Open-Licensed Audio Catalogs

Use catalogs where audio is explicitly licensed for reuse.

Examples:

- Free Music Archive
- Jamendo
- Internet Archive audio collections
- Wikimedia Commons audio
- Musopen for public-domain classical

Strengths:

- Clearer rights story.
- Audio can often be cached and transformed.
- Good for initial public game seeds.
- Local processing is viable when the license allows downloading, clipping, and derivative artifacts.

Limitations:

- Catalog quality and metadata consistency vary.
- Famous commercial tracks may be absent.
- Genre coverage may be uneven.
- Some "free" tracks are only free for personal listening and may not allow public game playback.

MVP use:

- Best source for legally safer seeded game content.
- Especially useful for classical and public-domain testing.

### 4a. Free Personal-Use Downloads

Use sources that allow free personal-use downloads only for local development, private testing, or internal evaluation unless the license also grants public redistribution or public performance rights.

Examples:

- Artist pages offering free MP3 downloads for personal use
- Netlabel releases with non-commercial Creative Commons terms
- Free sample packs with explicit personal-use language
- Public-domain recordings from archive sources

Strengths:

- Enables local software manipulation.
- Allows exact 10-second chunk generation.
- Supports waveform, loudness normalization, fingerprints, embeddings, and quality analysis.
- Removes dependence on provider seek precision.

Limitations:

- Personal-use permission is not automatically public game permission.
- Non-commercial licenses may not fit a monetized product.
- No-derivatives licenses may block clipping or transformed audio.
- Attribution requirements can be strict.

MVP use:

- Good for local prototype catalogs and internal testing.
- Only use publicly in the game when the license explicitly permits that use.

Local processing steps:

1. Download the source file into controlled storage.
2. Record source URL, license text, and retrieval date.
3. Verify license flags: personal use, commercial use, redistribution, derivatives, attribution.
4. Normalize loudness with FFmpeg.
5. Generate 10-second chunks.
6. Generate fingerprints, embeddings, waveform, and quality metrics.
7. Store derived artifacts only if rights flags allow it.
8. Keep takedown and provenance metadata attached to every artifact.

### 5. Direct Artist Or Label Uploads

Use audio uploaded by rights holders or partners.

Examples:

- Artist uploads to NameThatBeat
- Label-provided preview packs
- Public-domain recordings uploaded by curators

Strengths:

- Best rights control.
- Can generate exact 10-second chunks.
- Can normalize audio and compute fingerprints.

Limitations:

- Requires acquisition workflow.
- Smaller catalog initially.
- Need moderation and provenance tracking.

MVP use:

- Ideal for controlled test sets and future partnerships.

### 6. User-Submitted Unknown Samples

Use snippets from failed identification services.

Examples:

- Failed Shazam-style samples
- User-uploaded mystery clips
- Field recordings of music playing nearby

Strengths:

- Core product differentiator.
- Feeds agent matching and human verification.

Limitations:

- Higher legal and privacy risk.
- Need retention limits.
- Need audio processing, fingerprinting, and moderation.
- Not a primary source for known-answer solo game rounds until resolved.

MVP use:

- Keep separate from known-track game audio.
- Use later for A/B candidate verification.

### 7. Generated Or Synthetic Audio

Use generated audio only for internal testing, not for real music identification.

Examples:

- Synthetic tones
- Procedural loops
- Internal fixture audio

Strengths:

- No rights issue for test fixtures.
- Useful for player state, timer, playback, and scoring tests.

Limitations:

- Not useful for real music gameplay.
- Can distort UX assumptions.

MVP use:

- Testing only.

## Provider Evaluation Matrix

| Provider Type | Discovery | 10s Seek | Download/Process | Cache Audio | Metadata | Rights Confidence | MVP Fit |
| --- | --- | --- | --- | --- | --- | --- |
| SoundCloud widget | Known URL, API if credentialed | Yes | No | No | Medium | Terms-dependent | Good for manual seeds |
| YouTube iframe | Search/API if credentialed | Yes | No | No | Medium | Terms-dependent | Possible, but metadata leaks/ads matter |
| Apple/iTunes previews | API search | Preview URL | No by default | Usually no | High | Terms-dependent | Strong candidate |
| Deezer previews | API search | Preview URL | No by default | Usually no | High | Terms-dependent | Strong candidate |
| Free personal-use downloads | Web/manual | Yes after download | Internal only unless license allows | Internal only unless license allows | Medium | License-specific | Good for local testing |
| Open catalogs | API/search varies | Yes if file access | Often yes | Often yes | Medium | Higher | Best safe seed source |
| Direct uploads | Internal | Yes | Yes | Yes | High if curated | Highest | Best controlled source |
| Unknown samples | Internal | Yes | Limited | Limited | Low until resolved | Risky | Core later workflow |

## Audio Provider Service

Introduce an `audio_provider` module with provider adapters.

Responsibilities:

- Search provider catalogs.
- Resolve pasted URLs.
- Normalize provider metadata.
- Generate candidate 10-second windows.
- Report capability flags.
- Avoid storing audio when provider terms disallow caching.
- Store provider ids and URLs separately from internal track ids.

Initial adapters:

- `manual_soundcloud_url`
- `itunes_preview_search`
- `open_catalog_seed`
- `free_download_local`
- `direct_upload`

Deferred adapters:

- `soundcloud_api_search`
- `youtube_iframe`
- `spotify_metadata`
- `deezer_preview`
- `bandcamp_embed`

## Selection Rules

For solo game rounds:

1. Query a provider or load a seeded provider set.
2. Require at least 10 eligible tracks.
3. Pick 10 answer choices from the result set.
4. Pick one correct track.
5. Select a non-overlapping 10-second window.
6. Reveal hints only after gameplay thresholds.

For known-answer game content, prefer providers with:

- clear preview playback
- 128 kbps or better
- reliable seeking or preview URLs
- enough metadata for answer labels
- terms that allow interactive playback

## Legal And Product Notes

Do not assume that public availability means game-use rights.

For each provider, store:

- provider terms URL/version reviewed
- cache policy
- attribution requirements
- commercial-use restrictions
- territory limits
- takedown process

When in doubt, use provider-hosted playback rather than downloading or caching audio.

## Local Download And Processing Policy

Downloading is allowed only when the provider or license explicitly permits it for the intended environment.

Use separate flags for:

- `can_download_audio`
- `can_process_locally`
- `can_generate_clips`
- `can_store_original`
- `can_store_derived`
- `can_use_public_game`
- `commercial_use_allowed`
- `attribution_required`

Personal-use-only downloads should be marked:

```text
rights_status=personal_use_only
can_use_public_game=false
can_store_original=true for local/dev only
can_store_derived=true for local/dev only
```

Public-domain or permissive-license tracks can be promoted when provenance is recorded and license terms allow game playback.
