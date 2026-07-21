export type RightsStatus =
  | "public_domain"
  | "cc_by"
  | "cc_by_sa"
  | "cc_nc"
  | "cc_nd"
  | "provider_stream_ok"
  | "unknown"
  | "blocked";

export type PlaybackMethod = "soundcloud_widget" | "html5_stream";

export type ProviderTrack = {
  provider: "internet_archive" | "soundcloud";
  providerTrackId: string;
  sourceUrl: string;
  pageUrl: string;
  title: string;
  artistName: string;
  genre: string | null;
  durationSeconds: number;
  licenseUrl: string | null;
  rightsStatus: RightsStatus;
  playbackMethod: PlaybackMethod;
  attributionText: string;
  qualityScore: number;
};
