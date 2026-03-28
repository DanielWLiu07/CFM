'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#fff',
      fontFamily: 'var(--font-arcade)',
      gap: 20,
      padding: 40,
    }}>
      <h1 style={{ fontSize: 24, letterSpacing: '0.15em' }}>SOMETHING WENT WRONG</h1>
      <p style={{ fontSize: 12, color: '#888', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        style={{
          fontFamily: 'var(--font-arcade)',
          fontSize: 12,
          letterSpacing: '0.15em',
          color: '#fff',
          border: '2px solid #fff',
          padding: '8px 20px',
          background: 'transparent',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
      >
        TRY AGAIN
      </button>
    </div>
  );
}
