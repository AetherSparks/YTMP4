import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo, validateUrl } from '@/lib/youtube-server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!validateUrl(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const video = await getVideoInfo(url);

    return NextResponse.json({ video });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to get video info: ${message}` },
      { status: 500 }
    );
  }
}
