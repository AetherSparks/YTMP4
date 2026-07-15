'use client';

interface DownloadButtonProps {
  onClick: () => void;
  isDownloading: boolean;
  quality: string;
  disabled?: boolean;
}

export function DownloadButton({ onClick, isDownloading, quality, disabled }: DownloadButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isDownloading || disabled}
      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg"
    >
      {isDownloading ? (
        <>
          <div className="w-5 h-5 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
          Processing...
        </>
      ) : (
        `Download ${quality}`
      )}
    </button>
  );
}
