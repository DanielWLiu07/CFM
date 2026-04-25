import type { ClassMember } from './types';
import { getInitials } from './utils';

export function createCardElement(member: ClassMember, cardW: number, cardH: number, onExpand: (member: ClassMember) => void, col = 0, cols = 3): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: block; width: ${cardW}px; height: ${cardH}px;
    cursor: pointer; position: relative;
  `;

  const isLeft = cols >= 2 && col === 0;
  const isRight = cols >= 2 && col === cols - 1;
  const dx = isLeft ? -1 : isRight ? 1 : 0;

  const depthLayers: HTMLElement[] = [];
  for (let i = 6; i >= 1; i--) {
    const layer = document.createElement('div');
    const v = Math.round(140 + (i / 6) * 115);
    layer.style.cssText = `
      position: absolute; inset: 0;
      background: rgb(${v}, ${v}, ${v});
      border-radius: 8px;
      transform: translate(${i * dx}px, ${i}px);
      transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
      z-index: -1;
    `;
    wrapper.appendChild(layer);
    depthLayers.push(layer);
  }

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

  // Power LED
  const led = document.createElement('div');
  led.style.cssText = `
    position: absolute; bottom: -1px; left: 14px; z-index: 10;
    width: 6px; height: 6px; border-radius: 50%;
    background: #333; box-shadow: none;
    transition: background 0.25s ease, box-shadow 0.25s ease;
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
  `;
  bezel.appendChild(inner);

  // ── Screen content — opacity-only reveal (fastest GPU composite) ──
  const screenContent = document.createElement('div');
  screenContent.style.cssText = `
    position: absolute; inset: 0; z-index: 4;
    display: flex; flex-direction: column;
    opacity: 0;
    transition: opacity 0.3s ease;
    will-change: opacity;
  `;
  inner.appendChild(screenContent);

  // Scanlines — baked in, no transition needed
  const scanline = document.createElement('div');
  scanline.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 5;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px,
      rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px);
  `;
  inner.appendChild(scanline);

  // Vignette — baked in
  const vignette = document.createElement('div');
  vignette.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 6;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%);
    border-radius: 3px;
  `;
  inner.appendChild(vignette);

  // Sweeping scanline bar
  const sweep = document.createElement('div');
  sweep.style.cssText = `
    position: absolute; left: 0; right: 0; height: 80px; pointer-events: none; z-index: 7;
    background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 80%, transparent 100%);
    animation: crt-scanline-sweep 3s linear infinite;
    opacity: 0; transition: opacity 0.25s ease;
  `;
  inner.appendChild(sweep);

  // ── AVATAR REGION — pixelated TV look ──
  const avatarRegion = document.createElement('div');
  avatarRegion.style.cssText = `
    flex: 1; min-height: 0; position: relative;
    overflow: hidden; display: flex; align-items: center; justify-content: center;
    background: #0a0a0a;
  `;

  if (member.avatar) {
    const img = document.createElement('img');
    img.alt = member.name;
    img.loading = 'eager';
    img.decoding = 'async';
    img.style.cssText = `
      width: 100%; height: 100%; object-fit: cover;
      image-rendering: auto;
      filter: saturate(0.8) contrast(1.1) brightness(0.95);
      transition: filter 0.3s ease, image-rendering 0s;
      opacity: 0;
      transition: opacity 0.2s ease, filter 0.3s ease, image-rendering 0s;
    `;

    // Show image once loaded
    img.onload = () => {
      img.style.opacity = '1';
    };

    // Handle errors by showing initials instead
    img.onerror = () => {
      const initials = document.createElement('span');
      initials.textContent = getInitials(member.name);
      initials.style.cssText = `font-family: var(--font-arcade); font-size: 48px; color: #333; letter-spacing: 0.08em;`;
      avatarRegion.innerHTML = '';
      avatarRegion.appendChild(initials);
      avatarRegion.dataset.hasImage = 'false';
    };

    img.src = member.avatar; // Set src after handlers
    avatarRegion.appendChild(img);
    avatarRegion.dataset.hasImage = 'true';
  } else {
    const initials = document.createElement('span');
    initials.textContent = getInitials(member.name);
    initials.style.cssText = `font-family: var(--font-arcade); font-size: 48px; color: #333; letter-spacing: 0.08em;`;
    avatarRegion.appendChild(initials);
  }

  // RGB pixel grid overlay — simulates CRT sub-pixel structure
  const pixelGrid = document.createElement('div');
  pixelGrid.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 1;
    background-image:
      repeating-linear-gradient(90deg,
        rgba(255,0,0,0.03) 0px, rgba(255,0,0,0.03) 1px,
        rgba(0,255,0,0.03) 1px, rgba(0,255,0,0.03) 2px,
        rgba(0,100,255,0.03) 2px, rgba(0,100,255,0.03) 3px,
        transparent 3px, transparent 4px);
    mix-blend-mode: screen;
  `;
  avatarRegion.appendChild(pixelGrid);

  screenContent.appendChild(avatarRegion);

  // ── NAME BAR (bottom) ──
  const fontScale = Math.min(1, cardW / 280);
  const nameFontSize = Math.max(12, Math.round(18 * fontScale));
  const termFontSize = Math.max(9, Math.round(13 * fontScale));

  const nameBar = document.createElement('div');
  nameBar.style.cssText = `
    position: relative;
    padding: 8px 12px 7px;
    border-top: 1px solid #222;
    display: flex; align-items: center; justify-content: space-between;
    transition: border-color 0.3s ease;
    flex-shrink: 0;
  `;

  const nameEl = document.createElement('div');
  nameEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${nameFontSize}px; letter-spacing: 0.1em;
    color: #fff;
    text-shadow: 2px 2px 0 #000;
    transition: text-shadow 0.3s ease;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  `;
  const prompt = document.createElement('span');
  prompt.textContent = '> ';
  prompt.style.cssText = `color: #22c55e; text-shadow: 0 0 6px rgba(34,197,94,0.5);`;
  nameEl.appendChild(prompt);
  nameEl.appendChild(document.createTextNode(member.name));
  nameBar.appendChild(nameEl);

  const termEl = document.createElement('div');
  termEl.textContent = "'" + member.year;
  termEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${termFontSize}px; letter-spacing: 0.1em;
    color: #fff; background: rgba(255,255,255,0.08); padding: 2px 8px;
    border: 1px solid rgba(255,255,255,0.2);
    flex-shrink: 0; margin-left: 8px;
    transition: background 0.3s ease, border-color 0.3s ease;
  `;
  nameBar.appendChild(termEl);

  screenContent.appendChild(nameBar);

  // ── CRT ON/OFF — pure opacity, fastest possible ──
  let isOn = false;

  const turnOn = () => {
    if (isOn) return;
    isOn = true;
    led.style.background = '#22c55e';
    led.style.boxShadow = '0 0 4px rgba(34,197,94,0.6)';
    screenContent.style.opacity = '1';
    sweep.style.opacity = '1';
  };

  const turnOff = () => {
    if (!isOn) return;
    isOn = false;
    screenContent.style.opacity = '0';
    led.style.background = '#333';
    led.style.boxShadow = 'none';
    sweep.style.opacity = '0';
  };

  (wrapper as any)._crtTurnOn = turnOn;
  (wrapper as any)._crtTurnOff = turnOff;

  // ── CLICK ──
  wrapper.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) return;
    bezel.style.transition = 'transform 0.08s ease-out, box-shadow 0.08s ease-out';
    bezel.style.transform = 'scale(0.95)';
    setDepthTransforms(1, 1, 0.3);
    led.style.boxShadow = '0 0 12px #22c55e, 0 0 24px rgba(34,197,94,0.6)';
    setTimeout(() => {
      bezel.style.transition = 'transform 0.15s ease-in, box-shadow 0.15s ease-in';
      bezel.style.transform = 'scale(1.03)';
      setDepthTransforms(1, 1, 2);
      setTimeout(() => {
        bezel.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.4s ease';
        setDepthTransforms(1, 1, 1);
        onExpand(member);
      }, 100);
    }, 100);
  });

  // ── HOVER ──
  wrapper.addEventListener('mouseenter', () => {
    if (!isOn) return;
    bezel.style.transform = 'translateY(-6px) scale(1.02)';
    bezel.style.borderColor = 'rgba(34,197,94,0.2)';
    bezel.style.boxShadow = '0 16px 48px rgba(0,0,0,0.8), 0 0 30px rgba(34,197,94,0.12), 0 0 60px rgba(34,197,94,0.06), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 0 1px rgba(34,197,94,0.08)';
    setDepthTransforms(1, 1, 1.6);
    nameBar.style.borderTopColor = 'rgba(34,197,94,0.3)';
    nameEl.style.textShadow = '2px 2px 0 #000, 0 0 8px rgba(34,197,94,0.15)';
    termEl.style.background = 'rgba(34,197,94,0.12)';
    termEl.style.borderColor = 'rgba(34,197,94,0.35)';
    led.style.boxShadow = '0 0 8px #22c55e, 0 0 20px rgba(34,197,94,0.5)';

    if (avatarRegion.dataset.hasImage) {
      const img = avatarRegion.querySelector('img');
      if (img) img.style.filter = 'saturate(0.7) contrast(1.15) brightness(1.05)';
    }
  });

  wrapper.addEventListener('mouseleave', () => {
    if (!isOn) return;
    bezel.style.transform = 'translateY(0) scale(1)';
    bezel.style.borderColor = 'rgba(255,255,255,0.12)';
    bezel.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6), 0 0 30px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.04)';
    setDepthTransforms(1, 1, 1);
    nameBar.style.borderTopColor = '#222';
    nameEl.style.textShadow = '2px 2px 0 #000';
    termEl.style.background = 'rgba(255,255,255,0.08)';
    termEl.style.borderColor = 'rgba(255,255,255,0.2)';
    led.style.boxShadow = '0 0 4px rgba(34,197,94,0.6)';

    if (avatarRegion.dataset.hasImage) {
      const img = avatarRegion.querySelector('img');
      if (img) img.style.filter = 'saturate(0.8) contrast(1.1) brightness(0.95)';
    }
  });

  // ── MOUSE MOVE for glow tracking — lightweight, just CSS var ──
  wrapper.addEventListener('mousemove', (e) => {
    const rect = inner.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const my = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    inner.style.setProperty('--mx', mx + '%');
    inner.style.setProperty('--my', my + '%');
  });

  return wrapper;
}
