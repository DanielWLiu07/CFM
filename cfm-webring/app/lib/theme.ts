/** Shared design tokens used across components. */

export const FONT = {
  arcade: 'var(--font-arcade)',
  mono: 'var(--font-geist-mono)',
} as const;

export const COLOR = {
  green: '#00e676',
  dim: 'rgba(255,255,255,0.25)',
  mid: 'rgba(255,255,255,0.5)',
  bright: 'rgba(255,255,255,0.85)',
} as const;

export const EASE = {
  /** Overshoot ease — snappy with a bounce at the end. */
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;
