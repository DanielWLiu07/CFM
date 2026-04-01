'use client';

import { POSITIONS } from './data';

// Auto-scrolling positions panel — CSS animation for reliable infinite scroll
export function PositionsPanel({ mono, dim, mid, bright, green }: {
  mono: string; dim: string; mid: string; bright: string; green: string;
}) {
  const row = (p: typeof POSITIONS[0], i: number) => (
    <div key={i} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 0',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontFamily: mono, fontSize: 11, color: mid, width: '55%' }}>{p.asset}</span>
      <span style={{ fontFamily: mono, fontSize: 11, color: bright, width: '25%', textAlign: 'right' }}>{p.alloc}</span>
      <span style={{ fontFamily: mono, fontSize: 8, color: green, width: '20%', textAlign: 'right', letterSpacing: '0.05em' }}>{p.status}</span>
    </div>
  );

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 260 }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        Positions
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 4 }}>
        <span style={{ fontFamily: mono, fontSize: 8, color: dim, width: '55%' }}>ASSET</span>
        <span style={{ fontFamily: mono, fontSize: 8, color: dim, width: '25%', textAlign: 'right' }}>ALLOC</span>
        <span style={{ fontFamily: mono, fontSize: 8, color: dim, width: '20%', textAlign: 'right' }}>STATUS</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div className="positions-marquee">
          <div>{POSITIONS.map(row)}</div>
          <div>{POSITIONS.map(row)}</div>
        </div>
      </div>
    </div>
  );
}
