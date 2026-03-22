'use client';

import { useRef, useCallback, useState, forwardRef } from 'react';

interface TerminalCardProps {
  title: string;
  children: React.ReactNode;
  image?: string;
  className?: string;
  style?: React.CSSProperties;
}

function makePixelExtrusion() {
  const steps = Array.from({ length: 6 }, (_, j) => {
    const y = (j + 1) * 2;
    const x = Math.round(y * 0.4);
    const v = Math.max(0, 30 - j * 5);
    return `${x}px ${y}px 0 rgb(${v},${v},${v})`;
  });
  return steps.join(', ');
}

const TerminalCard = forwardRef<HTMLDivElement, TerminalCardProps>(
  function TerminalCard({ title, children, image, className = '', style = {} }, ref) {
    const innerRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const card = innerRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
    }, []);

    const handleMouseLeave = useCallback(() => {
      const card = innerRef.current;
      if (!card) return;
      card.style.transform = 'rotateY(0deg) rotateX(0deg)';
      setHovered(false);
    }, []);

    return (
      <div ref={ref} className={className} style={{ perspective: 1000, ...style }}>
        <div
          ref={innerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={handleMouseLeave}
          style={{
            transition: 'transform 0.15s ease-out',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            boxShadow: `${makePixelExtrusion()}, 0 0 25px rgba(255, 255, 255, 0.15), 0 0 80px rgba(255, 255, 255, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
            background: 'rgba(5, 5, 5, 0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            position: 'relative',
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column' as const,
          }}
        >
          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
            }}
          />

          {/* Terminal title bar */}
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.4)' }}
          >
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: 'var(--font-arcade)',
                  fontSize: 14,
                  letterSpacing: '0.1em',
                  color: '#ccc',
                }}
              >
                {title}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 16,
                  background: '#aaa',
                  animation: 'terminal-cursor-blink 1s step-end infinite',
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#aaa',
                  display: 'inline-block',
                  boxShadow: '0 0 4px rgba(255,255,255,0.4)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-arcade)',
                  fontSize: 10,
                  color: '#aaa',
                  letterSpacing: '0.1em',
                }}
              >
                LIVE
              </span>
            </div>
          </div>

          {/* Terminal body */}
          <div
            style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
          >
            <div
              className="p-5 md:p-6"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                lineHeight: 1.7,
                color: '#e0e0e0',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {children}
            </div>
            {image && (
              <div
                style={{
                  width: '35%',
                  flexShrink: 0,
                  borderLeft: '1px solid rgba(255,255,255,0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Halftone/dither overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none" style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.15) 1px, rgba(0,0,0,0.15) 2px)',
                  mixBlendMode: 'multiply',
                }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'grayscale(1) contrast(1.2) brightness(0.8)',
                  }}
                />
                {/* Corner brackets */}
                <div className="absolute top-2 left-2 pointer-events-none" style={{ width: 12, height: 12, borderTop: '1px solid rgba(255,255,255,0.3)', borderLeft: '1px solid rgba(255,255,255,0.3)' }} />
                <div className="absolute top-2 right-2 pointer-events-none" style={{ width: 12, height: 12, borderTop: '1px solid rgba(255,255,255,0.3)', borderRight: '1px solid rgba(255,255,255,0.3)' }} />
                <div className="absolute bottom-2 left-2 pointer-events-none" style={{ width: 12, height: 12, borderBottom: '1px solid rgba(255,255,255,0.3)', borderLeft: '1px solid rgba(255,255,255,0.3)' }} />
                <div className="absolute bottom-2 right-2 pointer-events-none" style={{ width: 12, height: 12, borderBottom: '1px solid rgba(255,255,255,0.3)', borderRight: '1px solid rgba(255,255,255,0.3)' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default TerminalCard;
