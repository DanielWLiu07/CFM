'use client';

import { useRef, useState, useEffect, useCallback, type RefObject } from 'react';

export interface DecoConfig {
  x: number;   // % from left
  y: number;   // % from top
  size: number; // px height
  rotation: number; // degrees
  opacity: number;  // 0-1
}

interface DecoItem {
  ref: RefObject<HTMLElement | null>;
  label: string;
  defaults: DecoConfig;
}

export default function DecoTuner({ items }: { items: DecoItem[] }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<DecoConfig[]>(() =>
    items.map(i => ({ ...i.defaults }))
  );
  const [pos, setPos] = useState({ x: window.innerWidth - 480, y: 10 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.origX + ev.clientX - dragRef.current.startX,
        y: dragRef.current.origY + ev.clientY - dragRef.current.startY,
      });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  useEffect(() => {
    values.forEach((v, i) => {
      const el = items[i].ref.current;
      if (!el) return;
      el.style.left = `${v.x}%`;
      el.style.top = `${v.y}%`;
      el.style.height = `${v.size}px`;
      el.style.width = 'auto';
      el.style.transform = `rotate(${v.rotation}deg)`;
      el.style.opacity = String(v.opacity);
      el.dataset.baseOpacity = String(v.opacity);
      el.dataset.baseRotation = String(v.rotation);
    });
  }, [values, items]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: pos.y, left: pos.x, zIndex: 9999,
          background: '#222', color: '#fff', border: '1px solid #555',
          padding: '4px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
        }}
      >DECO</button>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: pos.y, left: pos.x, zIndex: 9999,
      background: '#111', border: '1px solid #555', padding: 12,
      fontFamily: 'monospace', fontSize: 11, color: '#fff', maxHeight: '80vh', overflowY: 'auto',
      width: 320,
    }}>
      <div
        onMouseDown={handleDragStart}
        style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, cursor: 'grab', userSelect: 'none' }}
      >
        <strong>DECO TUNER</strong>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>X</button>
      </div>

      {/* Copy values button */}
      <button
        onClick={() => {
          const out = values.map((v, i) => `${items[i].label}: { x: ${v.x}, y: ${v.y}, size: ${v.size}, rotation: ${v.rotation}, opacity: ${v.opacity} }`).join('\n');
          navigator.clipboard.writeText(out);
        }}
        style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer', marginBottom: 10 }}
      >COPY VALUES</button>

      {items.map((item, gi) => (
        <div key={gi} style={{ marginBottom: 16, borderBottom: '1px solid #333', paddingBottom: 8 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{item.label}</div>
          {(['x', 'y', 'size', 'rotation', 'opacity'] as const).map(key => {
            const min = key === 'x' ? -20 : key === 'y' ? -20 : key === 'size' ? 20 : key === 'rotation' ? -180 : 0;
            const max = key === 'x' ? 120 : key === 'y' ? 120 : key === 'size' ? 1200 : key === 'rotation' ? 180 : 1;
            const step = key === 'opacity' ? 0.05 : 1;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ width: 60 }}>{key}</span>
                <input
                  type="range" min={min} max={max} step={step}
                  value={values[gi][key]}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    setValues(prev => prev.map((p, i) => i === gi ? { ...p, [key]: v } : p));
                  }}
                  style={{ flex: 1 }}
                />
                <span style={{ width: 45, textAlign: 'right' }}>{values[gi][key]}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
