'use client';

import { useState, useEffect } from 'react';

interface GearSet {
  ref1: React.RefObject<HTMLImageElement | null>;
  ref2: React.RefObject<HTMLImageElement | null>;
  label: string;
  defaults: { bottom: number; lr: number; height: number; z: number };
}

export default function GearTuner({ gears }: { gears: GearSet[] }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(
    gears.map(g => ({ ...g.defaults }))
  );

  useEffect(() => {
    values.forEach((v, i) => {
      const g = gears[i];
      const left = g.ref1.current;
      const right = g.ref2.current;
      if (left) {
        left.style.bottom = `${v.bottom}%`;
        left.style.left = `${v.lr}%`;
        left.style.height = `${v.height}px`;
        left.style.minHeight = `${v.height}px`;
        left.style.zIndex = String(v.z);
      }
      if (right) {
        right.style.bottom = `${v.bottom}%`;
        right.style.right = `${v.lr}%`;
        right.style.height = `${v.height}px`;
        right.style.minHeight = `${v.height}px`;
        right.style.zIndex = String(v.z);
      }
    });
  }, [values, gears]);

  const update = (gi: number, key: string, val: number) => {
    setValues(prev => prev.map((v, i) => i === gi ? { ...v, [key]: val } : v));
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 10, right: 10, zIndex: 9999,
          background: '#222', color: '#fff', border: '1px solid #555',
          padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12,
        }}
      >
        GEARS
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', top: 10, right: 10, zIndex: 9999,
        background: 'rgba(0,0,0,0.95)', border: '1px solid #333',
        padding: '12px 16px', fontFamily: 'monospace', fontSize: 11,
        color: '#fff', width: 360, maxHeight: '90vh', overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>GEAR TUNER</strong>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>X</button>
      </div>

      {gears.map((g, gi) => (
        <div key={gi} style={{ marginBottom: 12, borderTop: '1px solid #333', paddingTop: 8 }}>
          <div style={{ color: '#aaa', marginBottom: 4 }}>{g.label}</div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 60 }}>bottom</span>
            <input type="range" min={-5000} max={0} step={50} value={values[gi].bottom}
              onChange={e => update(gi, 'bottom', +e.target.value)} style={{ flex: 1 }} />
            <span style={{ width: 55, textAlign: 'right' }}>{values[gi].bottom}%</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 60 }}>l/r %</span>
            <input type="range" min={-20} max={10} step={0.5} value={values[gi].lr}
              onChange={e => update(gi, 'lr', +e.target.value)} style={{ flex: 1 }} />
            <span style={{ width: 55, textAlign: 'right' }}>{values[gi].lr}%</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 60 }}>height</span>
            <input type="range" min={100} max={1200} step={10} value={values[gi].height}
              onChange={e => update(gi, 'height', +e.target.value)} style={{ flex: 1 }} />
            <span style={{ width: 55, textAlign: 'right' }}>{values[gi].height}px</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 60 }}>z-index</span>
            <input type="range" min={1} max={5} step={1} value={values[gi].z}
              onChange={e => update(gi, 'z', +e.target.value)} style={{ flex: 1 }} />
            <span style={{ width: 55, textAlign: 'right' }}>{values[gi].z}</span>
          </label>
        </div>
      ))}

      <div style={{ background: '#111', border: '1px solid #333', padding: 8, fontSize: 10, whiteSpace: 'pre', color: '#ccc' }}>
        {values.map((v, i) => `G${i+1}: bot:'${v.bottom}%' lr:'${v.lr}%' h:${v.height}px z:${v.z}`).join('\n')}
      </div>
    </div>
  );
}
