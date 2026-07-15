'use client';

import { type FormEvent } from 'react';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  isLoading: boolean;
  hasVideo: boolean;
  onReset: () => void;
}

export function UrlInput({ value, onChange, onSubmit, isLoading, hasVideo, onReset }: UrlInputProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-zinc-300 mb-2">
          YouTube URL
        </label>
        <input
          type="url"
          id="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50"
          required
          disabled={isLoading}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading || !value}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
              Fetching...
            </>
          ) : (
            'Get Video Info'
          )}
        </button>

        {hasVideo && (
          <button
            type="button"
            onClick={onReset}
            className="px-6 py-3 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </form>
  );
}
