'use client';

import { useRef, useEffect } from 'react';

// Pixel noise overlay for the title — subtle shifting static grain
export function TitleNoise({ visible, reducedMotion = false }: { visible: boolean; reducedMotion?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!visible || reducedMotion) return;
    let frame = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Only update every 3rd frame for that chunky pixel look
      frame++;
      if (frame % 3 !== 0) { rafRef.current = requestAnimationFrame(draw); return; }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      // Use low resolution for chunky pixels
      const scale = 0.15;
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);

      const w = canvas.width;
      const h = canvas.height;
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random();
        if (noise > 0.92) {
          // Bright white speckle
          const v = 180 + Math.floor(Math.random() * 75);
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = 18 + Math.floor(Math.random() * 14);
        } else if (noise > 0.88) {
          // Dim speckle
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 6 + Math.floor(Math.random() * 8);
        }
        // else: transparent
      }

      ctx.putImageData(imgData, 0, 0);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        imageRendering: 'pixelated',
        mixBlendMode: 'screen',
        opacity: 0.7,
      }}
    />
  );
}
