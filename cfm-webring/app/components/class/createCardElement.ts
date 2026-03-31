import type { ClassMember, Social } from './types';
import { SOCIAL_ICONS } from './types';
import { getInitials } from './utils';

export function createCardElement(member: ClassMember, cardW: number, cardH: number, onExpand: (member: ClassMember) => void): HTMLElement {
  // Outer wrapper
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: block; width: ${cardW}px; height: ${cardH}px;
    cursor: pointer; position: relative;
  `;

  // Inner — dark base, TV image as faint overlay
  const inner = document.createElement('div');
  inner.style.cssText = `
    display: flex; flex-direction: column;
    width: 100%; height: 100%; box-sizing: border-box;
    background-image: url(/images/person_tv.webp);
    background-size: 100% 100%; background-repeat: no-repeat;
    position: relative; overflow: hidden;
    padding: 0;
    transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
    border: none;
  `;
  wrapper.appendChild(inner);

  // Scanlines
  const scanline = document.createElement('div');
  scanline.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 1;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px,
      rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px);
  `;
  inner.appendChild(scanline);

  // Cursor-tracking glow
  const glow = document.createElement('div');
  glow.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 2;
    background: radial-gradient(ellipse at var(--mx, 50%) var(--my, 50%),
    rgba(255,255,255,0.04) 0%, transparent 50%);
    opacity: 0; transition: opacity 0.3s ease;
  `;
  inner.appendChild(glow);

  // ── NAME BAR ──
  const nameBar = document.createElement('div');
  nameBar.style.cssText = `
    position: relative; z-index: 4;
    padding: 8px 14px 6px;
    border-bottom: 1px solid #1a1a1a;
    display: flex; align-items: center; justify-content: space-between;
    transition: border-color 0.3s ease;
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
    text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  `;
  nameBar.appendChild(nameEl);

  const termEl = document.createElement('div');
  termEl.textContent = "'" + member.year;
  termEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${termFontSize}px; letter-spacing: 0.1em;
    color: #fff; background: #000; padding: 3px 10px;
    transition: background 0.3s ease;
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

  // Avatar — stretches to full height of the body area
  const imgW = Math.floor(cardH * 0.48);
  const imgBox = document.createElement('div');
  imgBox.style.cssText = `
    width: ${imgW}px; align-self: stretch; flex-shrink: 0;
    background: transparent; border: none;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
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
    initials.style.cssText = `font-family: var(--font-arcade); font-size: 18px; color: #222; letter-spacing: 0.08em;`;
    imgBox.appendChild(initials);
  }
  body.appendChild(imgBox);

  // Info — dark backdrop for readability against TV static
  const info = document.createElement('div');
  info.style.cssText = `
    flex: 1; min-width: 0; display: flex; flex-direction: column;
    justify-content: center; gap: 2px; padding: 8px 10px;
    margin-left: 10px;
    background: rgba(0,0,0,0.7);
    border-left: 2px solid rgba(0,0,0,0.3);
    transition: background 0.3s ease;
  `;

  const roleFontSize = Math.max(9, Math.round(12 * fontScale));
  const locFontSize = Math.max(8, Math.round(11 * fontScale));

  const roleEl = document.createElement('div');
  roleEl.textContent = member.role;
  roleEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${roleFontSize}px; letter-spacing: 0.1em;
    color: #ddd; text-transform: uppercase;
    transition: color 0.3s ease;
  `;
  info.appendChild(roleEl);

  // Location + School
  const locEl = document.createElement('div');
  locEl.textContent = `${member.location}  //  ${member.school}`;
  locEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${locFontSize}px; letter-spacing: 0.06em;
    color: #bbb; transition: color 0.3s ease;
  `;
  info.appendChild(locEl);

  const blurbEl = document.createElement('div');
  blurbEl.textContent = `\u201C${member.blurb}\u201D`;
  blurbEl.style.cssText = `
    font-family: monospace; font-size: 11px; color: #ccc;
    font-style: italic; line-height: 1.5; overflow: hidden;
    margin-top: 4px;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    transition: color 0.3s ease;
  `;
  info.appendChild(blurbEl);

  // Socials — horizontal row, bottom-right of info area
  if (member.socials && member.socials.length > 0) {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex; gap: 4px; margin-top: auto; align-self: flex-end;
    `;
    for (const social of member.socials) {
      const btn = document.createElement('a');
      btn.href = social.url;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      btn.style.cssText = `
        color: #fff; display: flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; background: #000;
        text-decoration: none;
      `;
      btn.innerHTML = SOCIAL_ICONS[social.type] || '';
      btn.addEventListener('mouseenter', () => { btn.style.background = '#333'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#000'; });
      btn.addEventListener('click', (e) => e.stopPropagation());
      row.appendChild(btn);
    }
    info.appendChild(row);
  }

  body.appendChild(info);

  // ── CLICK → full-screen expand ──
  wrapper.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) return;
    onExpand(member);
  });

  // ── HOVER ──
  wrapper.addEventListener('mouseenter', () => {
    inner.style.transform = 'scale(1.04)';
    glow.style.opacity = '1';
    termEl.style.background = '#222';
    info.style.background = 'rgba(0,0,0,0.85)';
    roleEl.style.color = '#fff';
    locEl.style.color = '#ddd';
    blurbEl.style.color = '#eee';
  });

  wrapper.addEventListener('mouseleave', () => {
    inner.style.transform = 'scale(1)';
    glow.style.opacity = '0';
    termEl.style.background = '#000';
    info.style.background = 'rgba(0,0,0,0.7)';
    roleEl.style.color = '#ddd';
    locEl.style.color = '#bbb';
    blurbEl.style.color = '#ccc';
  });

  return wrapper;
}
