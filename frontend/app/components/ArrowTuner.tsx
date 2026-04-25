'use client';

import { useState, useEffect } from 'react';

interface ArrowTunerProps {
  onConfigChange: (config: { top: string; right: string; width: string }) => void;
  initialConfig?: { top: string; right: string; width: string };
}

export default function ArrowTuner({ onConfigChange, initialConfig }: ArrowTunerProps) {
  const [open, setOpen] = useState(false);

  // Parse initial values or use defaults
  const parsePercent = (val: string) => parseInt(val.replace('%', '').replace('-', '')) * (val.startsWith('-') ? -1 : 1);
  const parseWidth = (val: string) => {
    const match = val.match(/min\((\d+)px/);
    return match ? parseInt(match[1]) : 1100;
  };
  const parseVw = (val: string) => {
    const match = val.match(/(\d+)vw/);
    return match ? parseInt(match[1]) : 85;
  };

  const [topPercent, setTopPercent] = useState(initialConfig ? parsePercent(initialConfig.top) : -50);
  const [rightPercent, setRightPercent] = useState(initialConfig ? parsePercent(initialConfig.right) : -15);
  const [widthPx, setWidthPx] = useState(initialConfig ? parseWidth(initialConfig.width) : 1100);
  const [widthVw, setWidthVw] = useState(initialConfig ? parseVw(initialConfig.width) : 85);

  useEffect(() => {
    onConfigChange({
      top: `${topPercent}%`,
      right: `${rightPercent}%`,
      width: `min(${widthPx}px, ${widthVw}vw)`,
    });
  }, [topPercent, rightPercent, widthPx, widthVw, onConfigChange]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 10, right: 10, zIndex: 9999,
          background: '#222', color: '#f55', border: '1px solid #f55',
          padding: '4px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
        }}
      >RED ARROW</button>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 10, right: 10, zIndex: 9999,
      background: '#111', border: '1px solid #f55', padding: 12,
      fontFamily: 'monospace', fontSize: 11, color: '#fff', width: 280,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong style={{ color: '#f55' }}>RED ARROW TUNER</strong>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>X</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`top: '${topPercent}%', right: '${rightPercent}%', width: 'min(${widthPx}px, ${widthVw}vw)'`);
          }}
          style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
        >COPY CONFIG</button>
        <button
          onClick={() => {
            setTopPercent(-50);
            setRightPercent(-25);
            setWidthPx(1400);
            setWidthVw(100);
          }}
          style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
        >RESET</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, color: '#f88' }}>TOP POSITION</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="range" min={-100} max={0} step={1} value={topPercent}
            onChange={e => setTopPercent(parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ width: 50, textAlign: 'right' }}>{topPercent}%</span>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, color: '#f88' }}>RIGHT POSITION</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="range" min={-50} max={50} step={1} value={rightPercent}
            onChange={e => setRightPercent(parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ width: 50, textAlign: 'right' }}>{rightPercent}%</span>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, color: '#8ff' }}>MAX WIDTH (px)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="range" min={400} max={2000} step={50} value={widthPx}
            onChange={e => setWidthPx(parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ width: 50, textAlign: 'right' }}>{widthPx}px</span>
        </div>
      </div>

      <div>
        <div style={{ marginBottom: 4, color: '#8ff' }}>MAX WIDTH (vw)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="range" min={30} max={120} step={5} value={widthVw}
            onChange={e => setWidthVw(parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ width: 50, textAlign: 'right' }}>{widthVw}vw</span>
        </div>
      </div>
    </div>
  );
}
