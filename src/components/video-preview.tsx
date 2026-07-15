'use client';

import { formatDuration, formatViews } from '@/lib/youtube';
import type { VideoMetadata } from '@/lib/youtube';

interface VideoPreviewProps {
  video: VideoMetadata;
}

export function VideoPreview({ video }: VideoPreviewProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="relative">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full rounded-lg shadow-lg"
          />
          <span className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
            {formatDuration(video.lengthSeconds)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-white leading-tight">
          {video.title}
        </h2>

        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span>{video.author}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-600" />
          <span>{formatViews(video.viewCount)} views</span>
        </div>

        {video.uploadDate && (
          <p className="text-xs text-zinc-500">
            Uploaded {new Date(video.uploadDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}

        {video.description && (
          <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
            {video.description}
          </p>
        )}
      </div>
    </div>
  );
}
