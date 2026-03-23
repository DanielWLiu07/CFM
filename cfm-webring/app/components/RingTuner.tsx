'use client';

import { useRef, useState, useEffect, type RefObject } from 'react';

export interface RingConfig {
  top: number;    // % from top
  left: number;   // % from left (50 = centered)
  size: number;   // vw
  opacity: number; // 0-1 (border opacity)
  borderW: number; // px
}

interface RingItem {
  ref: RefObject<HTMLDivElement | null>;
  label: string;
  defaults: RingConfig;
}

export default function RingTuner({ items }: { items: RingItem[] }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<RingConfig[]>(() =>
    items.map(i => ({ ...i.defaults }))
  );

  useEffect(() => {
    values.forEach((v, i) => {
      const el = items[i].ref.current;
      if (!el) return;
      el.style.top = `${v.top}%`;
      el.style.left = `${v.left}%`;
      el.style.width = `${v.size}vw`;
      el.style.height = `${v.size}vw`;
      el.style.border = `${v.borderW}px solid rgba(255,255,255,${v.opacity})`;
      el.dataset.baseBorderW = String(v.borderW);
      el.dataset.baseOpacity = String(v.opacity);
    });
  }, [values, items]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 10, right: 240, zIndex: 9999,
          background: '#222', color: '#fff', border: '1px solid #555',
          padding: '4px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
        }}
      >RINGS</button>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 10, right: 240, zIndex: 9999,
      background: '#111', border: '1px solid #555', padding: 12,
      fontFamily: 'monospace', fontSize: 11, color: '#fff', maxHeight: '80vh', overflowY: 'auto',
      width: 300,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>RING TUNER</strong>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>X</button>
      </div>

      <button
        onClick={() => {
          const out = values.map((v, i) => `${items[i].label}: { top: ${v.top}, size: ${v.size}, opacity: ${v.opacity}, borderW: ${v.borderW} }`).join('\n');
          navigator.clipboard.writeText(out);
        }}
        style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer', marginBottom: 10 }}
      >COPY VALUES</button>

      {items.map((item, gi) => (
        <div key={gi} style={{ marginBottom: 16, borderBottom: '1px solid #333', paddingBottom: 8 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{item.label}</div>
          {([
            { key: 'top' as const, min: -80, max: 120, step: 1, label: 'top %' },
            { key: 'left' as const, min: -50, max: 150, step: 1, label: 'left %' },
            { key: 'size' as const, min: 20, max: 200, step: 1, label: 'size vw' },
            { key: 'opacity' as const, min: 0, max: 0.3, step: 0.005, label: 'opacity' },
            { key: 'borderW' as const, min: 0.5, max: 5, step: 0.5, label: 'border' },
          ]).map(({ key, min, max, step, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ width: 55 }}>{label}</span>
              <input
                type="range" min={min} max={max} step={step}
                value={values[gi][key]}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  setValues(prev => prev.map((p, i) => i === gi ? { ...p, [key]: v } : p));
                }}
                style={{ flex: 1 }}
              />
              <span style={{ width: 40, textAlign: 'right' }}>{values[gi][key]}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
