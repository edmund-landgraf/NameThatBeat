# Web App Design

## Product Shape

`namethatbeat.com` should feel like a music game on the surface and a persistent identification system underneath.

The first screen should take users directly into the product:

- Play a quick known-track challenge.
- Submit an unknown sample.
- Check the status of a previous sample.

Avoid a marketing-heavy landing page for the MVP. The product itself is the pitch.

## Primary Navigation

Top-level areas:

- **Play** - known-track challenges and daily rounds
- **Solo** - single-player practice by genre and difficulty
- **Identify** - upload or manage unknown samples
- **Verify** - A/B comparisons and expert queues
- **Library** - user's submitted samples and resolved matches
- **Profile** - stats, expertise, settings
- **Admin** - internal operations, hidden unless authorized

## Key Screens

### Play

Purpose: fast entry into the game.

Core elements:

- Audio player
- At least eight answer choices
- Progressive reveal control for tiny preview chunks
- Score and streak
- Genre/decade filters
- Result state after answering

Design notes:

- The audio player should be visually central.
- Answer buttons should be large enough for mobile.
- Eight choices should remain scannable on mobile through compact stacked rows.
- The next reveal should feel like part of the round, not a page transition.
- The user should be able to replay, but replay count should be recorded.
- Feedback should be immediate for known-track rounds.

### Solo

Purpose: let one player practice against genre-selected easy tracks.

Core elements:

- Genre picker
- Difficulty picker, starting with easy
- 10-second audio chunk player
- At least eight answer choices
- Next-chunk reveal after wrong answers
- Score, streak, and chunk count

Design notes:

- Make Classical the first seeded genre for testing.
- Show that more audio is available after a wrong answer.
- Record which chunk led to recognition.
- Keep the answer list stable across reveals.

### Identify

Purpose: submit a failed music identification sample.

Core elements:

- Upload or record control
- Failed service selector, such as Shazam, SoundHound, or other
- Optional notes
- Consent and rights confirmation
- Processing state after submission

Design notes:

- Set expectations that matching may take time.
- Do not imply guaranteed identification.
- Explain status through concrete states: processing, searching, candidates found, needs review, verified.

### Sample Status

Purpose: show persistent search progress.

Core elements:

- Sample playback where allowed
- Status timeline
- Candidate list when available
- Confidence indicators
- User actions: add notes, confirm, reject, delete, report issue

Design notes:

- Show evidence without overclaiming.
- Use "possible match" language until verified.
- Make it clear when agents are still working.

### Verify

Purpose: collect human comparison signals.

Core elements:

- Unknown sample player
- Candidate A/B players or candidate cards
- "A", "B", "Neither", and "Not sure" actions
- Optional confidence input

Design notes:

- Keep the task short.
- Avoid leaking metadata that makes guessing trivial unless that metadata is intentionally part of the challenge.
- Route difficult samples to players with relevant demonstrated skill.

### Profile

Purpose: show user progress and calibrate expertise.

Core elements:

- Accuracy
- Streaks
- Genre strengths
- Decade strengths
- Submitted sample history
- Notification settings

### Admin

Purpose: operate the matching system.

Core elements:

- Sample queue
- Agent run history
- Candidate evidence
- Human vote distribution
- Moderation flags
- Manual verification tools

Design notes:

- Optimize for dense, scannable information.
- Show timestamps, agent versions, and evidence sources.
- Make destructive actions explicit and audited.

## UI Components

Reusable components:

- AudioPlayer
- WaveformPreview
- RevealStepper
- ChallengeCard
- AnswerChoice
- CandidateComparison
- ConfidenceMeter
- StatusTimeline
- SampleUploader
- AgentRunTable
- EvidencePanel
- ModerationBanner

## Responsive Behavior

Mobile:

- Single-column layout
- Sticky audio controls during challenges
- Large tap targets
- Minimal metadata during rounds

Desktop:

- Wider comparison layouts
- Side-by-side candidate views
- Richer admin tables
- Keyboard shortcuts for reviewers

## Visual Direction

The app should feel music-native but not nightclub-themed.

Recommended direction:

- Dark or neutral base with strong contrast
- Clear waveform and playback visuals
- Restrained accent colors for status and interaction
- Dense admin surfaces with minimal decoration
- Album-art-style imagery only when licensed or generated for placeholder use

Avoid:

- Overly decorative hero sections
- Fake album art for real tracks
- Visuals that imply a song is verified before it is
- Public display of unresolved user uploads without policy approval

## First MVP Routes

Suggested routes:

- `/` - playable quick challenge plus submit entry point
- `/play` - known-track game
- `/solo` - solo practice mode
- `/identify` - upload or record unknown sample
- `/samples` - user's submitted samples
- `/samples/:id` - sample status and candidates
- `/verify` - human verification queue
- `/profile` - player stats and settings
- `/admin` - internal dashboard

## Product Tone

Use direct, concrete language:

- "No match yet"
- "Still searching"
- "Possible match"
- "Needs more votes"
- "Verified match"

Avoid:

- "The AI knows"
- "Guaranteed match"
- "Solved" before verification
- Overly apologetic failed states

## MVP Design Constraint

The MVP should prioritize a polished audio challenge loop and a trustworthy sample status view. Those two screens are the product promise: play music trivia now, and let the system keep working on unknown songs over time.
