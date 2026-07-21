# Gap Analysis: Name That Tune vs NameThatBeat

This document compares the classic and modern **Name That Tune** game-show format to **NameThatBeat** (namethatbeat.com): what ships today (v0.2 solo MVP), what exists only in product docs, and which gaps are worth closing for game feel versus which differences are intentional.

NameThatBeat is not affiliated with Name That Tune, Fox, or any Name That Tune rights holders. This is an internal product comparison only.

## 1. Purpose of the comparison

| | Name That Tune | NameThatBeat |
|---|---|---|
| **Primary job** | Entertainment spectacle: two contestants race to identify songs for cash | Music ID + verification: turn failed matches into persistent search, with games that produce useful human signals |
| **Win condition** | Beat opponent; advance to bonus for large prize | Identify tracks (and later candidates); build skill/trust signals over time |
| **Audio role** | Live band / controlled melody cues | Streamed previews / progressive windows from licensed or approved sources |

The comparison is useful because players will mentally map NameThatBeat to “Name That Tune online.” Gaps in competitive pacing, note scarcity, and free-response naming affect retention even when the long-term product is identification infrastructure.

## 2. Name That Tune reference model

Based on the well-known television format (classic runs and the Fox revival). Details vary by season; the durable pillars are:

### Head-to-head structure

- Two contestants per game (often two games per hour-long episode).
- Early rounds are often **toss-ups**: either player can buzz in.
- Wrong answers frequently open a steal for the opponent.
- Highest scorer after main play advances to a bonus round.

### Bid-a-Note (signature round)

1. Host gives a short clue (era, chart position, theme, artist type, etc.).
2. Contestants bid down how few **notes** they need: “I can name that tune in seven notes…” → fewer.
3. When challenged (“Name that tune!”), the low bidder hears only that many notes.
4. Correct answer wins the tune’s value; miss usually gives the opponent a chance (exact steal rules vary by era).

This is the core fantasy: **confidence under scarcity**.

### Golden Medley (bonus)

- Winner faces about **seven tunes in ~30 seconds**.
- Typically melody-forward (often no vocals / no title lyrics).
- Contestant buzzes, names the tune, or passes and may return if time remains.
- Wrong answer often ends the civilian bonus (money already earned may be kept, depending on version).
- Top prize historically framed around a large cash jackpot (e.g. $100,000 structure in modern Fox play).

### Audio and presentation

- Live band / band leader; controlled arrangement.
- Melody recognition over full-mix stream snippets.
- Host, staging, prizes, and episode pacing are part of the product.

## 3. NameThatBeat current state

### Implemented (v0.2 solo MVP)

Source of truth in code: [`../src/components/solo-game/solo-mvp-game.tsx`](../src/components/solo-game/solo-mvp-game.tsx), [`../src/lib/game/scoring.ts`](../src/lib/game/scoring.ts), [`../src/lib/catalog/build-solo-set.ts`](../src/lib/catalog/build-solo-set.ts).

| Aspect | Current behavior |
|---|---|
| Mode | Solo only |
| Set length | Target 5 tracks |
| Answers | Exactly 8 multiple-choice labels (when catalog is deep enough) |
| Audio | Player-triggered **10-second** progressive clips |
| Wrong answers | Eliminated; next Play unlocks; score drops (−15 from 100 per miss; 7 misses → 0) |
| Skip | Supported; 0 points |
| Catalog | Seed genres (classical, jazz) + difficulty; SoundCloud resolves missing sources |
| Window history | `localStorage` key `ntb_audio_windows_v1` avoids overlapping windows when possible |
| End state | Set summary with per-track points |

### Documented but not implemented

From [`GAME_DESIGN.md`](GAME_DESIGN.md), [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md), [`ROADMAP.md`](ROADMAP.md):

- Competitive / multiplayer modes
- A/B candidate verification for unknown samples
- Expert queues, accounts, leaderboards, streaks
- Upload / failed-sample ingestion and async agents
- Short 1–3 second opening chunks as a first-class known-track mode
- Free-response title entry
- Bid-style or note-count scarcity mechanics

## 4. Gap matrix

Status key:

- **Gap** — Name That Tune has it; NameThatBeat does not (or only in docs).
- **Partial** — related behavior exists but not the same mechanic.
- **Different by design** — intentional product divergence.
- **Ahead** — NameThatBeat has something NTT does not need.

