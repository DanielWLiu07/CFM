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

const TIMEOUT_MS = 15_000;

/**
 * Tracks loading of all critical assets (fonts, audio, video, images)
 * so the overlay can show true progress. Falls back after 15 s.
 */
export function useAssetPreloader(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const trackerRef = useRef({ loaded: 0, total: 0, done: false });

  useEffect(() => {
    const tracker = trackerRef.current;
    if (tracker.done) return;

    tracker.total = 3 + CRITICAL_IMAGES.length; // fonts + audio + video + images
    tracker.loaded = 0;
    setProgress(0);

    const tick = () => {
      tracker.loaded++;
      setProgress(tracker.loaded / tracker.total);
    };

    const promises: Promise<void>[] = [];

    // 1. Fonts
    promises.push(document.fonts.ready.then(() => { tick(); }));

    // 2. Audio
    promises.push(new Promise<void>(resolve => {
      const el = audioRef.current;
      if (!el) { tick(); resolve(); return; }
      if (el.readyState >= 4) { tick(); resolve(); return; }
      const handler = () => { el.removeEventListener('canplaythrough', handler); tick(); resolve(); };
      el.addEventListener('canplaythrough', handler);
      el.load();
    }));

    // 3. Video
    promises.push(new Promise<void>(resolve => {
      const el = videoRef.current;
      if (!el) { tick(); resolve(); return; }
      if (el.readyState >= 4) { tick(); resolve(); return; }
      const handler = () => { el.removeEventListener('canplaythrough', handler); tick(); resolve(); };
      el.addEventListener('canplaythrough', handler);
      el.load();
    }));

    // 4. Critical images
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
  }, [audioRef, videoRef]);

  return { progress, ready };
}
