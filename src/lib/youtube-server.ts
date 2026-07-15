import ytdl from '@distube/ytdl-core';
import { exec as ytdlExec } from 'youtube-dl-exec';
import { Readable } from 'stream';
import type { FormatInfo, VideoMetadata } from './youtube';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const commonOptions: ytdl.downloadOptions = {
  requestOptions: {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Mode': 'navigate',
    },
  },
  playerClients: ['WEB_EMBEDDED', 'TV'],
};

const RETRY_DELAYS = [5000, 15000, 30000];

async function fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const message = err instanceof Error ? err.message : '';
      if (message.includes('429') || message.includes('Status code')) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/gi, '').trim() || 'video';
}

function parseFormats(info: ytdl.videoInfo): FormatInfo[] {
  const formats: FormatInfo[] = [];

  for (const f of info.formats) {
    if (!f.hasVideo) continue;

    const qualityLabel = f.qualityLabel || `${f.height}p`;
    const isCombined = f.hasAudio && f.hasVideo;

    const alreadyExists = formats.some(
      (existing) =>
        existing.quality === qualityLabel && existing.needsFfmpeg === !isCombined,
    );
    if (alreadyExists) continue;

    formats.push({
      quality: qualityLabel,
      container: f.container || 'mp4',
      filesize: f.contentLength || null,
      hasAudio: f.hasAudio,
      hasVideo: true,
      itag: f.itag,
      label: isCombined
        ? `${qualityLabel} (combined)`
        : `${qualityLabel} (video only)`,
      needsFfmpeg: !isCombined,
    });
  }

  formats.sort((a, b) => {
    const aRes = parseInt(a.quality.replace('p', '')) || 0;
    const bRes = parseInt(b.quality.replace('p', '')) || 0;
    return bRes - aRes;
  });

  return formats;
}

export async function getVideoInfo(url: string): Promise<VideoMetadata> {
  const info = await fetchWithRetry(() => ytdl.getInfo(url, commonOptions));

  const thumbnails = info.videoDetails.thumbnails;
  const bestThumbnail =
    thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || '';

  return {
    title: info.videoDetails.title,
    author: info.videoDetails.author.name,
    lengthSeconds: info.videoDetails.lengthSeconds,
    viewCount: info.videoDetails.viewCount,
    uploadDate: info.videoDetails.uploadDate,
    description: info.videoDetails.description?.substring(0, 300) || '',
    thumbnail: bestThumbnail,
    videoId: info.videoDetails.videoId,
    formats: parseFormats(info),
  };
}

export function validateUrl(url: string): boolean {
  return ytdl.validateURL(url);
}

function nodeStreamToWeb(nodeStream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function createDownloadStream(
  url: string,
  quality: string,
): Promise<ReadableStream> {
  const height = parseInt(quality.replace('p', ''));

  const isHD = height > 720;

  const format = isHD
    ? `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]`
    : `best[height<=${height}][ext=mp4]`;

  const child = ytdlExec(url, {
    format,
    output: '-',
    mergeOutputFormat: 'mp4',
    noPart: true,
    noProgress: true,
    quiet: true,
  });

  return nodeStreamToWeb(child.stdout as unknown as Readable);
}
