'use client';

import { useRef, useEffect, useCallback } from 'react';

export function generateFallbackWeeks(): number[] {
  const weeks: number[] = [];
  for (let w = 0; w < 52; w++) {
    const recency = w > 40 ? 2.5 : w > 30 ? 1.5 : 0.8;
    const burst = Math.random() < 0.1 ? 5 + Math.floor(Math.random() * 10) : 0;
    weeks.push(Math.max(0, Math.floor(Math.random() * 4 * recency + burst)));
  }
  return weeks;
}

// Weekly commit bar chart — fetches real data, renders as vertical bars
export function CommitBarChart({ green, visible, reducedMotion = false, totalCommits }: { green: string; visible: boolean; reducedMotion?: boolean; totalCommits?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    fetch('https://api.github.com/repos/DanielWLiu07/CFM/stats/commit_activity')
      .then(r => r.json())
      .then(weeks => {
        if (Array.isArray(weeks) && weeks.length > 0) {
          dataRef.current = weeks.map((w: { total: number }) => w.total);
        } else {
          dataRef.current = generateFallbackWeeks();
        }
      })
      .catch(() => {
        dataRef.current = generateFallbackWeeks();
      });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = dataRef.current;
    if (data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    const padding = { top: 8, bottom: 16, left: 4, right: 4 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const maxVal = Math.max(1, ...data);
    const barCount = data.length;
    const gap = 2;
    const barW = Math.max(1, (chartW - gap * (barCount - 1)) / barCount);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) {
      const gy = padding.top + chartH * (1 - i / 4);
      ctx.beginPath();
      ctx.moveTo(padding.left, gy);
      ctx.lineTo(w - padding.right, gy);
      ctx.stroke();
    }

    // Bars
    for (let i = 0; i < barCount; i++) {
      const val = data[i];
      const barH = (val / maxVal) * chartH;
      const x = padding.left + i * (barW + gap);
      const y = padding.top + chartH - barH;

      // Gradient fill per bar
      const grad = ctx.createLinearGradient(0, y, 0, padding.top + chartH);
      grad.addColorStop(0, val > 0 ? 'rgba(0,230,118,0.8)' : 'rgba(255,255,255,0.04)');
      grad.addColorStop(1, val > 0 ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.02)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW, barH || 1);
    }

    // Highlight last bar with pulse
    const lastIdx = barCount - 1;
    const lastVal = data[lastIdx];
    const lastBarH = (lastVal / maxVal) * chartH;
    const lastX = padding.left + lastIdx * (barW + gap);
    const lastY = padding.top + chartH - lastBarH;
    const pulse = Math.sin(Date.now() * 0.004) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(0,230,118,${0.15 + pulse * 0.15})`;
    ctx.fillRect(lastX - 1, lastY - 1, barW + 2, lastBarH + 2);

    // Label: latest week count
    ctx.fillStyle = green;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${lastVal} this week`, w - padding.right, padding.top + chartH + 12);

    // Label: total
    const total = totalCommits ?? data.reduce((a, b) => a + b, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'left';
    ctx.fillText(`${total} total`, padding.left, padding.top + chartH + 12);
  }, [green, totalCommits]);

  useEffect(() => {
    if (!visible || reducedMotion) {
      // Draw once if visible but reduced motion
      if (visible) draw();
      return;
    }
    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, draw, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
