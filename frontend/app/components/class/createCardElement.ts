import type { ClassMember, Social } from './types';
import { SOCIAL_ICONS } from './types';
import { getInitials } from './utils';

export function createCardElement(member: ClassMember, cardW: number, cardH: number, onExpand: (member: ClassMember) => void, col = 0, cols = 3): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: block; width: ${cardW}px; height: ${cardH}px;
    cursor: pointer; position: relative;
  `;

  // Depth direction based on card tilt
  const isLeft = cols >= 2 && col === 0;
  const isRight = cols >= 2 && col === cols - 1;
  const dx = isLeft ? -1 : isRight ? 1 : 0;

  // White depth layers — stacked behind the card to create thickness
  const depthLayers: HTMLElement[] = [];
  for (let i = 6; i >= 1; i--) {
    const layer = document.createElement('div');
    const v = Math.round(140 + (i / 6) * 115); // white gradient: brighter closer
    layer.style.cssText = `
      position: absolute; inset: 0;
      background: rgb(${v}, ${v}, ${v});
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
      const i = 6 - idx;
      layer.style.transform = `translate(${i * dx * xMul * spread}px, ${i * yMul * spread}px)`;
    });
  };

  // Outer bezel
  const bezel = document.createElement('div');
  bezel.style.cssText = `
    width: 100%; height: 100%; box-sizing: border-box;
    background: rgba(12,12,12,0.7);
    backdrop-filter: blur(20px) saturate(1.3);
    -webkit-backdrop-filter: blur(20px) saturate(1.3);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 6px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 30px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.04);
    position: relative;
    transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.4s ease;
  `;
  wrapper.appendChild(bezel);

  // Power LED — white
  const led = document.createElement('div');
  led.style.cssText = `
    position: absolute; bottom: -1px; left: 14px; z-index: 10;
    width: 6px; height: 6px; border-radius: 50%;
    background: #fff; box-shadow: 0 0 4px rgba(255,255,255,0.6);
    transition: background 0.3s ease, box-shadow 0.3s ease;
  `;
  bezel.appendChild(led);

  // Inner screen
  const inner = document.createElement('div');
  inner.style.cssText = `
    display: flex; flex-direction: column;
    width: 100%; height: 100%; box-sizing: border-box;
    background: #0a0a0a;
    border-radius: 3px;
    position: relative; overflow: hidden;
    padding: 0;
    box-shadow: inset 0 0 40px rgba(0,0,0,0.8), inset 0 0 80px rgba(0,0,0,0.4);
    transition: background 0.4s ease, box-shadow 0.4s ease;
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
    transition: background 0.4s ease;
  `;
  inner.appendChild(scanline);

  // Screen glare
  const glare = document.createElement('div');
  glare.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 7;
    background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 25%, transparent 50%, transparent 75%, rgba(255,255,255,0.01) 100%);
    border-radius: 3px;
  `;
  inner.appendChild(glare);

  // Top edge highlight
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

  // Cursor-tracking glow — white
  const glow = document.createElement('div');
  glow.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 2;
    background: radial-gradient(ellipse at var(--mx, 50%) var(--my, 50%),
    rgba(255,255,255,0.06) 0%, transparent 50%);
    opacity: 0; transition: opacity 0.4s ease;
  `;
  inner.appendChild(glow);

  // ── NAME BAR ──
  const nameBar = document.createElement('div');
  nameBar.style.cssText = `
    position: relative; z-index: 4;
    padding: 8px 14px 6px;
    border-bottom: 1px solid #222;
    display: flex; align-items: center; justify-content: space-between;
    transition: border-color 0.4s ease;
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
    transition: text-shadow 0.4s ease;
  `;
  nameBar.appendChild(nameEl);

  const termEl = document.createElement('div');
  termEl.textContent = "'" + member.year;
  termEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${termFontSize}px; letter-spacing: 0.1em;
    color: #fff; background: rgba(255,255,255,0.08); padding: 3px 10px;
    border: 1px solid rgba(255,255,255,0.2);
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

  // Avatar
  const imgW = Math.floor(cardH * 0.48);
  const imgBox = document.createElement('div');
  imgBox.style.cssText = `
    width: ${imgW}px; align-self: stretch; flex-shrink: 0;
    background: #111;
    border: 2px solid rgba(255,255,255,0.4);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    box-shadow: 2px 2px 0 #000, 3px 3px 0 #000, 4px 4px 0 #111, 5px 5px 0 rgba(0,0,0,0.4), 6px 6px 0 rgba(255,255,255,0.3), inset 0 0 20px rgba(0,0,0,0.6);
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
    justify-content: flex-start; gap: 2px; padding: 8px 10px;
    margin-left: 10px;
  `;

  const roleFontSize = Math.max(9, Math.round(12 * fontScale));
  const locFontSize = Math.max(8, Math.round(11 * fontScale));

  const roleRow = document.createElement('div');
  roleRow.style.cssText = `
    display: flex; align-items: center; gap: 6px;
  `;

  const roleEl = document.createElement('div');
  roleEl.textContent = member.role;
  roleEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${roleFontSize}px; letter-spacing: 0.1em;
    color: #fff; text-transform: uppercase;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  `;
  roleRow.appendChild(roleEl);

  if (member.socials && member.socials.length > 0) {
    const socialRow = document.createElement('div');
    socialRow.style.cssText = `
      display: flex; gap: 3px; flex-shrink: 0;
    `;
    for (const social of member.socials) {
      const btn = document.createElement('a');
      btn.href = social.url;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      btn.style.cssText = `
        color: #fff; display: flex; align-items: center; justify-content: center;
        width: 20px; height: 20px; background: #1a1a1a; border: 1px solid #333;
        text-decoration: none; transition: all 0.2s ease;
      `;
      btn.innerHTML = SOCIAL_ICONS[social.type] || '';
      btn.addEventListener('mouseenter', () => { btn.style.background = '#fff'; btn.style.color = '#000'; btn.style.borderColor = '#fff'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#1a1a1a'; btn.style.color = '#fff'; btn.style.borderColor = '#333'; });
      btn.addEventListener('click', (e) => e.stopPropagation());
      socialRow.appendChild(btn);
    }
    roleRow.appendChild(socialRow);
  }

  info.appendChild(roleRow);

  const locEl = document.createElement('div');
  locEl.textContent = `${member.location}  //  ${member.school}`;
  locEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${locFontSize}px; letter-spacing: 0.06em;
    color: #777; transition: color 0.3s ease;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  `;
  info.appendChild(locEl);

  if (member.tagline) {
    const descEl = document.createElement('div');
    descEl.textContent = member.tagline;
    descEl.style.cssText = `
      font-family: monospace; font-size: 10px; color: #fff;
      letter-spacing: 0.04em; margin-top: 4px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      opacity: 0.7;
    `;
    info.appendChild(descEl);
  }

  const blurbEl = document.createElement('div');
  blurbEl.textContent = `\u201C${member.blurb}\u201D`;
  blurbEl.style.cssText = `
    font-family: monospace; font-size: 11px; color: #aaa;
    line-height: 1.5; overflow: hidden;
    margin-top: 4px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    transition: text-shadow 0.4s ease;
  `;
  info.appendChild(blurbEl);


  body.appendChild(info);

  // ── CLICK ──
  wrapper.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) return;
    bezel.style.transition = 'transform 0.08s ease-out, box-shadow 0.08s ease-out';
    bezel.style.transform = 'scale(0.95)';
    bezel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.8), 0 0 60px rgba(255,255,255,0.15), inset 0 0 40px rgba(255,255,255,0.05)';
    setDepthTransforms(1, 1, 0.3);
    inner.style.transition = 'filter 0.08s ease-out';
    inner.style.filter = 'brightness(1.6)';
    led.style.boxShadow = '0 0 12px #fff, 0 0 24px rgba(255,255,255,0.6)';
    setTimeout(() => {
      bezel.style.transition = 'transform 0.15s ease-in, box-shadow 0.15s ease-in';
      bezel.style.transform = 'scale(1.03)';
      setDepthTransforms(1, 1, 2);
      inner.style.filter = 'brightness(1)';
      setTimeout(() => {
        bezel.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.4s ease';
        setDepthTransforms(1, 1, 1);
        inner.style.transition = 'background 0.4s ease, box-shadow 0.4s ease';
        inner.style.filter = '';
        onExpand(member);
      }, 100);
    }, 100);
  });

  // ── HOVER ──
  wrapper.addEventListener('mouseenter', () => {
    bezel.style.transform = 'translateY(-6px) scale(1.02)';
    bezel.style.borderColor = 'rgba(255,255,255,0.25)';
    bezel.style.boxShadow = '0 16px 48px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.15), 0 0 60px rgba(255,255,255,0.08), 0 0 100px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 0 1px rgba(255,255,255,0.08)';
    setDepthTransforms(1, 1, 1.6);
    inner.style.background = '#1a1a1a';
    inner.style.boxShadow = 'inset 0 0 30px rgba(255,255,255,0.05), inset 0 0 60px rgba(255,255,255,0.03)';
    glow.style.opacity = '1';
    led.style.boxShadow = '0 0 8px #fff, 0 0 20px rgba(255,255,255,0.4)';
    scanline.style.background = 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)';
    nameBar.style.borderBottomColor = 'rgba(255,255,255,0.3)';
    nameEl.style.textShadow = '2px 2px 0 #000, 0 0 10px rgba(255,255,255,0.2)';
    termEl.style.background = 'rgba(255,255,255,0.15)';
    termEl.style.borderColor = 'rgba(255,255,255,0.4)';
    blurbEl.style.textShadow = '0 0 6px rgba(255,255,255,0.15)';
    locEl.style.color = '#aaa';
  });

  wrapper.addEventListener('mouseleave', () => {
    bezel.style.transform = 'translateY(0) scale(1)';
    bezel.style.borderColor = 'rgba(255,255,255,0.12)';
    bezel.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6), 0 0 30px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.04)';
    setDepthTransforms(1, 1, 1);
    inner.style.background = '#0a0a0a';
    inner.style.boxShadow = 'inset 0 0 40px rgba(0,0,0,0.8), inset 0 0 80px rgba(0,0,0,0.4)';
    glow.style.opacity = '0';
    led.style.boxShadow = '0 0 4px rgba(255,255,255,0.6)';
    scanline.style.background = 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)';
    nameBar.style.borderBottomColor = '#222';
    nameEl.style.textShadow = '2px 2px 0 #000';
    termEl.style.background = 'rgba(255,255,255,0.08)';
    termEl.style.borderColor = 'rgba(255,255,255,0.2)';
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
