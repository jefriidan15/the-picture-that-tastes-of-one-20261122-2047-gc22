// The picture that tastes of one ingredient — steaming ramen, drawn procedurally.
// Node 22, zero dependencies. Deterministic: fixed seed, no Date/Math.random/env.
// Run: node main.ts  -> writes /output/entry.png (1024x1024, <= 1 MiB)
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3); // RGB

// ---------- seeded PRNG (mulberry32) ----------
let seed = 0x9e3779b9;
function rnd() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rr(a, b) { return a + (b - a) * rnd(); }

// ---------- pixel helpers ----------
function blend(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 3;
  const ia = 1 - a;
  buf[i] = buf[i] * ia + r * a;
  buf[i + 1] = buf[i + 1] * ia + g * a;
  buf[i + 2] = buf[i + 2] * ia + b * a;
}
function disc(cx, cy, rad, r, g, b, a) {
  const x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(W - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(H - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= rad * rad) blend(x, y, r, g, b, a);
  }
}
function softDisc(cx, cy, rad, r, g, b, a) {
  // radial falloff disc (soft edge)
  const x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(W - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(H - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot(x - cx, y - cy) / rad;
    if (d < 1) { const f = (1 - d * d) * a; blend(x, y, r, g, b, f); }
  }
}
function ellipse(cx, cy, rx, ry, r, g, b, a) {
  const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(W - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1) blend(x, y, r, g, b, a);
  }
}
function thickLine(x0, y0, x1, y1, w, r, g, b, a) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, r, g, b, a);
  }
}
function curve(pts, w, r, g, b, a) {
  for (let i = 0; i < pts.length - 1; i++)
    thickLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, r, g, b, a);
}
function wavy(x0, y0, x1, y1, amp, waves, w, r, g, b, a) {
  const pts = [];
  const n = 40;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = Math.sin(t * Math.PI * 2 * waves) * amp * (0.4 + 0.6 * Math.sin(t * Math.PI));
    pts.push([x0 + dx * t + nx * off, y0 + dy * t + ny * off]);
  }
  curve(pts, w, r, g, b, a);
}
function lerp(a, b, t) { return a + (b - a) * t; }

// ---------- 1. background: dark warm, glow behind bowl ----------
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const d = Math.hypot(x - 512, y - 560) / 720;
  const glow = Math.max(0, 1 - d);
  const r = lerp(14, 96, glow * glow) + y * 0.012;
  const g = lerp(10, 52, glow * glow) + y * 0.008;
  const b = lerp(12, 22, glow * glow);
  const i = (y * W + x) * 3;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
}
// table band
for (let y = 700; y < H; y++) for (let x = 0; x < W; x++) {
  const t = (y - 700) / 324;
  const i = (y * W + x) * 3;
  buf[i] = buf[i] * (1 - t * 0.55) + 74 * t * 0.55;
  buf[i + 1] = buf[i + 1] * (1 - t * 0.55) + 46 * t * 0.55;
  buf[i + 2] = buf[i + 2] * (1 - t * 0.55) + 26 * t * 0.55;
}
// wood streaks
for (let s = 0; s < 26; s++) {
  const y = rr(720, 1020), len = rr(200, 900), x0 = rr(0, 700);
  wavy(x0, y, x0 + len, y + rr(-6, 6), 2, 1, rr(1, 2.5), 58, 34, 18, 0.25);
}

// ---------- 2. bowl ----------
const BCX = 512, BCY = 600, BR = 372;
softDisc(BCX, BCY + 26, BR + 26, 0, 0, 0, 0.55);            // drop shadow
disc(BCX, BCY, BR, 26, 30, 44, 1);                          // bowl body
disc(BCX, BCY, BR - 14, 38, 44, 62, 1);                     // rim ring
disc(BCX, BCY, BR - 30, 20, 24, 36, 1);                     // inner wall
// rim highlight (top-left arc)
for (let a = Math.PI * 0.9; a < Math.PI * 1.75; a += 0.01) {
  const x = BCX + Math.cos(a) * (BR - 20), y = BCY + Math.sin(a) * (BR - 20);
  disc(x, y, 5, 150, 170, 205, 0.35);
}
// bowl foot highlight bottom
ellipse(BCX, BCY + BR - 26, 240, 26, 90, 100, 130, 0.25);

