import { useState, useRef, useEffect } from 'react';

const CRITICAL_IMAGES = [
  '/images/side_wires.webp',
  '/images/sepereate_wires.webp',
  '/images/left_gear.webp',
  '/images/right_gear.webp',
  '/images/goose-ascii.webp',
  '/images/waterloo-ascii.svg',
  '/images/about_bg.webp',
  '/images/about_title.webp',
  '/images/nav_bg.webp',
  '/images/cat_watching.webp',
  '/images/title_bg.webp',
];

const TIMEOUT_MS = 10_000;

/**
 * Preloads fonts + critical images only.
 * Audio and video load independently — they don't block the ready screen.
 */
export function useAssetPreloader() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const trackerRef = useRef({ loaded: 0, total: 0, done: false });

  useEffect(() => {
    const tracker = trackerRef.current;
    if (tracker.done) return;

    tracker.total = 1 + CRITICAL_IMAGES.length; // fonts + images
    tracker.loaded = 0;
    setProgress(0);

    const tick = () => {
      tracker.loaded++;
      setProgress(tracker.loaded / tracker.total);
    };

    const promises: Promise<void>[] = [];

    // 1. Fonts
    promises.push(document.fonts.ready.then(() => { tick(); }));

    // 2. Critical images
    for (const src of CRITICAL_IMAGES) {
      promises.push(new Promise<void>(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => { tick(); resolve(); };
        img.src = src;
      }));
    }

    Promise.all(promises).then(() => {
      tracker.done = true;
      setProgress(1);
      setReady(true);
    });

    const timeout = setTimeout(() => {
      if (!tracker.done) {
        tracker.done = true;
        setProgress(1);
        setReady(true);
      }
    }, TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, []);

  return { progress, ready };
}
