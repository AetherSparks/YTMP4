export interface FormatInfo {
  quality: string;
  container: string;
  filesize: string | null;
  hasAudio: boolean;
  hasVideo: boolean;
  itag: number;
  label: string;
  needsFfmpeg: boolean;
}

export interface VideoMetadata {
  title: string;
  author: string;
  lengthSeconds: string;
  viewCount: string;
  uploadDate: string;
  description: string;
  thumbnail: string;
  videoId: string;
  formats: FormatInfo[];
}

export function formatDuration(seconds: string): string {
  const total = parseInt(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatViews(count: string): string {
  const num = parseInt(count);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}
