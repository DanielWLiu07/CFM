'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { type ClassTitle3DConfig, DEFAULT_CONFIG } from './ClassTitle3D';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
      <span style={{ width: 48, color: '#aaa', textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: 80 }}
      />
      <span style={{ width: 40, color: '#fff', flexShrink: 0 }}>{value.toFixed(2)}</span>
    </div>
  );
}

interface TitleTunerProps {
  config: ClassTitle3DConfig;
  onChange: (config: ClassTitle3DConfig) => void;
}

export default function TitleTuner({ config, onChange }: TitleTunerProps) {
  const [open, setOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  // Initialize position to bottom-center
  useEffect(() => {
    setPos({ x: window.innerWidth / 2 - 300, y: window.innerHeight - (open ? 160 : 50) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const set = (key: keyof ClassTitle3DConfig, val: number) => {
    onChange({ ...config, [key]: val });
  };

  const copyValues = () => {
    const out = Object.entries(config)
      .map(([k, v]) => `  ${k}: ${typeof v === 'number' ? v.toFixed(2) : v},`)
      .join('\n');
    navigator.clipboard.writeText(`{\n${out}\n}`);
  };

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };

  const headerStyle: React.CSSProperties = {
    color: '#666',
    fontSize: 9,
    marginBottom: 2,
    fontFamily: 'monospace',
  };

  return (
    <div
      ref={panelRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.92)',
        border: '1px solid #444',
        borderRadius: 4,
        padding: open ? '8px 10px' : '4px 8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 11,
        pointerEvents: 'auto',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: open ? 6 : 0 }}>
        <span style={{ fontWeight: 'bold', fontSize: 10, letterSpacing: '0.1em' }}>TITLE TUNER</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {open && (
            <>
              <button onClick={copyValues} style={{ background: '#333', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: 9, fontFamily: 'monospace', borderRadius: 2 }}>
                COPY
              </button>
              <button onClick={() => onChange({ ...DEFAULT_CONFIG })} style={{ background: '#222', border: 'none', color: '#888', cursor: 'pointer', padding: '2px 8px', fontSize: 9, fontFamily: 'monospace', borderRadius: 2 }}>
                RESET
              </button>
            </>
          )}
          <button onClick={() => setOpen(!open)} style={{ background: '#222', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 6px', fontSize: 10, borderRadius: 2 }}>
            {open ? '−' : '+'}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ display: 'flex', gap: 14 }}>
          {/* Column 1: Geometry + Rotation */}
          <div style={sectionStyle}>
            <div style={headerStyle}>GEOMETRY</div>
            <Slider label="size" value={config.size} min={1} max={8} step={0.1} onChange={v => set('size', v)} />
            <Slider label="depth" value={config.depth} min={0.5} max={6} step={0.1} onChange={v => set('depth', v)} />
            <Slider label="edgeW" value={config.edgeWidth} min={0} max={8} step={0.5} onChange={v => set('edgeWidth', v)} />
            <div style={{ ...headerStyle, marginTop: 6 }}>ROTATION</div>
            <Slider label="tiltX" value={config.tiltX} min={-1} max={1} step={0.01} onChange={v => set('tiltX', v)} />
            <Slider label="tiltY" value={config.tiltY} min={-1} max={1} step={0.01} onChange={v => set('tiltY', v)} />
          </div>

          {/* Column 2: Camera */}
          <div style={sectionStyle}>
            <div style={headerStyle}>CAMERA</div>
            <Slider label="fov" value={config.fov} min={20} max={80} step={1} onChange={v => set('fov', v)} />
            <Slider label="dpr" value={config.dpr} min={0.2} max={2} step={0.05} onChange={v => set('dpr', v)} />
          </div>

          {/* Column 4: Lighting */}
          <div style={sectionStyle}>
            <div style={headerStyle}>LIGHTING</div>
            <Slider label="front" value={config.frontLight} min={0} max={6} step={0.1} onChange={v => set('frontLight', v)} />
            <Slider label="top" value={config.topLight} min={0} max={4} step={0.1} onChange={v => set('topLight', v)} />
            <Slider label="ambient" value={config.ambient} min={0} max={1} step={0.01} onChange={v => set('ambient', v)} />
          </div>
        </div>
      )}
    </div>
  );
}
