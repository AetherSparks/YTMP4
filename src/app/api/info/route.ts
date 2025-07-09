import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!ytdl.validateURL(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    console.log('Getting info for URL:', url);
    
    const info = await ytdl.getInfo(url);
    
    console.log('Total formats available:', info.formats.length);
    
    // Get all video formats (including video-only)
    const videoFormats = info.formats
      .filter(format => format.hasVideo)
      .map(format => ({
        quality: format.qualityLabel || `${format.height}p`,
        container: format.container,
        filesize: format.contentLength,
        hasAudio: format.hasAudio,
        itag: format.itag,
        type: format.hasAudio ? 'video+audio' : 'video-only'
      }))
      .filter((format, index, self) => 
        index === self.findIndex(f => f.quality === format.quality && f.type === format.type)
      )
      .sort((a, b) => {
        const aRes = parseInt(a.quality?.replace('p', '') || '0');
        const bRes = parseInt(b.quality?.replace('p', '') || '0');
        return bRes - aRes;
      });

    console.log('Video formats found:', videoFormats.map(f => `${f.quality} (${f.type})`));

    const videoInfo = {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      lengthSeconds: info.videoDetails.lengthSeconds,
      viewCount: info.videoDetails.viewCount,
      uploadDate: info.videoDetails.uploadDate,
      description: info.videoDetails.description?.substring(0, 200) + '...',
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
      videoId: info.videoDetails.videoId,
      availableQualities: videoFormats
    };

    console.log('Video info retrieved:', videoInfo.title);
    
    return NextResponse.json({ video: videoInfo });

  } catch (error) {
    console.error('Info error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: `Failed to get video info: ${errorMessage}` 
    }, { status: 500 });
  }
}