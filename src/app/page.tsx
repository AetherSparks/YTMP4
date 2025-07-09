'use client';

import { useState } from 'react';

interface VideoInfo {
  title: string;
  author: string;
  lengthSeconds: string;
  viewCount: string;
  uploadDate: string;
  description: string;
  thumbnail: string;
  videoId: string;
  availableQualities: Array<{
    quality: string;
    container: string;
    filesize: string;
    hasAudio: boolean;
    itag: number;
    type: string;
  }>;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('highest');

  const formatDuration = (seconds: string) => {
    const mins = Math.floor(parseInt(seconds) / 60);
    const secs = parseInt(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M views`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K views`;
    }
    return `${num} views`;
  };

  const handleGetInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setVideoInfo(null);

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get video info');
      }

      const data = await response.json();
      setVideoInfo(data.video);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url) return;
    
    setIsDownloading(true);
    setError('');

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, quality: selectedQuality }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download video');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${videoInfo?.title || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setVideoInfo(null);
    setError('');
    setSelectedQuality('highest');
  };

  const getAvailableQualities = () => {
    if (!videoInfo) return [];
    
    const qualities = videoInfo.availableQualities
      .filter(q => q.hasAudio) // Only show formats with audio for download
      .map(q => q.quality)
      .filter((quality, index, self) => self.indexOf(quality) === index); // Remove duplicates
    
    return ['highest', 'lowest', ...qualities.filter(q => q !== 'highest' && q !== 'lowest')];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          YouTube to MP4 Converter
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <form onSubmit={handleGetInfo} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                YouTube URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading || !url}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Getting Info...
                  </>
                ) : (
                  'Get Video Info'
                )}
              </button>
              
              {videoInfo && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </form>

          {videoInfo && (
            <div className="mt-8 border-t pt-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full rounded-lg shadow-md"
                  />
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{formatDuration(videoInfo.lengthSeconds)}</span>
                    <span>{formatViewCount(videoInfo.viewCount)}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {videoInfo.title}
                  </h2>
                  
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Channel:</strong> {videoInfo.author}
                  </p>
                  
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Upload Date:</strong> {videoInfo.uploadDate}
                  </p>
                  
                  {videoInfo.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {videoInfo.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Available Qualities:
                    </p>
                    <div className="space-y-1">
                      {videoInfo.availableQualities.slice(0, 6).map((quality, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                        >
                          <span className="font-medium">{quality.quality}</span>
                          <span className={`px-1 py-0.5 rounded text-xs ${
                            quality.type === 'video+audio' 
                              ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' 
                              : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                          }`}>
                            {quality.type}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Download uses highest quality video + audio combined
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t space-y-4">
                <div>
                  <label htmlFor="quality" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Quality
                  </label>
                  <select
                    id="quality"
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isDownloading}
                  >
                    {getAvailableQualities().map((quality) => (
                      <option key={quality} value={quality}>
                        {quality === 'highest' ? 'Highest Available Quality' : 
                         quality === 'lowest' ? 'Lowest Quality (Fastest)' : 
                         `${quality} Quality`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200 flex items-center justify-center"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Downloading {selectedQuality === 'highest' ? 'Highest' : selectedQuality === 'lowest' ? 'Lowest' : selectedQuality} Quality...
                    </>
                  ) : (
                    `Download ${selectedQuality === 'highest' ? 'Highest' : selectedQuality === 'lowest' ? 'Lowest' : selectedQuality} Quality MP4`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>Enter a valid YouTube URL to preview and download the video as MP4</p>
        </div>
      </div>
    </div>
  );
}
