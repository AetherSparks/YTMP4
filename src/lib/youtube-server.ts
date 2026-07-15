import ytdl from '@distube/ytdl-core';
import { spawn } from 'child_process';
import { Readable, Writable } from 'stream';
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
};

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('429') && attempt < maxRetries - 1) {
        const delay = (attempt + 1) * 3000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
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

export async function createCombinedStream(
  url: string,
  itag?: number,
): Promise<ReadableStream> {
  const stream = itag
    ? ytdl(url, { ...commonOptions, quality: itag })
    : ytdl(url, {
        ...commonOptions,
        quality: 'highest',
        filter: 'audioandvideo',
      });

  const nodeStream = stream as unknown as Readable;

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

export async function createFfmpegStream(
  url: string,
): Promise<{
  stream: ReadableStream;
  contentLength: Promise<number | null>;
}> {
  const videoStream = ytdl(url, {
    ...commonOptions,
    quality: 'highestvideo',
    filter: 'videoonly',
  }) as unknown as Readable;

  const audioStream = ytdl(url, {
    ...commonOptions,
    quality: 'highestaudio',
    filter: 'audioonly',
  }) as unknown as Readable;

  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-i',
      'pipe:3',
      '-i',
      'pipe:4',
      '-map',
      '0:v',
      '-map',
      '1:a',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-movflags',
      'frag_keyframe+empty_moov',
      '-f',
      'mp4',
      'pipe:1',
    ],
    {
      stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'pipe'],
    },
  );

  videoStream.pipe(ffmpeg.stdio[3] as Writable);
  audioStream.pipe(ffmpeg.stdio[4] as Writable);

  const stdout = ffmpeg.stdio[1] as Readable;

  const stream = new ReadableStream({
    start(controller) {
      stdout.on('data', (chunk: Buffer) => controller.enqueue(chunk));
      stdout.on('end', () => controller.close());
      stdout.on('error', (err) => controller.error(err));
    },
    cancel() {
      videoStream.destroy();
      audioStream.destroy();
      ffmpeg.kill();
    },
  });

  const contentLength = new Promise<number | null>((resolve) => {
    setTimeout(() => {
      const v = videoStream as unknown as {
        response?: { headers?: Record<string, string> };
      };
      const a = audioStream as unknown as {
        response?: { headers?: Record<string, string> };
      };
      const videoSize = parseInt(
        v.response?.headers?.['content-length'] || '0',
      );
      const audioSize = parseInt(
        a.response?.headers?.['content-length'] || '0',
      );
      resolve(videoSize + audioSize > 0 ? videoSize + audioSize : null);
    }, 2000);
  });

  return { stream, contentLength };
}
