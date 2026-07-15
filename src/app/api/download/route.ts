import { NextRequest, NextResponse } from 'next/server';
import { validateUrl, sanitizeFilename, getVideoInfo, createCombinedStream, createFfmpegStream } from '@/lib/youtube-server';

export async function POST(request: NextRequest) {
  try {
    const { url, quality } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!validateUrl(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const info = await getVideoInfo(url);
    const filename = sanitizeFilename(info.title);

    const selectedFormat = info.formats.find(f => f.quality === quality);

    if (!selectedFormat || selectedFormat.needsFfmpeg) {
      const { stream, contentLength } = await createFfmpegStream(url);
      const size = await contentLength;

      const headers: Record<string, string> = {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}.mp4"`,
      };
      if (size) {
        headers['Content-Length'] = size.toString();
      }

      return new Response(stream, { headers });
    }

    const stream = await createCombinedStream(url, selectedFormat.itag);

    const headers: Record<string, string> = {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}.mp4"`,
    };

    return new Response(stream, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to download video: ${message}` },
      { status: 500 }
    );
  }
}
