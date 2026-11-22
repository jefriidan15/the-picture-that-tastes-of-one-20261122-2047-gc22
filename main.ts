// The picture that tastes of one ingredient — steaming ramen, top-down.
// Zero dependencies, Node 22 built-ins only. Deterministic: fixed seed,
// no Date/Math.random/env. Writes /output/entry.png (1024x1024 PNG).
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---- seeded PRNG (mulberry32) ----
let s = 0x9e3779b9;
function rnd(): number {
  s |= 0; s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---- pixel buffer ----
const px = new Uint8Array(W * H * 4);
function set(x: number, y: number, r: number, g: number, b: number, a = 255): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}
function blend(x: number, y: number, r: number, g: number, b: number, a: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 4;
  const ia = a / 255, oa = 1 - ia;
  px[i] = Math.round(r * ia + px[i] * oa);
  px[i + 1] = Math.round(g * ia + px[i + 1] * oa);
  px[i + 2] = Math.round(b * ia + px[i + 2] * oa);
}
function disc(cx: number, cy: number, rad: number, r: number, g: number, b: number, a = 255): void {
  const r2 = rad * rad;
  for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++)
    for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) a === 255 ? set(x, y, r, g, b) : blend(x, y, r, g, b, a);
    }
}
function ellipse(cx: number, cy: number, rx: number, ry: number, r: number, g: number, b: number, a = 255): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) a === 255 ? set(x, y, r, g, b) : blend(x, y, r, g, b, a);
    }
}
function ring(cx: number, cy: number, rad: number, th: number, r: number, g: number, b: number, a = 255): void {
  for (let ang = 0; ang < Math.PI * 2; ang += 0.0012) {
    const x = Math.round(cx + Math.cos(ang) * rad);
    const y = Math.round(cy + Math.sin(ang) * rad);
    disc(x, y, th, r, g, b, a);
  }
}
function line(x0: number, y0: number, x1: number, y1: number, th: number, r: number, g: number, b: number, a = 255): void {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.ceil(d * 2);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, th, r, g, b, a);
  }
}
// soft radial glow / shadow
function glow(cx: number, cy: number, rad: number, r: number, g: number, b: number, peak: number): void {
  for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++)
    for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
      const d = Math.hypot(x - cx, y - cy) / rad;
      if (d < 1) blend(x, y, r, g, b, Math.round(peak * (1 - d) * (1 - d)));
    }
}

// ---- scene ----
// 1. dark warm table background with vignette + wood-grain streaks
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - 512, y - 512) / 724;
    const v = 1 - 0.55 * d * d;
    const grain = Math.sin((x * 0.7 + y * 1.9) * 0.02) * 6 + Math.sin(y * 0.11) * 4;
    set(x, y, Math.round((46 + grain) * v), Math.round((28 + grain * 0.7) * v), Math.round((20 + grain * 0.5) * v));
  }
// scattered sesame / crumbs on table
for (let i = 0; i < 90; i++) {
  const x = rnd() * W, y = rnd() * H;
  if (Math.hypot(x - 512, y - 540) > 430) disc(x, y, 1.5 + rnd() * 2, 190, 150, 100, 160);
}

// 2. bowl shadow + bowl
glow(512, 560, 470, 0, 0, 0, 110);
disc(512, 540, 418, 24, 18, 16);                    // outer rim shadow
disc(512, 540, 405, 122, 30, 26);                   // bowl body (deep red-brown)
disc(512, 540, 405, 122, 30, 26);
// bowl rim highlight ring
ring(512, 540, 398, 5, 178, 52, 44);
ring(512, 540, 386, 3, 220, 90, 70, 200);
// subtle bowl pattern: faint arcs
for (let k = 0; k < 5; k++) ring(512, 540, 330 + k * 14, 2, 150, 44, 38, 60);

// 3. broth surface
disc(512, 540, 372, 196, 118, 34);                  // amber broth
// broth depth: darker toward edge, lighter center-left sheen
glow(512, 540, 372, 120, 62, 14, 90);
glow(430, 460, 260, 255, 190, 90, 70);              // warm sheen
glow(600, 620, 200, 255, 170, 80, 40);
// broth speckles (fat / spice)
for (let i = 0; i < 520; i++) {
  const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 360;
  const x = 512 + Math.cos(a) * rr, y = 540 + Math.sin(a) * rr;
  const c = rnd();
  if (c < 0.5) disc(x, y, 1 + rnd() * 2.2, 255, 205, 120, 120);
  else disc(x, y, 1 + rnd() * 1.8, 120, 60, 16, 110);
}

// 4. central noodle swirl — concentric wavy rings, pale gold
for (let k = 0; k < 11; k++) {
  const rad = 52 + k * 15;
  const shade = 235 - k * 6;
  for (let ang = 0; ang < Math.PI * 2; ang += 0.0015) {
    const wob = Math.sin(ang * 5 + k * 1.7) * 5 + Math.sin(ang * 11 + k) * 2.5;
    const x = 512 + Math.cos(ang) * (rad + wob);
    const y = 540 + Math.sin(ang) * (rad + wob) * 0.96;
    disc(x, y, 6.5, shade, 196 - k * 3, 110 - k * 2, 235);
  }
}
// noodle highlight strands
for (let k = 0; k < 26; k++) {
  const a = rnd() * Math.PI * 2, rr = 60 + rnd() * 150;
  const x = 512 + Math.cos(a) * rr, y = 540 + Math.sin(a) * rr * 0.96;
  line(x, y, x + (rnd() - 0.5) * 46, y + (rnd() - 0.5) * 30, 2.5, 255, 226, 160, 200);
}

