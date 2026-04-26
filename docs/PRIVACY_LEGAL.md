# Privacy, Copyright, and Legal Notes

This is not legal advice. The product has meaningful copyright, privacy, and platform-policy risk, so counsel should review the operating model before production launch.

## Main Risk Areas

### Copyright

The product stores and replays music snippets. Even short clips can raise copyright issues depending on source, jurisdiction, licensing, and use.

Questions to resolve:

- Can users upload unknown snippets?
- How long can originals be retained?
- Can snippets be replayed to other users?
- Can known-track game snippets be played without licenses?
- Can commerce-preview audio from music purchase sites be cached, chunked, transformed, or replayed inside the game?
- Do preview rights vary by storefront, artist, label, track, or territory?
- Are fingerprints and embeddings treated differently from source audio?
- What takedown process is required?

Recommended posture:

- Use licensed, public-domain, or explicitly permitted preview audio for known-track game content.
- Treat music purchase site previews as source-specific permissions, not as blanket rights.
- Keep user-submitted unknown samples private by default.
- Generate short normalized previews only where policy allows.
- Build takedown and rights-holder contact flows early.
- Track rights status at the artifact level, not only the track level.

### Privacy

Audio recordings may contain:

- Background conversations
- Location clues
- Personal habits
- Device metadata
- User notes with personal information

Controls:

- Require user consent for uploads.
- Make location optional and off by default.
- Strip unnecessary metadata from files.
- Avoid public exposure of unresolved samples by default.
- Give users deletion controls.
- Limit internal access by role.

### Music Identification Service Data

If the platform imports failed attempts from services such as Shazam, the integration must respect those services' terms and platform rules.

Avoid:

- Scraping private app data without user consent.
- Circumventing technical protections.
- Misrepresenting affiliation.
- Using third-party APIs outside their terms.

### Web Discovery

Agents that search the web need strict boundaries.

Controls:

- Respect robots.txt and site terms.
- Rate limit requests.
- Store source URLs and timestamps.
- Avoid storing copyrighted text beyond what is permitted.
- Prefer metadata and links over copied content.

## Policy Requirements

Before public launch, define:

- Terms of service
- Privacy policy
- Copyright policy
- DMCA or takedown process
- Acceptable use policy
- Community guidelines
- Data retention policy
- Child safety policy if minors may use the product

## Product Safeguards

### Upload Safeguards

- File type validation
- Duration limits
- Malware scanning
- Audio quality checks
- Metadata stripping
- Abuse reporting
- Rate limits

### Playback Safeguards

- Signed URLs
- Short clip duration
- Progressive reveal that uses the smallest practical audio chunk first
- Per-source checks for whether preview audio can be cached, clipped, transformed, or streamed only
- No direct public bucket access
- Watermarking or access logging where appropriate
- Rights-aware playback checks

### Moderation Safeguards

- Moderator queue for flagged samples
- Automated detection of speech-heavy uploads
- Blocked content states
- Audit logs for staff actions
- Takedown workflow

## Data Minimization

Collect only what helps identification or gameplay:

- Audio sample
- Optional user notes
- Optional context tags
- Failed service name
- Timestamp
- Coarse region only if explicitly useful and consented

Avoid collecting precise location unless there is a clear product need.

## Recommended MVP Legal Position

For the MVP:

- Use licensed, public-domain, cleared, or terms-compliant commerce-preview audio for known-track game rounds.
- Model preview rights explicitly before caching or replaying storefront audio.
- Keep unknown user uploads private to the submitter and internal reviewers.
- Use human verification only with audio that has been cleared for that use or with carefully reviewed policy.
- Store fingerprints, features, and embeddings for search, subject to legal review.
- Do not build broad public browsing of unknown samples until rights and privacy policies are settled.