// ---------- 3. broth ----------
const BROTH_R = BR - 44;
for (let y = BCY - BROTH_R; y <= BCY + BROTH_R; y++) for (let x = BCX - BROTH_R; x <= BCX + BROTH_R; x++) {
  const dx = x - BCX, dy = y - BCY;
  if (dx * dx + dy * dy > BROTH_R * BROTH_R) continue;
  const d = Math.hypot(dx, dy) / BROTH_R;
  const i = (y * W + x) * 3;
  // rich amber, brighter toward upper-left light
  const lx = (dx / BROTH_R + 1) / 2, ly = (dy / BROTH_R + 1) / 2;
  const light = Math.max(0, 1 - Math.hypot(lx - 0.32, ly - 0.28) * 1.5);
  let r = lerp(104, 222, 1 - d * 0.62) + light * 52;
  let g = lerp(46, 132, 1 - d * 0.62) + light * 30;
  let b = lerp(12, 38, 1 - d * 0.62) + light * 8;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
}
// glossy sheen on broth
ellipse(430, 470, 200, 80, 255, 214, 140, 0.30);
ellipse(430, 470, 130, 48, 255, 232, 170, 0.32);
// broth swirl arcs
for (let s = 0; s < 9; s++) {
  const rad = rr(70, 300), a0 = rr(0, 6.28), a1 = a0 + rr(0.8, 2.2);
  for (let a = a0; a < a1; a += 0.02) {
    disc(BCX + Math.cos(a) * rad, BCY + Math.sin(a) * rad * 0.94, 3, 96, 44, 12, 0.28);
  }
}
// chili oil droplets (glossy red-orange)
for (let s = 0; s < 16; s++) {
  const a = rr(0, 6.28), rad = rr(40, 300);
  const x = BCX + Math.cos(a) * rad, y = BCY + Math.sin(a) * rad * 0.94;
  disc(x, y, rr(5, 13), 214, 52, 14, 0.85);
  disc(x - 2, y - 2, 2.5, 255, 150, 80, 0.8);
}

// ---------- 4. noodle swirls (fill broth) ----------
function noodleStrand(cx, cy, len, amp, waves, w, shade) {
  const a = rr(0, Math.PI * 2);
  const x1 = cx + Math.cos(a) * len, y1 = cy + Math.sin(a) * len * 0.9;
  wavy(cx, cy, x1, y1, amp, waves, w + 2, 120, 74, 22, 0.9);   // shadow
  wavy(cx, cy, x1, y1, amp, waves, w, 244 - shade, 196 - shade, 96, 0.95); // noodle
  wavy(cx, cy, x1, y1, amp, waves, w * 0.35, 255, 236, 180, 0.9); // highlight
}
for (let s = 0; s < 78; s++) {
  const a = rr(0, 6.28), rad = rr(20, 290);
  noodleStrand(BCX + Math.cos(a) * rad, BCY + Math.sin(a) * rad * 0.9, rr(70, 190), rr(3, 9), rr(1, 2), rr(8, 12), rr(0, 40));
}
// central noodle nest: concentric swirl (classic ramen top-down look)
for (let s = 0; s < 12; s++) {
  const rad = 26 + s * 15;
  const a0 = rr(0, 3), a1 = a0 + rr(2.5, 4.5);
  for (let a = a0; a < a1; a += 0.02) {
    const x = BCX + Math.cos(a) * rad, y = BCY + Math.sin(a) * rad * 0.92;
    disc(x, y, 4.2, 120, 74, 22, 0.7);
    disc(x, y, 3.8, 244, 198, 100, 0.95);
  }
}
// central noodle nest (taller, lifted toward chopsticks)
for (let s = 0; s < 14; s++) {
  const cx = BCX + rr(-90, 90), cy = BCY + rr(-60, 60);
  noodleStrand(cx, cy, rr(90, 190), rr(10, 24), rr(2, 4), rr(8, 12), rr(0, 30));
}

// ---------- 5. chashu pork slices ----------
function chashu(cx, cy, rx, ry, rot) {
  // draw as rotated ellipse via sampling
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    const x = cx + ex * Math.cos(rot) - ey * Math.sin(rot);
    const y = cy + ex * Math.sin(rot) + ey * Math.cos(rot);
    disc(x, y, 4, 226, 158, 138, 0.9);
  }
  ellipse(cx, cy, rx * 0.94, ry * 0.94, 232, 168, 148, 1);
  // seared shading: darker lower-right, lighter upper-left
  ellipse(cx + rx * 0.18, cy + ry * 0.2, rx * 0.62, ry * 0.58, 206, 128, 108, 0.55);
  ellipse(cx - rx * 0.22, cy - ry * 0.22, rx * 0.4, ry * 0.36, 246, 200, 182, 0.6);
  // fat marbling
  ellipse(cx - rx * 0.2, cy, rx * 0.55, ry * 0.5, 246, 214, 196, 0.9);
  ellipse(cx + rx * 0.3, cy + ry * 0.25, rx * 0.3, ry * 0.28, 240, 200, 180, 0.8);
  // seared edge
  for (let a = 0; a < Math.PI * 2; a += 0.03) {
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    const x = cx + ex * Math.cos(rot) - ey * Math.sin(rot);
    const y = cy + ex * Math.sin(rot) + ey * Math.cos(rot);
    disc(x, y, 3, 146, 74, 52, 0.55);
  }
  disc(cx - rx * 0.3, cy - ry * 0.3, 6, 255, 220, 190, 0.7);
}
chashu(700, 700, 118, 92, -0.4);
chashu(770, 620, 96, 76, 0.35);

