import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export async function POST(request: NextRequest) {
  try {
    const { url, quality } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!ytdl.validateURL(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    console.log('Processing URL:', url);
    console.log('Requested quality:', quality);
    
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s-]/gi, '').trim() || 'video';
    
    console.log('Video title:', title);
    console.log('Available formats:', info.formats.length);
    
    // Find format based on quality selection
    let selectedFormat;
    
    if (quality === 'highest') {
      // Try to get highest quality with both video and audio
      selectedFormat = ytdl.chooseFormat(info.formats, { 
        quality: 'highest',
        filter: 'audioandvideo'
      });
    } else if (quality === 'lowest') {
      // Get lowest quality
      selectedFormat = ytdl.chooseFormat(info.formats, { 
        quality: 'lowest',
        filter: 'audioandvideo'
      });
    } else {
      // Find specific quality (e.g., "720p", "1080p")
      const qualityFormats = info.formats.filter(format => 
        format.qualityLabel === quality && format.hasVideo && format.hasAudio
      );
      
      if (qualityFormats.length > 0) {
        selectedFormat = qualityFormats[0];
      } else {
        // Fallback to highest quality if specific quality not found
        selectedFormat = ytdl.chooseFormat(info.formats, { 
          quality: 'highest',
          filter: 'audioandvideo'
        });
      }
    }

    console.log('Selected format:', selectedFormat.qualityLabel, selectedFormat.container);

    const stream = ytdl(url, { format: selectedFormat });
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      let hasResolved = false;
      
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        if (hasResolved) return;
        hasResolved = true;
        
        const buffer = Buffer.concat(chunks);
        console.log('Download complete, buffer size:', buffer.length);
        
        resolve(new NextResponse(buffer, {
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment; filename="${title}.mp4"`,
            'Content-Length': buffer.length.toString(),
          },
        }));
      });

      stream.on('error', (error) => {
        if (hasResolved) return;
        hasResolved = true;
        
        console.error('Stream error:', error);
        resolve(NextResponse.json({ 
          error: `Failed to download video: ${error.message}` 
        }, { status: 500 }));
      });
      
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          resolve(NextResponse.json({ 
            error: 'Download timeout - video may be too large or unavailable' 
          }, { status: 408 }));
        }
      }, 300000); // 5 minute timeout
    });

  } catch (error) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: `Failed to process video: ${errorMessage}` 
    }, { status: 500 });
  }
}