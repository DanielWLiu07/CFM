'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface RingConfig {
  top: number;
  left: number;
  size: number;
  rotation: number;
  opacity: number;
  borderW: number;
  full?: boolean; // full circle instead of semi-circle
}

const DEFAULT_RING: RingConfig = { top: 0, left: 50, size: 80, rotation: 0, opacity: 0.2, borderW: 2 };

interface RingTunerProps {
  initialRings: RingConfig[];
  initialCenter?: number;
  beatRef: React.RefObject<number>;
  zIndex?: number;
}

export default function RingTuner({ initialRings, initialCenter = 32, beatRef, zIndex = 11 }: RingTunerProps) {
  const [open, setOpen] = useState(false);
  const [rings, setRings] = useState<RingConfig[]>(initialRings);
  const [center, setCenter] = useState(initialCenter);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Beat animation
  useEffect(() => {
    let raf: number;
    const loop = () => {
      const wb = beatRef.current ?? 0;
      ringRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = rings[i];
        if (!r) return;
        const bw = r.borderW + wb * 0.5;
        const op = r.opacity + wb * 0.06;
        const s = 1 + wb * 0.08;
        if (r.full) {
          el.style.borderWidth = `${bw}px`;
          el.style.borderColor = `rgba(255,255,255,${op})`;
        } else {
          el.style.borderTopWidth = `${bw}px`;
          el.style.borderLeftWidth = `${bw}px`;
          el.style.borderRightWidth = `${bw}px`;
          el.style.borderTopColor = `rgba(255,255,255,${op})`;
          el.style.borderLeftColor = `rgba(255,255,255,${op})`;
          el.style.borderRightColor = `rgba(255,255,255,${op})`;
        }
        el.style.transform = `translate(-50%, -50%) rotate(${r.rotation}deg) scale(${s})`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rings, beatRef]);

  const addRing = useCallback(() => {
    setRings(prev => [...prev, { ...DEFAULT_RING, top: 0 }]);
  }, []);

  const removeRing = useCallback((idx: number) => {
    setRings(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateRing = useCallback((idx: number, key: keyof RingConfig, val: number) => {
    setRings(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  }, []);

  return (
    <>
      {/* Render rings */}
      {rings.map((r, i) => (
        <div
          key={i}
          ref={el => { ringRefs.current[i] = el; }}
          className="absolute pointer-events-none"
          style={{
            top: `${center + r.top}%`,
            left: `${r.left}%`,
            width: `${r.size}vw`,
            height: r.full ? `${r.size}vw` : `${r.size / 2}vw`,
            transform: `translate(-50%, -50%) rotate(${r.rotation}deg)`,
            borderRadius: '50%',
            border: r.full ? `${r.borderW}px solid rgba(255,255,255,${r.opacity})` : undefined,
            borderTop: r.full ? undefined : `${r.borderW}px solid rgba(255,255,255,${r.opacity})`,
            borderLeft: r.full ? undefined : `${r.borderW}px solid rgba(255,255,255,${r.opacity})`,
            borderRight: r.full ? undefined : `${r.borderW}px solid rgba(255,255,255,${r.opacity})`,
            borderBottom: r.full ? undefined : 'none',
            zIndex,
            ...(r.full ? {} : {
              maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
            }),
          }}
        />
      ))}

      {/* Tuner UI */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', top: 10, right: 240, zIndex: 9999,
            background: '#222', color: '#fff', border: '1px solid #555',
            padding: '4px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
          }}
        >RINGS</button>
      ) : (
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

          {/* Center control */}
          <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #333' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 55 }}>center %</span>
              <input
                type="range" min={-20} max={80} step={1}
                value={center}
                onChange={e => setCenter(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ width: 40, textAlign: 'right' }}>{center}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button
              onClick={() => {
                const out = `center: ${center}\n` + rings.map((r, i) => `RING ${i + 1}: { top: ${r.top}, left: ${r.left}, size: ${r.size}, rotation: ${r.rotation}, opacity: ${r.opacity}, borderW: ${r.borderW} }`).join('\n');
                navigator.clipboard.writeText(out);
              }}
              style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
            >COPY VALUES</button>
            <button
              onClick={addRing}
              style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
            >+ ADD RING</button>
          </div>

          {rings.map((ring, gi) => (
            <div key={gi} style={{ marginBottom: 16, borderBottom: '1px solid #333', paddingBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 'bold' }}>RING {gi + 1}</span>
                <button onClick={() => removeRing(gi)} style={{ background: 'none', border: '1px solid #555', color: '#888', cursor: 'pointer', fontSize: 9, padding: '0 6px' }}>DEL</button>
              </div>
              {([
                { key: 'top' as const, min: -80, max: 80, step: 1, label: 'offset %' },
                { key: 'left' as const, min: -50, max: 150, step: 1, label: 'left %' },
                { key: 'size' as const, min: 20, max: 200, step: 1, label: 'size vw' },
                { key: 'rotation' as const, min: -180, max: 180, step: 1, label: 'rotate' },
                { key: 'opacity' as const, min: 0, max: 0.5, step: 0.005, label: 'opacity' },
                { key: 'borderW' as const, min: 0.5, max: 5, step: 0.5, label: 'border' },
              ]).map(({ key, min, max, step, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ width: 55 }}>{label}</span>
                  <input
                    type="range" min={min} max={max} step={step}
                    value={ring[key]}
                    onChange={e => updateRing(gi, key, parseFloat(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ width: 40, textAlign: 'right' }}>{ring[key]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
