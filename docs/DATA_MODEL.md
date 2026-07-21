# Data Model

## Core Entities

### users

Represents account holders, players, submitters, moderators, and admins.

Key fields:

- `id`
- `email`
- `display_name`
- `role`
- `created_at`
- `last_seen_at`

### samples

Represents submitted unknown audio snippets.

Key fields:

- `id`
- `owner_user_id`
- `status`
- `source_type`
- `failed_service`
- `duration_ms`
- `quality_score`
- `visibility`
- `created_at`
- `resolved_at`

Statuses:

- `uploaded`
- `processing`
- `unmatched`
- `candidate_found`
- `human_review`
- `verified`
- `rejected`
- `blocked_policy`

### audio_artifacts

Represents stored audio and derived files.

Key fields:

- `id`
- `sample_id`
- `artifact_type`
- `storage_key`
- `mime_type`
- `duration_ms`
- `checksum`
- `created_at`

Artifact types:

- `original`
- `normalized`
- `preview`
- `spectrogram`
- `fingerprint`
- `embedding`

### fingerprints

Stores acoustic fingerprint data and metadata.

Key fields:

- `id`
- `sample_id`
- `algorithm`
- `algorithm_version`
- `fingerprint_hash`
- `raw_payload_ref`
- `created_at`

### known_tracks

Represents licensed or otherwise approved known music records used for matching and game challenges.

Key fields:

- `id`
- `isrc`
- `artist`
- `title`
- `album`
- `release_year`
- `duration_ms`
- `genre`
- `rights_status`
- `created_at`

### track_artifacts

Represents audio snippets, fingerprints, embeddings, and metadata for known tracks.

Key fields:

- `id`
- `known_track_id`
- `artifact_type`
- `storage_key`
- `rights_scope`
- `source_name`
- `source_url`
- `territory`
- `expires_at`
- `can_cache`
- `can_clip`
- `can_download`
- `can_process_locally`
- `can_store_original`
- `can_store_derived`
- `can_use_public_game`
- `license_url`
- `license_text_snapshot`
- `provenance_checked_at`
- `created_at`

### audio_providers

Represents a provider adapter such as SoundCloud, iTunes previews, open catalogs, or direct uploads.

Key fields:

- `id`
- `provider_key`
- `display_name`
- `provider_type`
- `auth_required`
- `supports_search`
- `supports_url_resolution`
- `supports_seek`
- `supports_preview_url`
- `can_cache_audio_default`
- `can_cache_metadata_default`
- `terms_url`
- `created_at`

### provider_tracks

Represents a provider-specific track candidate normalized into the system.

Key fields:

- `id`
- `audio_provider_id`
- `known_track_id`
- `provider_track_id`
- `source_url`
- `playback_method`
- `title`
- `artist`
- `album`
- `duration_ms`
- `genre`
- `tags`
- `target_bitrate_kbps`
- `can_seek`
- `can_download_audio`
- `can_process_locally`
- `can_generate_clips`
- `can_cache_audio`
- `can_cache_metadata`
- `can_use_public_game`
- `commercial_use_allowed`
- `attribution_required`
- `rights_status`
- `license_url`
- `license_text_snapshot`
- `retrieved_at`
- `attribution_payload`
- `metadata_payload`
- `created_at`

### preview_chunks

Represents a playable chunk from an approved known-track preview.

Key fields:

- `id`
- `track_artifact_id`
- `known_track_id`
- `start_ms`
- `duration_ms`
- `chunk_order`
- `difficulty_hint`
- `rights_scope`
- `created_at`

### agent_runs

Represents one execution of one agent.

Key fields:

- `id`
- `sample_id`
- `agent_name`
- `agent_version`
- `status`
- `started_at`
- `finished_at`
- `input_payload`
- `output_payload`
- `error_code`
- `cost_cents`

### match_attempts

Represents an attempt to match a sample through a specific method or source.

Key fields:

- `id`
- `sample_id`
- `agent_run_id`
- `method`
- `source`
- `status`
- `created_at`

### candidate_tracks

Represents a possible answer for an unknown sample.

Key fields:

- `id`
- `sample_id`
- `known_track_id`
- `candidate_label`
- `overall_confidence`
- `fingerprint_score`
- `embedding_score`
- `metadata_score`
- `human_score`
- `source_score`
- `status`
- `created_at`
- `updated_at`

Statuses:

- `active`
- `rejected`
- `verified`
- `needs_review`

### candidate_evidence

Stores structured evidence for or against a candidate.

Key fields:

- `id`
- `candidate_track_id`
- `agent_run_id`
- `evidence_type`
- `score`
- `payload`
- `created_at`

### game_challenges

Represents a challenge shown to a player.

Key fields:

- `id`
- `challenge_type`
- `known_track_id`
- `sample_id`
- `difficulty`
- `max_reveal_steps`
- `choice_count`
- `created_at`

Challenge types:

- `known_multiple_choice`
- `unknown_ab`
- `unknown_multiple_choice`
- `expert_review`

### challenge_options

Represents options shown in a challenge.

Key fields:

- `id`
- `challenge_id`
- `known_track_id`
- `candidate_track_id`
- `label`
- `is_correct`
- `position`

For unresolved unknown samples, `is_correct` may be null.

### challenge_responses

Represents a player response.

Key fields:

- `id`
- `challenge_id`
- `user_id`
- `selected_option_id`
- `response_ms`
- `reveal_step`
- `preview_chunk_id`
- `replay_count`
- `self_reported_confidence`
- `is_correct`
- `created_at`

### player_skill_profiles

Represents calibrated player expertise.

Key fields:

- `id`
- `user_id`
- `genre`
- `decade`
- `region`
- `rating`
- `sample_size`
- `updated_at`

### verification_decisions

Represents an aggregate decision about an unknown sample.

Key fields:

- `id`
- `sample_id`
- `candidate_track_id`
- `decision`
- `confidence`
- `human_vote_count`
- `expert_weighted_score`
- `decided_by`
- `created_at`

Decisions:

- `verified`
- `rejected`
- `inconclusive`
- `needs_more_review`

## Event Model

Use append-only events for important lifecycle changes.

Example event types:

- `sample.uploaded`
- `sample.processed`
- `agent.run_started`
- `agent.run_completed`
- `candidate.created`
- `candidate.score_updated`
- `challenge.completed`
- `verification.updated`
- `sample.verified`
- `sample.blocked`

Events make it easier to debug agent behavior and rebuild projections later.

## Data Retention

Recommended defaults:

- Retain account data until deletion request.
- Retain unresolved sample metadata while useful, subject to policy.
- Retain original audio only as long as allowed and necessary.
- Retain derived fingerprints and embeddings if legally permissible.
- Retain audit events for operational and legal defense.

Exact retention should be reviewed with counsel before production launch.
