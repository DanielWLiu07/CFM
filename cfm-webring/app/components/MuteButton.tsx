'use client';

import { useState } from 'react';

interface Props {
  muted: boolean;
  onToggle: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
}

function VolumeIcon({ muted, volume }: { muted: boolean; volume: number }) {
  if (muted || volume === 0) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    );
  }
  if (volume < 0.5) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export default function MuteButton({ muted, onToggle, volume, onVolumeChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Slider — toggle on click */}
      {expanded && (
      <div
        className="flex flex-col items-center rounded-lg overflow-hidden"
        style={{
          height: 120,
          padding: '12px 0',
          width: 40,
          border: '1px solid rgba(0,0,0,0.6)',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.2), 0 0 20px rgba(0,0,0,0.4)',
        }}
      >
        <div className="relative h-full w-1 rounded-full bg-white/20">
          <div
            className="absolute bottom-0 left-0 w-full rounded-full bg-white"
            style={{ height: `${(muted ? 0 : volume) * 100}%`, boxShadow: '0 0 6px rgba(255,255,255,0.5)' }}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={muted ? 0 : volume}
            onChange={(e) => {
              e.stopPropagation();
              onVolumeChange(parseFloat(e.target.value));
            }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              WebkitAppearance: 'slider-vertical',
            }}
          />
        </div>
        <span
          className="text-white/70 mt-2"
          style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, textShadow: '0 0 3px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,0.8)' }}
        >
          {Math.round((muted ? 0 : volume) * 100)}
        </span>
      </div>
      )}

      {/* Mute/unmute button — click toggles slider, right-click or double-click for mute */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(prev => !prev); }}
        onDoubleClick={(e) => { e.stopPropagation(); onToggle(); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        className="flex items-center justify-center w-10 h-10 rounded-lg border border-white/20 bg-white/10 backdrop-blur-md text-white/70 hover:text-white hover:border-white/40 hover:bg-white/15 transition-colors cursor-pointer"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        <VolumeIcon muted={muted} volume={volume} />
      </button>
    </div>
  );
}
