import type { ClassMember, Social } from './types';
import { SOCIAL_ICONS } from './types';
import { getInitials } from './utils';

export function createCardElement(member: ClassMember, cardW: number, cardH: number, onExpand: (member: ClassMember) => void, col = 0, cols = 3): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: block; width: ${cardW}px; height: ${cardH}px;
    cursor: pointer; position: relative;
  `;

  // Depth direction based on card tilt: left cards → depth goes left, right cards → depth goes right, middle → straight down
  const isLeft = cols >= 2 && col === 0;
  const isRight = cols >= 2 && col === cols - 1;
  const dx = isLeft ? -1 : isRight ? 1 : 0;

  // Green depth layers — stacked behind the card to create thickness
  const depthLayers: HTMLElement[] = [];
  for (let i = 6; i >= 1; i--) {
    const layer = document.createElement('div');
    const shade = Math.round(10 + (i / 6) * 25);
    const green = Math.round(60 + (i / 6) * 80);
    layer.style.cssText = `
      position: absolute; inset: 0;
      background: rgb(${shade}, ${green}, ${Math.round(shade * 1.2)});
      border-radius: 8px;
      transform: translate(${i * dx}px, ${i}px);
      transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease;
      z-index: -1;
    `;
    wrapper.appendChild(layer);
    depthLayers.push(layer);
  }

  // Helper: set depth layer transforms
  const setDepthTransforms = (xMul: number, yMul: number, spread: number) => {
    depthLayers.forEach((layer, idx) => {
      const i = 6 - idx; // layers stored 6..1
      layer.style.transform = `translate(${i * dx * xMul * spread}px, ${i * yMul * spread}px)`;
    });
  };

  // Outer bezel — thick dark frame like a CRT monitor
  const bezel = document.createElement('div');
  bezel.style.cssText = `
    width: 100%; height: 100%; box-sizing: border-box;
    background: rgba(12,12,12,0.7);
    backdrop-filter: blur(20px) saturate(1.3);
    -webkit-backdrop-filter: blur(20px) saturate(1.3);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 6px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 30px rgba(34,197,94,0.15), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(34,197,94,0.08);
    position: relative;
    transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.4s ease;
  `;
  wrapper.appendChild(bezel);

  // Power LED
  const led = document.createElement('div');
  led.style.cssText = `
    position: absolute; bottom: -1px; left: 14px; z-index: 10;
    width: 6px; height: 6px; border-radius: 50%;
    background: #22c55e; box-shadow: 0 0 4px #22c55e;
    transition: background 0.3s ease, box-shadow 0.3s ease;
  `;
  bezel.appendChild(led);

  // Inner screen — the actual CRT display area
  const inner = document.createElement('div');
  inner.style.cssText = `
    display: flex; flex-direction: column;
    width: 100%; height: 100%; box-sizing: border-box;
    background: #0a0a0a;
    border-radius: 3px;
    position: relative; overflow: hidden;
    padding: 0;
    box-shadow: inset 0 0 40px rgba(0,0,0,0.8), inset 0 0 80px rgba(0,0,0,0.4);
  `;
  bezel.appendChild(inner);

  // Screen grid lines
  const grid = document.createElement('div');
  grid.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 1;
    background-image:
      repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px),
      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px);
  `;
  inner.appendChild(grid);

  // Scanlines
  const scanline = document.createElement('div');
  scanline.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 5;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px,
      rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px);
  `;
  inner.appendChild(scanline);

  // Screen glare — glass highlight
  const glare = document.createElement('div');
  glare.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 7;
    background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 25%, transparent 50%, transparent 75%, rgba(255,255,255,0.01) 100%);
    border-radius: 3px;
  `;
  inner.appendChild(glare);

  // Top edge highlight — glass bevel
  const topEdge = document.createElement('div');
  topEdge.style.cssText = `
    position: absolute; top: 0; left: 0; right: 0; height: 1px; z-index: 8;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.1) 80%, transparent);
    pointer-events: none; border-radius: 3px 3px 0 0;
  `;
  inner.appendChild(topEdge);

  // Vignette
  const vignette = document.createElement('div');
  vignette.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 6;
    background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%);
    border-radius: 3px;
  `;
  inner.appendChild(vignette);

  // Cursor-tracking phosphor glow
  const glow = document.createElement('div');
  glow.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 2;
    background: radial-gradient(ellipse at var(--mx, 50%) var(--my, 50%),
    rgba(34,197,94,0.08) 0%, transparent 50%);
    opacity: 0; transition: opacity 0.3s ease;
  `;
  inner.appendChild(glow);

  // ── NAME BAR ──
  const nameBar = document.createElement('div');
  nameBar.style.cssText = `
    position: relative; z-index: 4;
    padding: 8px 14px 6px;
    border-bottom: 1px solid #222;
    display: flex; align-items: center; justify-content: space-between;
  `;
  inner.appendChild(nameBar);

  const fontScale = Math.min(1, cardW / 450);
  const nameFontSize = Math.max(14, Math.round(24 * fontScale));
  const termFontSize = Math.max(10, Math.round(16 * fontScale));

  const nameEl = document.createElement('div');
  nameEl.textContent = member.name;
  nameEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${nameFontSize}px; letter-spacing: 0.12em;
    color: #fff;
    text-shadow: 2px 2px 0 #000;
  `;
  nameBar.appendChild(nameEl);

  const termEl = document.createElement('div');
  termEl.textContent = "'" + member.year;
  termEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${termFontSize}px; letter-spacing: 0.1em;
    color: #22c55e; background: rgba(34,197,94,0.1); padding: 3px 10px;
    border: 1px solid rgba(34,197,94,0.3);
    transition: background 0.3s ease, border-color 0.3s ease;
  `;
  nameBar.appendChild(termEl);

  // ── BODY ──
  const body = document.createElement('div');
  body.style.cssText = `
    display: flex; flex: 1; min-height: 0;
    position: relative; z-index: 4;
    padding: 10px 14px 10px 12px;
  `;
  inner.appendChild(body);

  // Avatar — screen-within-screen
  const imgW = Math.floor(cardH * 0.48);
  const imgBox = document.createElement('div');
  imgBox.style.cssText = `
    width: ${imgW}px; align-self: stretch; flex-shrink: 0;
    background: #111; border: 1px solid #333;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 2px 2px 0px rgba(0,0,0,0.3);
  `;
  if (member.avatar) {
    const img = document.createElement('img');
    img.src = member.avatar;
    img.alt = member.name;
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
    imgBox.appendChild(img);
  } else {
    const initials = document.createElement('span');
    initials.textContent = getInitials(member.name);
    initials.style.cssText = `font-family: var(--font-arcade); font-size: 28px; color: #333; letter-spacing: 0.08em;`;
    imgBox.appendChild(initials);
  }
  body.appendChild(imgBox);

  // Info
  const info = document.createElement('div');
  info.style.cssText = `
    flex: 1; min-width: 0; display: flex; flex-direction: column;
    justify-content: center; gap: 2px; padding: 8px 10px;
    margin-left: 10px;
  `;

  const roleFontSize = Math.max(9, Math.round(12 * fontScale));
  const locFontSize = Math.max(8, Math.round(11 * fontScale));

  const roleEl = document.createElement('div');
  roleEl.textContent = member.role;
  roleEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${roleFontSize}px; letter-spacing: 0.1em;
    color: #fff; text-transform: uppercase;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  `;
  info.appendChild(roleEl);

  const locEl = document.createElement('div');
  locEl.textContent = `${member.location}  //  ${member.school}`;
  locEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${locFontSize}px; letter-spacing: 0.06em;
    color: #777; transition: color 0.3s ease;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  `;
  info.appendChild(locEl);

  const blurbEl = document.createElement('div');
  blurbEl.textContent = `\u201C${member.blurb}\u201D`;
  blurbEl.style.cssText = `
    font-family: monospace; font-size: 11px; color: #22c55e;
    line-height: 1.5; overflow: hidden;
    margin-top: 4px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  `;
  info.appendChild(blurbEl);

  // Socials — absolute bottom-right of body, overlaid
  if (member.socials && member.socials.length > 0) {
    const row = document.createElement('div');
    row.style.cssText = `
      position: absolute; bottom: 10px; right: 14px; z-index: 8;
      display: flex; gap: 4px;
    `;
    for (const social of member.socials) {
      const btn = document.createElement('a');
      btn.href = social.url;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      btn.style.cssText = `
        color: #fff; display: flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; background: #1a1a1a; border: 1px solid #333;
        text-decoration: none; transition: all 0.2s ease;
      `;
      btn.innerHTML = SOCIAL_ICONS[social.type] || '';
      btn.addEventListener('mouseenter', () => { btn.style.background = '#22c55e'; btn.style.color = '#000'; btn.style.borderColor = '#22c55e'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#1a1a1a'; btn.style.color = '#fff'; btn.style.borderColor = '#333'; });
      btn.addEventListener('click', (e) => e.stopPropagation());
      row.appendChild(btn);
    }
    inner.appendChild(row);
  }

  body.appendChild(info);

  // ── CLICK → CRT power-on punch, then expand ──
  wrapper.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) return;
    // Flash the screen green + punch scale
    bezel.style.transition = 'transform 0.08s ease-out, box-shadow 0.08s ease-out';
    bezel.style.transform = 'scale(0.95)';
    bezel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.8), 0 0 60px rgba(34,197,94,0.4), inset 0 0 40px rgba(34,197,94,0.15)';
    setDepthTransforms(1, 1, 0.3); // compress depth on press
    inner.style.transition = 'filter 0.08s ease-out';
    inner.style.filter = 'brightness(1.6)';
    led.style.background = '#fff';
    led.style.boxShadow = '0 0 12px #fff, 0 0 24px rgba(34,197,94,0.6)';
    setTimeout(() => {
      bezel.style.transition = 'transform 0.15s ease-in, box-shadow 0.15s ease-in';
      bezel.style.transform = 'scale(1.03)';
      setDepthTransforms(1, 1, 2); // explode depth outward
      inner.style.filter = 'brightness(1)';
      setTimeout(() => {
        bezel.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.4s ease';
        setDepthTransforms(1, 1, 1); // reset
        inner.style.transition = '';
        inner.style.filter = '';
        onExpand(member);
      }, 100);
    }, 100);
  });

  // ── HOVER — screen powers up with scanline boost + green edge glow ──
  wrapper.addEventListener('mouseenter', () => {
    bezel.style.transform = 'translateY(-6px) scale(1.02)';
    bezel.style.borderColor = 'rgba(34,197,94,0.25)';
    bezel.style.boxShadow = '0 16px 48px rgba(0,0,0,0.8), 0 0 40px rgba(34,197,94,0.2), 0 0 80px rgba(34,197,94,0.08), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(34,197,94,0.15)';
    setDepthTransforms(1, 1, 1.6); // spread out depth layers
    glow.style.opacity = '1';
    led.style.background = '#4ade80';
    led.style.boxShadow = '0 0 8px #4ade80, 0 0 20px rgba(34,197,94,0.4)';
    scanline.style.background = 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)';
    nameBar.style.borderBottomColor = '#22c55e';
    nameEl.style.textShadow = '2px 2px 0 #000, 0 0 8px rgba(34,197,94,0.3)';
    termEl.style.background = 'rgba(34,197,94,0.25)';
    termEl.style.borderColor = '#22c55e';
    blurbEl.style.textShadow = '0 0 6px rgba(34,197,94,0.3)';
    locEl.style.color = '#aaa';
  });

  wrapper.addEventListener('mouseleave', () => {
    bezel.style.transform = 'translateY(0) scale(1)';
    bezel.style.borderColor = 'rgba(255,255,255,0.08)';
    bezel.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6), 0 0 30px rgba(34,197,94,0.15), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(34,197,94,0.08)';
    setDepthTransforms(1, 1, 1); // reset depth layers
    glow.style.opacity = '0';
    led.style.background = '#22c55e';
    led.style.boxShadow = '0 0 4px #22c55e';
    scanline.style.background = 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)';
    nameBar.style.borderBottomColor = '#222';
    nameEl.style.textShadow = '2px 2px 0 #000';
    termEl.style.background = 'rgba(34,197,94,0.1)';
    termEl.style.borderColor = 'rgba(34,197,94,0.3)';
    blurbEl.style.textShadow = 'none';
    locEl.style.color = '#777';
  });

  // ── MOUSE MOVE for glow tracking ──
  wrapper.addEventListener('mousemove', (e) => {
    const rect = inner.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const my = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    inner.style.setProperty('--mx', mx + '%');
    inner.style.setProperty('--my', my + '%');
  });

  return wrapper;
}