| Dimension | Name That Tune | NameThatBeat today | Status | Notes |
|---|---|---|---|---|
| Competition | 1v1 head-to-head | Solo practice | **Gap** | Docs mention future modes; none ship |
| Answer format | Free-response song title (and often artist context) | Free-text first, then 8-choice fallback | **Partial** | Typed titles score normally; MC after miss or reveal |
| Scarcity mechanic | Bid down to N notes | Fixed 10s chunks; more audio after wrong guess | **Partial** | Progressive reveal exists; no bidding or note counts |
| Opening clip length | Often a few notes | First play **2s**, then 3→5→7→10s | **Partial** | Milestone 1 item 1 shipped; still not note-count bidding |
| Speed / buzz-in | Buzz race; Golden Medley timer | Untimed after first play | **Gap** | No clock, no buzz contention |
| Pre-audio clue | Host clue before Bid-a-Note | Hints after 2 wrong guesses | **Partial** | Hint timing is reverse of NTT |
| Melody-first audio | Band melody; title lyrics often avoided | Full SoundCloud/stream preview windows | **Different by design** | Rights and source model differ; melody extraction not built |
| Bonus speed round | Golden Medley (7 / 30s) | None | **Gap** | Strong retention feature if adapted carefully |
| Prizes / stakes | Cash, episode prizes | Points only (per round / set) | **Gap** | Leaderboards/streaks also missing |
| Host / social frame | Host + band leader + audience | Self-serve web UI | **Different by design** | Not a TV show; optional personality later |
| Catalog breadth | Broad pop/hits across decades | Classical + jazz seeds (live SC fill-in) | **Gap** | Hits/decade filters would match player expectations |
| Progressive elimination | Opponent steal / bidding pressure | Eliminate wrong MC options | **Partial** | Solo elimination ≠ competitive pressure |
| Skip / pass | Pass in Golden Medley, return if time | Skip track for 0 points | **Partial** | Skip exists; no timed return-to-pass |
| Skill measurement | Implicit via wins/money | Wrong-count + points; no persisted profile | **Gap** | Needed for expertise weighting later |
| Unknown-sample verification | N/A | Core product vision (A/B, agents) | **Ahead** | NTT has no ID pipeline |
| Persistent search | N/A | Roadmap (upload, agents, status) | **Ahead** | Primary differentiator |
| Rights / source tracking | Production music clearance | Seed status + SC OAuth; legal still open | **Different by design** | NTB must stay rights-conscious |

## 5. Intentional product differences (do not close blindly)

These are **not** bugs relative to Name That Tune:

1. **Identification platform, not a game-show clone** — upload, agents, candidate confidence, and human verification remain the north star ([`PRODUCT_SPEC.md`](PRODUCT_SPEC.md)).
2. **Multiple choice for verification utility** — structured choices produce cleaner training/expertise signals than free text alone; free text can be additive, not a full replacement.
3. **No live band / no TV host** — cost and format; stream windows and UI pacing substitute.
4. **Legal and rights posture** — progressive windows, approved seeds, and provider rules matter more than recreating a house band.
5. **Cash prizes and network spectacle** — out of scope for early product; cosmetic stakes (XP, streaks) are enough if gameplay feels sharp.

Closing entertainment gaps should **borrow the feel** (scarcity, speed, confidence) without copying trademarks, round names, or branded formats.

## 6. Priority recommendations

Ordered for retention and “Name That Tune energy” while staying on the NameThatBeat roadmap.

### P0 — Closest to NTT feel, low architecture cost (Milestone 1)

1. **Shorter first clip (1–3s), then grow** — **Done:** ladder `2 → 3 → 5 → 7 → 10` seconds per Play ([`../src/lib/game/scoring.ts`](../src/lib/game/scoring.ts)).
2. **Optional free-text title guess before MC** — **Done:** type title first; miss or “Show choices” opens 8-option MC ([`../src/lib/game/title-match.ts`](../src/lib/game/title-match.ts)).
3. **Expand hit / decade catalog** — **Done (seeds):** pop + rock easy tracks with decade fields in [`../seeds/solo_tracks.json`](../seeds/solo_tracks.json) (still need SoundCloud/approved URLs to play).

### P1 — Competitive pacing without full multiplayer infra

4. **Solo speed round (Medley-inspired)** — e.g. 5–7 tracks, 30–45s clock, buzz-to-lock answer, pass-and-return; no Bid-a-Note required. *(remaining)*
5. **Pre-play clue cards** — **Done (basic):** genre / decade / difficulty shown before first Play.
6. **Streaks + local/global leaderboard** — **Done (local):** streak + high score in `localStorage` (`ntb_solo_stats_v1`). Global board still remaining.

### P2 — True competitive / Bid-lite

7. **Async or realtime 1v1** — toss-up buzz or alternating turns on the same track set.
8. **Bid-a-Note-lite** — after a clue, player commits to hearing 1 / 2 / 3 / 5 seconds; lower commitment = higher multiplier; miss burns the round or drops to MC.
9. **Expert duel queues** — later ties into expertise scoring for verification ([`GAME_DESIGN.md`](GAME_DESIGN.md)).

### Stay deferred relative to NTT

- Live band emulation, host avatar, cash prizes, episode packaging.
- Trademarked round names (“Bid-a-Note”, “Golden Medley”) — invent NameThatBeat-native names if built.

## 7. Summary verdict

NameThatBeat’s solo MVP already shares the **identify-from-audio** core with Name That Tune, plus progressive reveal and scoring under uncertainty. The largest **gameplay** gaps are:

1. No competition or buzz race  
2. Multiple choice instead of naming the tune  
3. Long fixed clips instead of note/second scarcity and bidding  
4. No timed medley / speed bonus  
5. Narrow seed catalog vs hit-driven expectations  

The largest **product** advantages Name That Tune does not have (and should remain NTB priorities) are persistent failed-sample search, agents, and human verification of ambiguous candidates.

**Practical stance:** steal pacing and scarcity patterns from Name That Tune; do not aim to become a TV-format clone.

## 8. Sources

- [Name That Tune (Wikipedia)](https://en.wikipedia.org/wiki/Name_That_Tune) — format history, Bid-a-Note, Golden Medley  
- [FoxFlash — Name That Tune](https://www.foxflash.com/shows/name-that-tune/info/) — modern revival episode structure  
- [GameShows.com — How to Play](https://www.gameshows.com/name-that-tune/how-to-play) — Bid-a-Note player-facing rules summary  
- Internal: [`GAME_DESIGN.md`](GAME_DESIGN.md), [`SOLO_GAME_MODE.md`](SOLO_GAME_MODE.md), [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md), [`ROADMAP.md`](ROADMAP.md)
