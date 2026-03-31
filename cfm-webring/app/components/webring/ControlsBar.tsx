'use client';

export interface ControlsBarProps {
  isMobile: boolean;
  sliderAngle: number;
  sliderTilt: number;
  sliderZoom: number;
  handleSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSliderUp: () => void;
  handleTiltChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTiltUp: () => void;
  handleZoomChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleZoomUp: () => void;
  handleResetView: () => void;
}

export default function ControlsBar({
  isMobile,
  sliderAngle,
  sliderTilt,
  sliderZoom,
  handleSliderChange,
  handleSliderUp,
  handleTiltChange,
  handleTiltUp,
  handleZoomChange,
  handleZoomUp,
  handleResetView,
}: ControlsBarProps) {
  return (
    <div
      className="absolute z-[60] flex items-center gap-5"
      style={{
        display: isMobile ? 'none' : 'flex',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        border: '1px solid #222',
        padding: '8px 20px',
        userSelect: 'none',
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#555', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
          ROTATE
        </span>
        <input
          type="range" min="0" max="360" step="0.5"
          value={sliderAngle} onChange={handleSliderChange}
          onMouseUp={handleSliderUp} onTouchEnd={handleSliderUp}
          style={{ width: 140, height: 2, appearance: 'none', background: '#333', outline: 'none', cursor: 'pointer', accentColor: '#fff' }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', width: 28, textAlign: 'right' }}>
          {Math.round(sliderAngle)}&deg;
        </span>
      </div>
      <div style={{ width: 1, height: 14, background: '#333' }} />
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#555', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
          TILT
        </span>
        <input
          type="range" min="0" max="360" step="1"
          value={sliderTilt} onChange={handleTiltChange}
          onMouseUp={handleTiltUp} onTouchEnd={handleTiltUp}
          style={{ width: 100, height: 2, appearance: 'none', background: '#333', outline: 'none', cursor: 'pointer', accentColor: '#fff' }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', width: 28, textAlign: 'right' }}>
          {Math.round(sliderTilt)}&deg;
        </span>
      </div>
      <div style={{ width: 1, height: 14, background: '#333' }} />
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#555', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
          ZOOM
        </span>
        <input
          type="range" min="0" max="100" step="1"
          value={sliderZoom} onChange={handleZoomChange}
          onMouseUp={handleZoomUp} onTouchEnd={handleZoomUp}
          style={{ width: 100, height: 2, appearance: 'none', background: '#333', outline: 'none', cursor: 'pointer', accentColor: '#fff' }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', width: 32, textAlign: 'right' }}>
          {sliderZoom}%
        </span>
      </div>
      <div style={{ width: 1, height: 14, background: '#333' }} />
      <button
        onClick={handleResetView}
        style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#fff', letterSpacing: '0.1em', background: 'transparent', border: '2px solid #fff', padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
      >RESET</button>
    </div>
  );
}
