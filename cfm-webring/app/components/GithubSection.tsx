'use client';

const REPO_URL = 'https://github.com/DanielWLiu07/CFM';

const TECH_STACK = {
  frontend: [
    'Next.js 16',
    'React 19',
    'TypeScript',
    'Tailwind CSS 4',
    'Three.js / R3F',
  ],
  backend: [
    'Vercel Edge',
    'Node.js',
  ],
  tools: [
    'Turbopack',
    'ESLint',
    'Blender',
  ],
};

export default function GithubSection() {
  return (
    <section className="relative flex flex-col items-center justify-center py-20 px-6" style={{ background: '#000', minHeight: '60vh' }}>

      {/* Terminal box */}
      <div style={{
        width: '100%',
        maxWidth: 700,
        border: '2px solid #333',
        background: 'rgba(0,0,0,0.9)',
        boxShadow: '3px 3px 0 #000, 0 0 40px rgba(255,255,255,0.03)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
          zIndex: 1,
        }} />

        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid #222', background: '#0a0a0a' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
          <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, letterSpacing: '0.1em', color: '#fff' }}>SOURCE CODE</span>
          <span style={{ display: 'inline-block', width: 7, height: 12, background: '#fff', animation: 'terminal-cursor-blink 1s step-end infinite' }} />
        </div>

        {/* Content */}
        <div className="relative p-6" style={{ zIndex: 2 }}>
          {/* Prompt line */}
          <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 20, letterSpacing: '0.08em' }}>
            {'>'} cat tech_stack.txt
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Frontend */}
            <div>
              <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, color: '#fff', letterSpacing: '0.1em', marginBottom: 12 }}>
                FRONTEND
              </div>
              {TECH_STACK.frontend.map((item) => (
                <div key={item} style={{ fontFamily: 'var(--font-arcade)', fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.05em' }}>
                  {'> '}{item}
                </div>
              ))}
            </div>

            {/* Backend */}
            <div>
              <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, color: '#fff', letterSpacing: '0.1em', marginBottom: 12 }}>
                BACKEND
              </div>
              {TECH_STACK.backend.map((item) => (
                <div key={item} style={{ fontFamily: 'var(--font-arcade)', fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.05em' }}>
                  {'> '}{item}
                </div>
              ))}
            </div>

            {/* Tools */}
            <div>
              <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, color: '#fff', letterSpacing: '0.1em', marginBottom: 12 }}>
                TOOLS
              </div>
              {TECH_STACK.tools.map((item) => (
                <div key={item} style={{ fontFamily: 'var(--font-arcade)', fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.05em' }}>
                  {'> '}{item}
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #222', margin: '24px 0' }} />

          {/* GitHub link */}
          <div className="flex items-center justify-between">
            <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
              {'>'} open --repo
            </div>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-btn"
              style={{
                fontFamily: 'var(--font-arcade)',
                fontSize: 11,
                letterSpacing: '0.1em',
                color: '#fff',
                border: '1px solid #444',
                padding: '8px 20px',
                background: 'transparent',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              VIEW ON GITHUB
            </a>
          </div>
        </div>
      </div>

      {/* Sponge */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/sponge.png"
        alt=""
        className="absolute pointer-events-none select-none"
        style={{ bottom: 0, right: 0, height: '60%', width: 'auto', maxWidth: 'none', opacity: 0.85 }}
      />

      {/* Footer */}
      <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 32, letterSpacing: '0.1em', textAlign: 'center' }}>
        BUILT BY CFM STUDENTS  //  2026
      </div>
    </section>
  );
}