// 5. chashu slices (two, left-bottom) — pink pork with fat ring
function chashu(cx: number, cy: number, rx: number, ry: number, rot: number): void {
  ellipse(cx, cy, rx, ry, 168, 92, 74);
  ellipse(cx, cy, rx * 0.78, ry * 0.78, 214, 148, 128);
  ellipse(cx, cy, rx * 0.45, ry * 0.45, 176, 96, 78);
  // seared edge dots
  for (let i = 0; i < 26; i++) {
    const a = rot + (rnd() - 0.5) * 2.2;
    disc(cx + Math.cos(a) * rx * 0.92, cy + Math.sin(a) * ry * 0.92, 2 + rnd() * 3, 120, 58, 44, 200);
  }
}
chashu(360, 660, 105, 88, 0.6);
chashu(330, 600, 84, 70, 2.4);

// 6. halved soft egg (right side) — white + jammy yolk
ellipse(688, 470, 92, 72, 250, 244, 228);
ellipse(688, 470, 88, 68, 246, 238, 220);
disc(688, 470, 46, 232, 128, 26);                   // jammy yolk
disc(688, 470, 40, 244, 152, 46);
disc(676, 458, 16, 255, 190, 90, 220);              // yolk glisten
disc(700, 484, 9, 255, 205, 110, 200);
ring(688, 470, 46, 3, 200, 96, 20, 160);

// 7. nori sheet (top-right, dark green-black rectangle, wavy)
for (let y = 300; y < 420; y++)
  for (let x = 640; x < 780; x++) {
    const wob = Math.sin(y * 0.09) * 6 + Math.sin(x * 0.05) * 4;
    if (x + wob > 640 && x + wob < 780 && y > 300 && y < 420) {
      const g = 26 + Math.round(Math.sin(x * 0.3 + y * 0.2) * 8);
      set(x, y, 14, g + 12, 16);
    }
  }
disc(712, 358, 8, 40, 58, 34, 120);

// 8. spring onions — green rings scattered on broth
for (let i = 0; i < 46; i++) {
  const a = rnd() * Math.PI * 2, rr = 190 + rnd() * 160;
  const x = 512 + Math.cos(a) * rr, y = 540 + Math.sin(a) * rr;
  if (Math.hypot(x - 688, y - 470) < 100) continue;
  if (Math.hypot(x - 360, y - 630) < 110) continue;
  const r = 5 + rnd() * 5;
  ring(x, y, r, 2.5, 46, 148, 62, 235);
  disc(x, y, r * 0.45, 120, 200, 90, 200);
}

// 9. chili-oil droplets — glossy red-orange
for (let i = 0; i < 34; i++) {
  const a = rnd() * Math.PI * 2, rr = 120 + rnd() * 220;
  const x = 512 + Math.cos(a) * rr, y = 540 + Math.sin(a) * rr;
  const r = 4 + rnd() * 9;
  disc(x, y, r, 198, 44, 14, 225);
  disc(x - r * 0.3, y - r * 0.3, r * 0.35, 255, 120, 60, 220);
}

// 10. chopsticks lifting noodles (top-right diagonal)
line(560, 300, 940, 130, 11, 146, 96, 52);
line(588, 322, 962, 168, 11, 132, 86, 46);
line(560, 300, 940, 130, 4, 196, 146, 92, 180);
line(588, 322, 962, 168, 4, 182, 132, 82, 180);
// noodle strands hanging from chopsticks down to the swirl
for (let k = 0; k < 7; k++) {
  const x0 = 600 + k * 16;
  const sag = 26 + rnd() * 30;
  for (let t = 0; t <= 1; t += 0.02) {
    const x = x0 + Math.sin(t * 9 + k) * 7;
    const y = 305 + t * (235 + sag) + Math.sin(t * Math.PI) * 18;
    disc(x, y, 5, 238, 200, 116, 240);
  }
}

// 11. steam wisps above the bowl — soft white curls
for (let w = 0; w < 5; w++) {
  const bx = 400 + w * 58;
  for (let t = 0; t <= 1; t += 0.004) {
    const y = 210 - t * 150;
    const x = bx + Math.sin(t * 7 + w * 2.1) * 26 * (0.4 + t);
    const a = Math.round(70 * Math.sin(t * Math.PI));
    disc(x, y, 9 + t * 7, 255, 250, 240, a);
  }
}

// 12. final warm vignette kiss
glow(512, 512, 700, 255, 200, 120, 18);

// ---- PNG encode (filter 0, zlib deflate) ----
function crc32(buf: Buffer): number {
  let c: number, table: number[] | null = (crc32 as any)._t;
  if (!table) {
    table = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
    (crc32 as any)._t = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table![(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
// strip alpha -> RGB for smaller file (raw RGBA scanlines not needed)
const rgb = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  rgb[y * (1 + W * 3)] = 0;
  for (let x = 0; x < W; x++) {
    const si = (y * W + x) * 4, di = y * (1 + W * 3) + 1 + x * 3;
    rgb[di] = px[si]; rgb[di + 1] = px[si + 1]; rgb[di + 2] = px[si + 2];
  }
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(rgb, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
mkdirSync("/output", { recursive: true });
writeFileSync("/output/entry.png", png);
console.log(`wrote /output/entry.png ${png.length} bytes ${W}x${H}`);
