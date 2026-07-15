'use client';

import { useState, type FormEvent } from 'react';
import { UrlInput } from '@/components/url-input';
import { VideoPreview } from '@/components/video-preview';
import { QualitySelect } from '@/components/quality-select';
import { DownloadButton } from '@/components/download-button';
import type { VideoMetadata } from '@/lib/youtube';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [selectedQuality, setSelectedQuality] = useState('');

  const handleGetInfo = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setVideo(null);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch video info');

      setVideo(data.video);
      const combined = data.video.formats.find((f: { needsFfmpeg: boolean }) => !f.needsFfmpeg);
      setSelectedQuality(combined?.quality || data.video.formats[0]?.quality || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url || !selectedQuality) return;

    setIsDownloading(true);
    setError('');

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, quality: selectedQuality }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Download failed');
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${video?.title || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setVideo(null);
    setError('');
    setSelectedQuality('');
  };

  const hasFfmpegFormats = video?.formats.some(f => f.needsFfmpeg);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-start justify-center p-4 pt-12 md:pt-24">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            yt<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">mp4</span>
          </h1>
          <p className="text-zinc-500 text-sm">
            YouTube to MP4 converter — paste a link to get started
          </p>
        </div>

        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 space-y-6">
          <UrlInput
            value={url}
            onChange={setUrl}
            onSubmit={handleGetInfo}
            isLoading={isLoading}
            hasVideo={!!video}
            onReset={handleReset}
          />

          {error && (
            <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {video && (
            <>
              <div className="border-t border-zinc-700/50 pt-6">
                <VideoPreview video={video} />
              </div>

              <div className="border-t border-zinc-700/50 pt-6 space-y-4">
                <QualitySelect
                  formats={video.formats}
                  value={selectedQuality}
                  onChange={setSelectedQuality}
                  disabled={isDownloading}
                />

                {hasFfmpegFormats && (
                  <div className="bg-amber-900/20 border border-amber-800/30 text-amber-400 text-xs rounded-lg p-3">
                    HD+ qualities are processed server-side and may take longer to download.
                  </div>
                )}

                <DownloadButton
                  onClick={handleDownload}
                  isDownloading={isDownloading}
                  quality={selectedQuality}
                  disabled={!selectedQuality}
                />
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-zinc-600 text-center">
          Only download videos you own or have permission to download.
        </p>
      </div>
    </div>
  );
}
