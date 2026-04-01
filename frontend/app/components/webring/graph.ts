import type { WebringEntry, Node, Edge, BoundingSphere } from './types';

export function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function buildGraph(entries: WebringEntry[], originalIndices?: number[]) {
  const n = entries.length;
  const span = 400 + n * 4;
  const cols = Math.max(1, Math.ceil(Math.cbrt(n * 1.5)));
  const rows = Math.max(1, Math.ceil(Math.cbrt(n * 1.5)));
  const layers = Math.max(1, Math.ceil(n / (cols * rows)));
  const cellSize = span / Math.max(cols, rows, layers);

  const nodes: Node[] = entries.map((entry, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols) % rows;
    const layer = Math.floor(i / (cols * rows));
    const jx = (seededRandom(i * 2) - 0.5) * cellSize * 0.6;
    const jy = (seededRandom(i * 2 + 1) - 0.5) * cellSize * 0.6;
    const jz = (seededRandom(i * 2 + 100) - 0.5) * cellSize * 0.6;
    const x = (col - cols / 2 + 0.5) * cellSize + jx;
    const y = (row - rows / 2 + 0.5) * cellSize + jy;
    const z = (layer - layers / 2 + 0.5) * cellSize + jz;
    let avatarImg: HTMLImageElement | null = null;
    if (entry.avatar) { avatarImg = new Image(); avatarImg.src = entry.avatar; }
    const idx = originalIndices ? originalIndices[i] : i;
    return { x, y, z, targetX: x, targetY: y, targetZ: z, transitionT: 1, nodeOpacity: 1, removing: false, entry, index: idx, sx: 0, sy: 0, scale: 1, depth: 0, screenR: 0, hoverAnim: 0, flashAnim: 0, flashGreen: true, simValue: 100 + Math.floor(seededRandom(i * 13) * 900), avatarImg, lod: 1 as const };
  });

  // Edges: ring + proximity
  const edges: Edge[] = [];
  const hasEdge = (a: number, b: number) => edges.some(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  for (let i = 0; i < n; i++) edges.push({ from: i, to: (i + 1) % n, hoverAnim: 0, packetGreen: Math.random() > 0.4 });

  if (n <= 20) {
    for (let i = 0; i < n; i++) {
      const jump = 2 + Math.floor(seededRandom(i * 7 + 3) * 3);
      const target = (i + jump) % n;
      if (!hasEdge(i, target)) edges.push({ from: i, to: target, hoverAnim: 0, packetGreen: Math.random() > 0.4 });
    }
  } else {
    const maxExtra = Math.floor(n * 1.5);
    let added = 0;
    for (let i = 0; i < n && added < maxExtra; i++) {
      let bestDist = Infinity, bestJ = -1;
      for (let j = 0; j < n; j++) {
        if (j === i || hasEdge(i, j)) continue;
        const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, dz = nodes[j].z - nodes[i].z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestDist) { bestDist = d; bestJ = j; }
      }
      if (bestJ >= 0) { edges.push({ from: i, to: bestJ, hoverAnim: 0, packetGreen: Math.random() > 0.4 }); added++; }
    }
  }

  return { nodes, edges };
}

export function computeLayout(nodes: Node[], edges: Edge[]) {
  const n = nodes.length;
  const span = 400 + n * 4;
  const avgSpacing = Math.cbrt(span * span * span / Math.max(1, n));
  const springLen = Math.max(60, 1.0 * avgSpacing);
  const repulsion = 30000 * (springLen / 320) * (springLen / 320);
  const spring = 0.002 * (320 / Math.max(30, springLen));
  const damping = 0.85;
  const maxVel = 10;
  const cutoff = springLen * 4;

  // Temp velocity arrays
  const vx = new Float64Array(n), vy = new Float64Array(n), vz = new Float64Array(n);

  for (let iter = 0; iter < 400; iter++) {
    // Repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, dz = nodes[j].z - nodes[i].z;
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > cutoff) continue;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq) || 1;
        const f = repulsion / distSq;
        const fx = (dx / dist) * f, fy = (dy / dist) * f, fz = (dz / dist) * f;
        vx[i] -= fx; vy[i] -= fy; vz[i] -= fz;
        vx[j] += fx; vy[j] += fy; vz[j] += fz;
      }
    }
    // Springs
    for (const edge of edges) {
      const a = edge.from, b = edge.to;
      const dx = nodes[b].x - nodes[a].x, dy = nodes[b].y - nodes[a].y, dz = nodes[b].z - nodes[a].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const f = (dist - springLen) * spring;
      const fx = (dx / dist) * f, fy = (dy / dist) * f, fz = (dz / dist) * f;
      vx[a] += fx; vy[a] += fy; vz[a] += fz;
      vx[b] -= fx; vy[b] -= fy; vz[b] -= fz;
    }
    // Mild centering (just to prevent drift, not to constrain)
    for (let i = 0; i < n; i++) {
      vx[i] += (0 - nodes[i].x) * 0.0001;
      vy[i] += (0 - nodes[i].y) * 0.0001;
      vz[i] += (0 - nodes[i].z) * 0.0001;
    }
    // Integration
    let totalKE = 0;
    for (let i = 0; i < n; i++) {
      vx[i] *= damping; vy[i] *= damping; vz[i] *= damping;
      const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]);
      if (speed > maxVel) { const s = maxVel / speed; vx[i] *= s; vy[i] *= s; vz[i] *= s; }
      nodes[i].x += vx[i]; nodes[i].y += vy[i]; nodes[i].z += vz[i];
      totalKE += vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i];
    }
    if (totalKE < 0.01 * n) break;
  }
}

export function computeBoundingSphere(nodes: Node[]): BoundingSphere {
  let sx = 0, sy = 0, sz = 0;
  for (const n of nodes) { sx += n.x; sy += n.y; sz += n.z; }
  const cx = sx / nodes.length, cy = sy / nodes.length, cz = sz / nodes.length;
  let maxR = 0;
  for (const n of nodes) {
    const d = Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2 + (n.z - cz) ** 2);
    if (d > maxR) maxR = d;
  }
  return { cx, cy, cz, radius: Math.max(maxR, 50) };
}
