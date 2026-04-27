# Audio Sources

## Goal

NameThatBeat should play short, source-approved windows of audio without storing more audio than needed. For solo mode, the first useful target is a 10-second playable window selected from a source track.

The game does not need high-fidelity audio. For testing and early gameplay, aim for sources around **128 kbps or better**. Lower quality may be acceptable for internal experiments, but 128 kbps is a reasonable default target for public solo rounds.

## SoundCloud Source Strategy

SoundCloud can be used as an initial playable source when the track owner has made the audio available for streaming and the usage complies with SoundCloud terms and the uploader's rights.

Example source:

```text
https://soundcloud.com/portlandchambermusicfest/vivaldi-four-seasons-summer
```

The app should treat SoundCloud as a streaming source, not as a file host to copy from.

## Playback Options

Two implementation paths are acceptable:

1. **Widget/API playback**
   - Embed the SoundCloud player.
   - Use the player API to seek to the requested offset.
   - Stop playback after 10 seconds.

2. **Source URL plus offset metadata**
   - Store the SoundCloud URL on the track.
   - Store requested windows such as `1:04-1:14` and `2:53-3:03`.
   - Use the playback layer to seek to those offsets.

The product should not assume that a normal SoundCloud URL itself can permanently encode an exact 10-second clip. The safer model is: URL identifies the source track; app metadata identifies the start and end times.

## Window Tracking

The game should track requested windows locally so a player does not repeatedly get overlapping chunks from the same source track.

Example windows:

- `1:04-1:14`
- `2:53-3:03`
- `3:21-3:31`

Local storage key:

```text
ntb_audio_windows_v1
```

Suggested record:

```json
{
  "https://soundcloud.com/portlandchambermusicfest/vivaldi-four-seasons-summer": [
    { "start_seconds": 64, "end_seconds": 74, "track_id": "classical_vivaldi_four_seasons_summer", "requested_at": "2026-04-26T00:00:00.000Z" },
    { "start_seconds": 173, "end_seconds": 183, "track_id": "classical_vivaldi_four_seasons_summer", "requested_at": "2026-04-26T00:00:00.000Z" }
  ]
}
```

## Non-Overlap Rule

When selecting a new 10-second chunk for a player:

1. Load prior windows for the source URL from localStorage.
2. Prefer the track's planned window for the current reveal step.
3. If that window overlaps a previously requested window for the same source URL, choose another planned window.
4. If all planned windows overlap, allow reuse only after the round set ends or after a configurable cooldown.

Two windows overlap if:

```text
start_a < end_b && start_b < end_a
```

## Seed Metadata

A track with SoundCloud support should include:

- `audio_source_status`
- `audio_sources`
- target quality such as `target_bitrate_kbps: 128`
- `chunk_plan` windows with `start_seconds` and `duration_seconds`

Example:

```json
{
  "audio_source_status": "source_url_available",
  "audio_sources": [
    {
      "source_name": "soundcloud",
      "track_url": "https://soundcloud.com/portlandchambermusicfest/vivaldi-four-seasons-summer",
      "playback_method": "widget_api_seek",
      "target_bitrate_kbps": 128,
      "can_stream": true,
      "can_cache": false
    }
  ],
  "chunk_plan": [
    { "order": 1, "start_seconds": 64, "duration_seconds": 10, "hint": "1:04-1:14" },
    { "order": 2, "start_seconds": 173, "duration_seconds": 10, "hint": "2:53-3:03" }
  ]
}
```

## Product Rule

The source track URL identifies where audio comes from. The game records exactly which time window was requested. The app should keep enough local and server-side telemetry to avoid repeated overlap and to measure which excerpts are too easy or too hard.
