'use client';

import type { FormatInfo } from '@/lib/youtube';

interface QualitySelectProps {
  formats: FormatInfo[];
  value: string;
  onChange: (quality: string) => void;
  disabled?: boolean;
}

export function QualitySelect({ formats, value, onChange, disabled }: QualitySelectProps) {
  if (formats.length === 0) return null;

  const combinedFormats = formats.filter(f => !f.needsFfmpeg);
  const videoOnlyFormats = formats.filter(f => f.needsFfmpeg);

  return (
    <div className="space-y-2">
      <label htmlFor="quality" className="block text-sm font-medium text-zinc-300">
        Quality
      </label>
      <select
        id="quality"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <optgroup label="Direct Download (fast)">
          {combinedFormats.map((f) => (
            <option key={`combined-${f.itag}`} value={f.quality}>
              {f.quality} — {f.filesize ? `${(parseInt(f.filesize) / 1024 / 1024).toFixed(1)} MB` : 'variable size'}
            </option>
          ))}
        </optgroup>
        {videoOnlyFormats.length > 0 && (
          <optgroup label="HD+ (requires processing)">
            {videoOnlyFormats.map((f) => (
              <option key={`video-${f.itag}`} value={f.quality}>
                {f.quality} — {f.filesize ? `${(parseInt(f.filesize) / 1024 / 1024).toFixed(1)} MB` : 'variable size'} (merged with audio)
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {videoOnlyFormats.length > 0 && (
        <p className="text-xs text-zinc-500">
          HD+ qualities are processed on the server — may take longer
        </p>
      )}
    </div>
  );
}
