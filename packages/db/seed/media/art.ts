/**
 * Placeholder art in the Highland palette. Deterministic per key.
 * These are honest stand-ins: every image carries a small "Placeholder" label.
 */

export type Scene =
  | 'ridge'
  | 'falls'
  | 'coffee'
  | 'road'
  | 'room'
  | 'construction'
  | 'hall'
  | 'table'
  | 'night'
  | 'garden'
  | 'bath';

export type Mood = 'dawn' | 'mist' | 'day' | 'dusk' | 'night';

export interface ArtOptions {
  scene: Scene;
  mood?: Mood;
  label: string;
  width?: number;
  height?: number;
  seed: string;
  /** Construction scenes: 0–1 building progress. */
  progress?: number;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOODS: Record<Mood, { sky: [string, string, string]; sun: string; far: string; near: string; mist: number }> = {
  dawn: { sky: ['#F3D9B1', '#E9B98A', '#B9C4C0'], sun: '#FBE3B0', far: '#A9B6AC', near: '#1E2B24', mist: 0.55 },
  mist: { sky: ['#E7EAE4', '#D5DBD3', '#C3CCC4'], sun: '#F4F5F1', far: '#B7C1B8', near: '#2A3A30', mist: 0.75 },
  day: { sky: ['#CFE0E6', '#E4ECEA', '#F1EFE6'], sun: '#FFF6DE', far: '#8FA7A0', near: '#233A2D', mist: 0.35 },
  dusk: { sky: ['#3B3346', '#A0605A', '#E0A54B'], sun: '#F6C27A', far: '#6F5D66', near: '#141715', mist: 0.3 },
  night: { sky: ['#0B0F14', '#141C24', '#1F2A2E'], sun: '#E9E4D4', far: '#27323A', near: '#07090A', mist: 0.15 },
};

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

function ridgePath(r: () => number, w: number, h: number, baseY: number, amp: number, roughness = 1): string {
  const waves = Array.from({ length: 4 }, (_, i) => ({
    f: ((0.6 + r() * 1.6) * (i + 1) * Math.PI * 2) / w,
    p: r() * Math.PI * 2,
    a: amp / (i + 1) ** (1.2 / roughness),
  }));
  const step = w / 90;
  let d = `M0 ${h} L0 ${baseY}`;
  for (let x = 0; x <= w + step; x += step) {
    let y = baseY;
    for (const wv of waves) y -= Math.sin(x * wv.f + wv.p) * wv.a;
    y += (r() - 0.5) * amp * 0.04 * roughness;
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L${w} ${h} Z`;
}

function defs(w: number, mood: Mood): string {
  const m = MOODS[mood];
  return `<defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${m.sky[0]}"/><stop offset=".55" stop-color="${m.sky[1]}"/><stop offset="1" stop-color="${m.sky[2]}"/>
      </linearGradient>
      <radialGradient id="sun" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="${m.sun}" stop-opacity="1"/><stop offset=".35" stop-color="${m.sun}" stop-opacity=".5"/><stop offset="1" stop-color="${m.sun}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="mistg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F4F5F1" stop-opacity="0"/><stop offset=".5" stop-color="#F4F5F1" stop-opacity="${m.mist}"/><stop offset="1" stop-color="#F4F5F1" stop-opacity="0"/>
      </linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="${w / 180}"/></filter>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .08 0"/></filter>
    </defs>`;
}

function landscape(r: () => number, w: number, h: number, mood: Mood, horizon = 0.55, layers = 5): string {
  const m = MOODS[mood];
  let out = `
    <rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  const sx = w * (0.2 + r() * 0.6);
  const sy = h * (horizon - 0.18 - r() * 0.12);
  const sr = w * (mood === 'night' ? 0.03 : 0.22);
  if (mood === 'night') {
    for (let i = 0; i < 160; i++) {
      out += `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h * horizon).toFixed(0)}" r="${(r() * 1.6 + 0.3).toFixed(2)}" fill="#fff" opacity="${(r() * 0.7 + 0.2).toFixed(2)}"/>`;
    }
    out += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="${m.sun}"/>`;
  } else {
    out += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="url(#sun)"/>`;
  }
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const baseY = h * (horizon - 0.12 + t * 0.34);
    const amp = h * (0.12 - t * 0.05);
    out += `<path d="${ridgePath(r, w, h, baseY, amp, 1 + t)}" fill="${mix(m.far, m.near, t ** 0.9)}"/>`;
    if (i < layers - 1) {
      const my = baseY + h * 0.02;
      out += `<rect x="${-w * 0.1}" y="${my - h * 0.07}" width="${w * 1.2}" height="${h * 0.14}" fill="url(#mistg)"/>`;
    }
  }
  return out;
}

function contours(r: () => number, w: number, h: number, color: string, opacity = 0.12): string {
  let out = `<g fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${w / 900}">`;
  const cx = w * (0.3 + r() * 0.4);
  const cy = h * (0.3 + r() * 0.4);
  for (let i = 1; i < 14; i++) {
    const rx = (w / 26) * i * (1 + r() * 0.08);
    const ry = rx * (0.55 + r() * 0.1);
    let d = '';
    for (let a = 0; a <= 64; a++) {
      const th = (a / 64) * Math.PI * 2;
      const wob = 1 + Math.sin(th * 3 + i) * 0.06 + Math.sin(th * 5 + i * 2) * 0.03;
      const x = cx + Math.cos(th) * rx * wob;
      const y = cy + Math.sin(th) * ry * wob;
      d += `${a ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    out += `<path d="${d}Z"/>`;
  }
  return `${out}</g>`;
}

function label(w: number, h: number, text: string, dark: boolean): string {
  const fs = Math.round(w / 64);
  const pad = fs * 0.8;
  const tw = text.length * fs * 0.74 + pad * 2;
  const x = w * 0.03;
  const y = h - w * 0.03 - fs * 2;
  return `<g font-family="DejaVu Sans, Arial, sans-serif" font-size="${fs}" letter-spacing="1">
    <rect x="${x}" y="${y}" rx="${fs}" width="${tw}" height="${fs * 2}" fill="${dark ? '#121513' : '#F4F5F1'}" fill-opacity=".72"/>
    <text x="${x + pad}" y="${y + fs * 1.35}" fill="${dark ? '#F4F5F1' : '#121513'}">${text.replace(/&/g, '&amp;')}</text>
  </g>`;
}

function falls(r: () => number, w: number, h: number): string {
  const x = w * (0.45 + r() * 0.15);
  const top = h * 0.3;
  const cliff = `<path d="M${x - w * 0.28} ${h} L${x - w * 0.2} ${top} Q${x} ${top - h * 0.04} ${x + w * 0.2} ${top} L${x + w * 0.3} ${h} Z" fill="#2B3A31"/>`;
  let water = '';
  for (let i = 0; i < 18; i++) {
    const dx = (r() - 0.5) * w * 0.05;
    water += `<rect x="${x + dx - w * 0.006}" y="${top}" width="${w * (0.004 + r() * 0.01)}" height="${h - top}" fill="#F4F5F1" opacity="${(0.35 + r() * 0.5).toFixed(2)}"/>`;
  }
  const spray = `<ellipse cx="${x}" cy="${h * 0.92}" rx="${w * 0.2}" ry="${h * 0.1}" fill="#F4F5F1" opacity=".55" filter="url(#soft)"/>`;
  const greens = Array.from({ length: 40 }, () => `<circle cx="${(r() * w).toFixed(0)}" cy="${(h * (0.75 + r() * 0.3)).toFixed(0)}" r="${(w * (0.02 + r() * 0.04)).toFixed(0)}" fill="${mix('#2F4A3A', '#121513', r())}"/>`).join('');
  return cliff + water + spray + greens;
}

function coffee(r: () => number, w: number, h: number): string {
  let out = '';
  for (let row = 0; row < 9; row++) {
    const y = h * (0.62 + row * 0.05);
    const shade = mix('#4F6F58', '#1E2B24', row / 9);
    out += `<path d="${ridgePath(r, w, h, y, h * 0.015, 0.5)}" fill="${shade}"/>`;
    const n = 8 + row * 3;
    for (let i = 0; i < n; i++) {
      const cx = (i + r() * 0.6) * (w / n);
      const cy = y - h * 0.01;
      const sz = w * (0.004 + row * 0.0022);
      out += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(sz * 2.4).toFixed(1)}" ry="${(sz * 1.6).toFixed(1)}" fill="${mix('#2F4A3A', '#121513', r() * 0.5)}"/>`;
      if (row > 4 && r() > 0.45) {
        for (let c = 0; c < 3; c++)
          out += `<circle cx="${(cx + (r() - 0.5) * sz * 3).toFixed(1)}" cy="${(cy + (r() - 0.2) * sz).toFixed(1)}" r="${(sz * 0.35).toFixed(1)}" fill="${r() > 0.3 ? '#9E2A2B' : '#E0A54B'}"/>`;
      }
    }
  }
  return out;
}

function road(r: () => number, w: number, h: number): string {
  const pts: [number, number][] = Array.from({ length: 6 }, (_, i): [number, number] => [w * (0.5 + (r() - 0.5) * 0.6 * (1 - i / 6)), h * (1 - i * 0.09)]);
  let d = `M${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i]!;
    const [px, py] = pts[i - 1]!;
    d += ` Q${px + (x - px) * 1.4} ${(py + y) / 2} ${x} ${y}`;
  }
  return `<path d="${d}" fill="none" stroke="#CFCBC0" stroke-width="${w * 0.05}" stroke-linecap="round" opacity=".9"/>
    <path d="${d}" fill="none" stroke="#F4F5F1" stroke-width="${w * 0.003}" stroke-dasharray="${w * 0.02} ${w * 0.02}" opacity=".8"/>`;
}

function construction(r: () => number, w: number, h: number, progress: number): string {
  const x0 = w * 0.18;
  const x1 = w * 0.82;
  const ground = h * 0.86;
  const floors = 3;
  const fh = h * 0.16;
  const built = Math.max(0.05, progress) * floors;
  let out = `<rect x="0" y="${ground}" width="${w}" height="${h - ground}" fill="#5A3A2A"/>`;
  out += `<rect x="0" y="${ground}" width="${w}" height="${h * 0.01}" fill="#3E281D"/>`;
  for (let f = 0; f < Math.ceil(built); f++) {
    const y = ground - (f + 1) * fh;
    const partial = Math.min(1, built - f);
    const fx1 = x0 + (x1 - x0) * partial;
    out += `<rect x="${x0}" y="${y + fh - h * 0.018}" width="${fx1 - x0}" height="${h * 0.018}" fill="#B9B4A8"/>`;
    const cols = 9;
    for (let c = 0; c <= cols; c++) {
      const cx = x0 + ((x1 - x0) * c) / cols;
      if (cx > fx1) break;
      out += `<rect x="${cx - w * 0.005}" y="${y}" width="${w * 0.01}" height="${fh}" fill="#A8A397"/>`;
      if (progress > 0.55 && f < floors - 1 && c < cols) {
        out += `<rect x="${cx + w * 0.012}" y="${y + fh * 0.2}" width="${(x1 - x0) / cols - w * 0.024}" height="${fh * 0.55}" fill="${progress > 0.8 ? '#E9D8BE' : '#8E7F6F'}" opacity=".9"/>`;
      }
    }
    // scaffolding
    if (progress < 0.9) {
      for (let s = 0; s < 14; s++) {
        const sx = x0 - w * 0.02 + ((x1 - x0 + w * 0.04) * s) / 13;
        out += `<line x1="${sx}" y1="${y}" x2="${sx}" y2="${y + fh}" stroke="#6F6A60" stroke-width="${w * 0.0015}"/>`;
      }
      out += `<line x1="${x0 - w * 0.02}" y1="${y + fh / 2}" x2="${x1 + w * 0.02}" y2="${y + fh / 2}" stroke="#6F6A60" stroke-width="${w * 0.0015}"/>`;
    }
  }
  if (progress >= 0.7) {
    const top = ground - floors * fh;
    out += `<path d="M${x0 - w * 0.03} ${top} L${(x0 + x1) / 2} ${top - h * 0.1} L${x1 + w * 0.03} ${top} Z" fill="#5A3A2A"/>`;
  }
  if (progress < 0.85) {
    const cx = x1 + w * 0.08;
    out += `<rect x="${cx}" y="${h * 0.12}" width="${w * 0.012}" height="${ground - h * 0.12}" fill="#E0A54B"/>
      <rect x="${cx - w * 0.25}" y="${h * 0.12}" width="${w * 0.33}" height="${h * 0.012}" fill="#E0A54B"/>
      <line x1="${cx - w * 0.18}" y1="${h * 0.13}" x2="${cx - w * 0.18}" y2="${h * 0.4}" stroke="#121513" stroke-width="${w * 0.001}"/>`;
  }
  return out;
}

function interior(r: () => number, w: number, h: number, kind: 'room' | 'hall' | 'bath', mood: Mood): string {
  const wall = kind === 'bath' ? '#E7E2D6' : '#EDE4D3';
  let out = `<rect width="${w}" height="${h}" fill="${wall}"/>`;
  const wx = w * 0.14;
  const wy = h * 0.1;
  const ww = w * (kind === 'hall' ? 0.72 : 0.56);
  const wh = h * 0.5;
  out += `<svg x="${wx}" y="${wy}" width="${ww}" height="${wh}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${landscape(r, w, h, mood, 0.6, 4)}</svg>`;
  out += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="none" stroke="#5A3A2A" stroke-width="${w * 0.012}"/>`;
  out += `<line x1="${wx + ww / 2}" y1="${wy}" x2="${wx + ww / 2}" y2="${wy + wh}" stroke="#5A3A2A" stroke-width="${w * 0.006}"/>`;
  out += `<rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#8A6B52"/>`;
  out += `<rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.012}" fill="#6B503C"/>`;
  if (kind === 'room') {
    const bx = w * 0.2;
    const by = h * 0.6;
    out += `<rect x="${bx}" y="${by - h * 0.12}" width="${w * 0.6}" height="${h * 0.14}" rx="${w * 0.01}" fill="#3E281D"/>`;
    out += `<rect x="${bx - w * 0.02}" y="${by}" width="${w * 0.64}" height="${h * 0.16}" rx="${w * 0.012}" fill="#F6F1E7"/>`;
    out += `<rect x="${bx - w * 0.02}" y="${by + h * 0.07}" width="${w * 0.64}" height="${h * 0.09}" rx="${w * 0.01}" fill="#9E2A2B" opacity=".85"/>`;
    out += `<rect x="${bx + w * 0.05}" y="${by - h * 0.04}" width="${w * 0.2}" height="${h * 0.07}" rx="${w * 0.02}" fill="#FFFFFF"/>`;
    out += `<rect x="${bx + w * 0.35}" y="${by - h * 0.04}" width="${w * 0.2}" height="${h * 0.07}" rx="${w * 0.02}" fill="#FFFFFF"/>`;
    out += `<circle cx="${w * 0.88}" cy="${h * 0.42}" r="${w * 0.07}" fill="#E0A54B" opacity=".25" filter="url(#soft)"/>`;
    out += `<rect x="${w * 0.86}" y="${h * 0.42}" width="${w * 0.04}" height="${h * 0.3}" fill="#3E281D"/>`;
  } else if (kind === 'hall') {
    for (let row = 0; row < 4; row++)
      for (let c = 0; c < 10; c++) {
        const cx = w * (0.1 + c * 0.085) + row * w * 0.01;
        const cy = h * (0.66 + row * 0.07);
        const s = w * (0.022 + row * 0.004);
        out += `<rect x="${cx}" y="${cy - s}" width="${s}" height="${s * 1.1}" rx="${s * 0.15}" fill="#2F4A3A"/><rect x="${cx}" y="${cy}" width="${s}" height="${s * 0.3}" fill="#1E2B24"/>`;
      }
  } else {
    out += `<ellipse cx="${w * 0.5}" cy="${h * 0.78}" rx="${w * 0.28}" ry="${h * 0.09}" fill="#F6F1E7" stroke="#CFCBC0" stroke-width="${w * 0.004}"/>`;
    out += `<rect x="${w * 0.72}" y="${h * 0.2}" width="${w * 0.006}" height="${h * 0.5}" fill="#8A867B"/>`;
    out += `<circle cx="${w * 0.723}" cy="${h * 0.2}" r="${w * 0.025}" fill="#8A867B"/>`;
  }
  return out;
}

function table(r: () => number, w: number, h: number): string {
  let out = `<rect width="${w}" height="${h}" fill="#3E281D"/>`;
  for (let i = 0; i < 30; i++)
    out += `<rect x="0" y="${(i * h) / 30}" width="${w}" height="${h / 60}" fill="#5A3A2A" opacity="${(r() * 0.4).toFixed(2)}"/>`;
  const items = [
    [0.3, 0.45, 0.16, '#F6F1E7'],
    [0.62, 0.55, 0.19, '#F6F1E7'],
    [0.48, 0.25, 0.07, '#EDE4D3'],
    [0.8, 0.28, 0.06, '#EDE4D3'],
  ] as const;
  for (const [x, y, rr, c] of items) {
    out += `<circle cx="${w * x}" cy="${h * y}" r="${w * rr}" fill="${c}"/><circle cx="${w * x}" cy="${h * y}" r="${w * rr * 0.72}" fill="none" stroke="#CFCBC0" stroke-width="${w * 0.002}"/>`;
  }
  out += `<circle cx="${w * 0.48}" cy="${h * 0.25}" r="${w * 0.045}" fill="#2B1A12"/><circle cx="${w * 0.8}" cy="${h * 0.28}" r="${w * 0.038}" fill="#2B1A12"/>`;
  for (let i = 0; i < 14; i++)
    out += `<circle cx="${w * (0.25 + r() * 0.12)}" cy="${h * (0.4 + r() * 0.1)}" r="${w * 0.012}" fill="${r() > 0.5 ? '#9E2A2B' : '#4F6F58'}"/>`;
  for (let i = 0; i < 10; i++)
    out += `<ellipse cx="${w * (0.57 + r() * 0.1)}" cy="${h * (0.5 + r() * 0.1)}" rx="${w * 0.02}" ry="${w * 0.012}" fill="${r() > 0.5 ? '#E0A54B' : '#8FA06A'}"/>`;
  return out;
}

function garden(r: () => number, w: number, h: number): string {
  let out = `<rect x="0" y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="#4F6F58"/>`;
  for (let i = 0; i < 70; i++) {
    const x = r() * w;
    const y = h * (0.68 + r() * 0.3);
    const s = w * (0.01 + r() * 0.03) * (y / h);
    out += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="${mix('#2F4A3A', '#8FA06A', r())}"/>`;
    if (r() > 0.7) out += `<circle cx="${(x + s * 0.3).toFixed(0)}" cy="${(y - s * 0.4).toFixed(0)}" r="${(s * 0.25).toFixed(1)}" fill="${r() > 0.5 ? '#E0A54B' : '#9E2A2B'}"/>`;
  }
  out += `<rect x="${w * 0.15}" y="${h * 0.82}" width="${w * 0.7}" height="${h * 0.02}" fill="#CFCBC0"/>`;
  return out;
}

export function renderArt(o: ArtOptions): string {
  const w = o.width ?? 1920;
  const h = o.height ?? 1280;
  const r = rng(o.seed);
  const mood = o.mood ?? (['dawn', 'mist', 'day', 'dusk'] as const)[Math.floor(r() * 4)]!;
  let body: string;
  let dark = false;
  switch (o.scene) {
    case 'ridge':
      body = landscape(r, w, h, mood) + contours(r, w, h, '#F4F5F1', 0.08);
      break;
    case 'night':
      body = landscape(r, w, h, 'night');
      dark = true;
      break;
    case 'falls':
      body = landscape(r, w, h, mood, 0.4, 3) + falls(r, w, h);
      break;
    case 'coffee':
      body = landscape(r, w, h, mood, 0.45, 3) + coffee(r, w, h);
      break;
    case 'road':
      body = landscape(r, w, h, mood, 0.5, 4) + road(r, w, h);
      break;
    case 'construction':
      body = landscape(r, w, h, mood, 0.5, 3) + construction(r, w, h, o.progress ?? 0.5);
      break;
    case 'garden':
      body = landscape(r, w, h, mood, 0.5, 3) + garden(r, w, h);
      break;
    case 'room':
    case 'hall':
    case 'bath':
      body = landscape(r, w, h, mood, 0.5, 2) + interior(r, w, h, o.scene, mood);
      break;
    case 'table':
      body = table(r, w, h);
      dark = true;
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${defs(w, o.scene === 'night' ? 'night' : mood)}
    ${body}
    ${label(w, h, `PLACEHOLDER · ${o.label.toUpperCase()}`, dark)}
  </svg>`;
}
