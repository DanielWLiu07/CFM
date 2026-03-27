'use client';

import { useRef, useEffect, useMemo } from 'react';

interface LetterData {
  char: string;
  r: number; g: number; b: number;
  tr: number; tg: number; tb: number;
  colorProgress: number;
}

const LetterGlitch = ({
  glitchColors = ['#1a1a1a', '#2a2a2a', '#ffffff'],
  className = '',
  glitchSpeed = 50,
  centerVignette = false,
  outerVignette = true,
  smooth = true,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%*()-_+=/[]{};:<>.,0123456789'
}: {
  glitchColors?: string[];
  className?: string;
  glitchSpeed?: number;
  centerVignette?: boolean;
  outerVignette?: boolean;
  smooth?: boolean;
  characters?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const letters = useRef<LetterData[]>([]);
  const grid = useRef({ columns: 0, rows: 0 });
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const lastGlitchTime = useRef(0);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  const lettersAndSymbols = useMemo(() => Array.from(characters), [characters]);

  // Pre-parse colors to RGB once — avoids regex every frame
  const parsedColors = useMemo(() => {
    return glitchColors.map(hex => {
      hex = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => r+r+g+g+b+b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
    });
  }, [glitchColors]);

  const fontSize = 16;
  const charWidth = 10;
  const charHeight = 20;
  const fontStr = `${fontSize}px monospace`;

  const getRandomChar = () => lettersAndSymbols[Math.floor(Math.random() * lettersAndSymbols.length)];
  const getRandomColorRgb = () => parsedColors[Math.floor(Math.random() * parsedColors.length)];

  const initializeLetters = (columns: number, rows: number) => {
    grid.current = { columns, rows };
    const len = columns * rows;
    const arr = new Array<LetterData>(len);
    for (let i = 0; i < len; i++) {
      const c = getRandomColorRgb();
      const tc = getRandomColorRgb();
      arr[i] = { char: getRandomChar(), r: c.r, g: c.g, b: c.b, tr: tc.r, tg: tc.g, tb: tc.b, colorProgress: 1 };
    }
    letters.current = arr;
  };

  const drawLetters = () => {
    const ctx = context.current;
    const arr = letters.current;
    if (!ctx || arr.length === 0) return;
    const { w, h } = canvasSizeRef.current;
    ctx.clearRect(0, 0, w, h);
    ctx.font = fontStr;
    ctx.textBaseline = 'top';
    const cols = grid.current.columns;
    for (let i = 0, len = arr.length; i < len; i++) {
      const letter = arr[i];
      ctx.fillStyle = `rgb(${letter.r},${letter.g},${letter.b})`;
      ctx.fillText(letter.char, (i % cols) * charWidth, ((i / cols) | 0) * charHeight);
    }
  };

  const updateLetters = () => {
    const arr = letters.current;
    if (!arr.length) return;
    const updateCount = Math.max(1, (arr.length * 0.05) | 0);
    for (let i = 0; i < updateCount; i++) {
      const index = Math.floor(Math.random() * arr.length);
      const letter = arr[index];
      letter.char = getRandomChar();
      const tc = getRandomColorRgb();
      letter.tr = tc.r; letter.tg = tc.g; letter.tb = tc.b;
      if (!smooth) {
        letter.r = tc.r; letter.g = tc.g; letter.b = tc.b;
        letter.colorProgress = 1;
      } else {
        letter.colorProgress = 0;
      }
    }
  };

  const handleSmoothTransitions = () => {
    const arr = letters.current;
    let needsRedraw = false;
    for (let i = 0, len = arr.length; i < len; i++) {
      const letter = arr[i];
      if (letter.colorProgress < 1) {
        letter.colorProgress = Math.min(1, letter.colorProgress + 0.05);
        const f = letter.colorProgress;
        letter.r = (letter.r + (letter.tr - letter.r) * f) | 0;
        letter.g = (letter.g + (letter.tg - letter.g) * f) | 0;
        letter.b = (letter.b + (letter.tb - letter.b) * f) | 0;
        needsRedraw = true;
      }
    }
    if (needsRedraw) drawLetters();
  };

  const animate = (now: number) => {
    if (now - lastGlitchTime.current >= glitchSpeed) {
      updateLetters();
      drawLetters();
      lastGlitchTime.current = now;
    }
    if (smooth) handleSmoothTransitions();
    animationRef.current = requestAnimationFrame(animate);
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvasSizeRef.current = { w: rect.width, h: rect.height };
    if (context.current) context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    const columns = Math.ceil(rect.width / charWidth);
    const rows = Math.ceil(rect.height / charHeight);
    initializeLetters(columns, rows);
    drawLetters();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    context.current = canvas.getContext('2d');
    resizeCanvas();
    animationRef.current = requestAnimationFrame(animate);
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        cancelAnimationFrame(animationRef.current);
        resizeCanvas();
        animationRef.current = requestAnimationFrame(animate);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glitchSpeed, smooth]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000', overflow: 'hidden' }} className={className}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {outerVignette && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)' }} />
      )}
      {centerVignette && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)' }} />
      )}
    </div>
  );
};

export default LetterGlitch;