// ---------- 6. halved soft egg (jammy yolk) ----------
function egg(cx, cy) {
  ellipse(cx, cy, 96, 78, 252, 246, 232, 1);          // white
  ellipse(cx, cy, 88, 70, 244, 234, 214, 1);
  softDisc(cx, cy, 62, 250, 128, 16, 1);              // yolk glow
  disc(cx, cy, 52, 246, 122, 12, 1);                  // yolk
  disc(cx, cy, 44, 255, 158, 30, 1);
  disc(cx - 12, cy - 14, 16, 255, 196, 90, 0.85);     // yolk gloss
  disc(cx - 16, cy - 18, 5, 255, 240, 200, 0.95);
  // white edge shading
  for (let a = 0; a < Math.PI * 2; a += 0.04) {
    disc(cx + Math.cos(a) * 92, cy + Math.sin(a) * 74, 3, 214, 200, 178, 0.5);
  }
}
egg(330, 690);
egg(330, 690); // second pass to keep yolk vivid over noodles

// ---------- 7. spring onions ----------
for (let s = 0; s < 34; s++) {
  const a = rr(0, 6.28), rad = rr(30, 300);
  const x = BCX + Math.cos(a) * rad, y = BCY + Math.sin(a) * rad * 0.92;
  const r = rr(6, 11);
  disc(x, y, r, 34, 122, 44, 0.95);
  disc(x, y, r * 0.55, 120, 200, 90, 0.95);
  disc(x, y, r * 0.22, 200, 240, 170, 0.9);
}
// a few nori strips
for (let s = 0; s < 3; s++) {
  const x = BCX + rr(-260, 200), y = BCY + rr(-220, 120);
  ellipse(x, y, rr(26, 40), rr(10, 14), 18, 40, 22, 0.95);
  ellipse(x, y, rr(22, 34), rr(7, 10), 34, 66, 38, 0.9);
}

// ---------- 8. chopsticks lifting noodles (top-right) ----------
function chopstick(x0, y0, x1, y1) {
  thickLine(x0, y0, x1, y1, 15, 96, 54, 26, 1);
  thickLine(x0, y0, x1, y1, 9, 132, 78, 38, 1);
  thickLine(x0, y0, x1, y1, 3, 190, 130, 76, 0.9);
}
chopstick(640, 180, 700, 470);
chopstick(700, 165, 742, 462);
// noodle bundle hanging from chopstick tips, draped over bowl rim
for (let s = 0; s < 12; s++) {
  const bx = 700 + s * 4.5 - 22;
  const len = 150 - (s % 4) * 12;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push([bx + Math.sin(t * 6 + s * 0.9) * 7, 460 + t * len]);
  }
  curve(pts, 9, 120, 74, 22, 0.9);
  curve(pts, 7, 244, 198, 100, 0.95);
  curve(pts, 2.5, 255, 238, 190, 0.9);
}
// noodle clump at tips
for (let s = 0; s < 8; s++) noodleStrand(712 + rr(-14, 14), 470 + rr(-6, 10), rr(40, 80), rr(6, 12), 2, 7, 10);

// ---------- 9. steam ----------
function steamWisp(x, baseY, topY, amp, alpha) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    pts.push([x + Math.sin(t * 7 + x * 0.01) * amp * (0.5 + t), baseY + (topY - baseY) * t]);
  }
  for (let pass = 0; pass < 3; pass++) {
    for (const [px, py] of pts) softDisc(px + rr(-4, 4), py, 16 - pass * 4, 255, 250, 240, alpha * (0.5 - pass * 0.12));
  }
}
steamWisp(420, 330, 90, 34, 0.16);
steamWisp(520, 300, 60, 42, 0.14);
steamWisp(620, 330, 100, 30, 0.15);
steamWisp(470, 320, 130, 26, 0.11);
steamWisp(580, 310, 80, 36, 0.12);

// ---------- 10. vignette ----------
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const d = Math.hypot(x - 512, y - 512) / 724;
  if (d > 0.62) {
    const f = Math.min(0.42, (d - 0.62) * 1.1);
    const i = (y * W + x) * 3;
    buf[i] *= 1 - f; buf[i + 1] *= 1 - f; buf[i + 2] *= 1 - f;
  }
}

// ---------- PNG encode (manual chunks, zlib deflate) ----------
function crc32(data) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGB
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0; // filter none
  Buffer.from(buf.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
mkdirSync("/output", { recursive: true });
writeFileSync("/output/entry.png", png);
console.log("wrote /output/entry.png", png.length, "bytes,", W + "x" + H);
