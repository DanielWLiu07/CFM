'use client';

import { useState, useEffect, type RefObject } from 'react';

interface SizeTunerProps {
  wrapperRef: RefObject<HTMLDivElement | null>;
  sectionRef: RefObject<HTMLElement | null>;
  defaultWrapperH?: number;
  defaultSectionH?: number;
}

export default function SizeTuner({ wrapperRef, sectionRef, defaultWrapperH = 156, defaultSectionH = 100 }: SizeTunerProps) {
  const [open, setOpen] = useState(false);
  const [wrapperH, setWrapperH] = useState(defaultWrapperH);
  const [sectionH, setSectionH] = useState(defaultSectionH);
  const [showBounds, setShowBounds] = useState(false);

  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.height = `${wrapperH}vh`;
    }
  }, [wrapperH, wrapperRef]);

  useEffect(() => {
    if (sectionRef.current) {
      sectionRef.current.style.height = `${sectionH}vh`;
    }
  }, [sectionH, sectionRef]);

  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.outline = showBounds ? '2px dashed rgba(255,0,0,0.5)' : 'none';
    }
    if (sectionRef.current) {
      sectionRef.current.style.outline = showBounds ? '2px dashed rgba(0,255,0,0.5)' : 'none';
    }
  }, [showBounds, wrapperRef, sectionRef]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 10, right: 320, zIndex: 9999,
          background: '#222', color: '#fff', border: '1px solid #555',
          padding: '4px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
        }}
      >SIZE</button>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 10, right: 320, zIndex: 9999,
      background: '#111', border: '1px solid #555', padding: 12,
      fontFamily: 'monospace', fontSize: 11, color: '#fff', width: 260,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>SIZE TUNER</strong>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>X</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => setShowBounds(prev => !prev)}
          style={{ background: showBounds ? '#555' : '#333', border: '1px solid #555', color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
        >{showBounds ? 'HIDE' : 'SHOW'} BOUNDS</button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`wrapper: ${wrapperH}vh, section: ${sectionH}vh`);
          }}
          style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
        >COPY</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, color: '#f88' }}>WEBRING WRAPPER (red)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="range" min={50} max={200} step={1} value={wrapperH}
            onChange={e => setWrapperH(parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ width: 40, textAlign: 'right' }}>{wrapperH}vh</span>
        </div>
      </div>

      <div>
        <div style={{ marginBottom: 4, color: '#8f8' }}>3JS SECTION (green)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="range" min={50} max={200} step={1} value={sectionH}
            onChange={e => setSectionH(parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ width: 40, textAlign: 'right' }}>{sectionH}vh</span>
        </div>
      </div>
    </div>
  );
}
