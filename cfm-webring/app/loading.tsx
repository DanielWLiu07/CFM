export default function Loading() {
  const letters = 'LOADING...'.split('');

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: '#000',
        zIndex: 99999,
        animation: 'loading-fade-in 0.4s ease-out forwards',
      }}
    >
      {/* Bouncing letters */}
      <div style={{ display: 'flex', gap: 2 }}>
        {letters.map((ch, i) => (
          <span
            key={i}
            style={{
              fontFamily: 'ArcadeClassic, var(--font-arcade), monospace',
              fontSize: 'clamp(24px, 4vw, 40px)',
              letterSpacing: '0.2em',
              color: '#fff',
              display: 'inline-block',
              animation: `letter-bounce 1.8s ease-in-out ${i * 0.08}s infinite`,
            }}
          >
            {ch}
          </span>
        ))}
      </div>

      {/* Thin progress-style line */}
      <div style={{
        width: 'clamp(120px, 20vw, 200px)',
        height: 2,
        background: 'rgba(255,255,255,0.08)',
        marginTop: 24,
        overflow: 'hidden',
      }}>
        <div style={{
          width: '40%',
          height: '100%',
          background: '#fff',
          animation: 'loading-bar-sweep 1.5s ease-in-out infinite',
        }} />
      </div>

      {/* Scanlines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
        }}
      />

      <style>{`
        @keyframes loading-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes letter-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          15% { transform: translateY(-12px); opacity: 1; }
          30% { transform: translateY(0); opacity: 0.7; }
          50% { transform: translateY(0); opacity: 0.5; }
        }
        @keyframes loading-bar-sweep {
          0% { transform: translateX(-150%); }
          50% { transform: translateX(400%); }
          100% { transform: translateX(-150%); }
        }
      `}</style>
    </div>
  );
}
