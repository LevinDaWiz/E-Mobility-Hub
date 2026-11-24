// ===== M1 sở hữu (UC17): đọc font TrueType (glyf) để nhúng vào PDF =====
// Chỉ đọc những gì PDF cần: bảng head / hhea / hmtx / maxp / cmap (định dạng 4 và 12) / OS/2.
// Không hỗ trợ font OpenType-CFF, font collection hay font biến thiên (ném lỗi rõ ràng).

export interface TtfFont {
  bytes: Uint8Array;
  unitsPerEm: number;
  ascent: number;
  descent: number;
  capHeight: number;
  bbox: [number, number, number, number];
  numGlyphs: number;
  glyphFor(codePoint: number): number; // 0 nếu font không có ký tự này
  advance(glyphId: number): number; // đơn vị font
}

export function parseTtf(bytes: Uint8Array): TtfFont {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (o: number) => view.getUint16(o);
  const i16 = (o: number) => view.getInt16(o);
  const u32 = (o: number) => view.getUint32(o);

  const sfnt = u32(0);
  if (sfnt === 0x4f54544f) throw new Error("Font OpenType-CFF không được hỗ trợ (cần TrueType .ttf).");
  if (sfnt === 0x74746366) throw new Error("Font collection (.ttc) không được hỗ trợ.");
  if (sfnt !== 0x00010000 && sfnt !== 0x74727565) throw new Error("Không phải tệp font TrueType.");

  const tables = new Map<string, number>();
  const numTables = u16(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(bytes[rec], bytes[rec + 1], bytes[rec + 2], bytes[rec + 3]);
    tables.set(tag, u32(rec + 8));
  }
  const table = (tag: string): number => {
    const offset = tables.get(tag);
    if (offset === undefined) throw new Error(`Font thiếu bảng "${tag}".`);
    return offset;
  };
  if (tables.has("fvar")) throw new Error("Font biến thiên không được hỗ trợ (cần font tĩnh).");

  const head = table("head");
  const hhea = table("hhea");
  const hmtx = table("hmtx");
  const maxp = table("maxp");
  const unitsPerEm = u16(head + 18);
  const numGlyphs = u16(maxp + 4);
  const numHMetrics = u16(hhea + 34);
  const ascent = i16(hhea + 4);
  const descent = i16(hhea + 6);

  let capHeight = Math.round(ascent * 0.7);
  const os2 = tables.get("OS/2");
  if (os2 !== undefined && u16(os2) >= 2) capHeight = i16(os2 + 88);

  // cmap: ưu tiên Unicode đầy đủ (3,10 / định dạng 12), sau đó BMP (3,1 hoặc nền tảng 0 / định dạng 4).
  const cmap = table("cmap");
  const records: { platform: number; encoding: number; offset: number }[] = [];
  for (let i = 0; i < u16(cmap + 2); i++) {
    records.push({ platform: u16(cmap + 4 + i * 8), encoding: u16(cmap + 6 + i * 8), offset: cmap + u32(cmap + 8 + i * 8) });
  }
  const pick =
    records.find((r) => r.platform === 3 && r.encoding === 10) ??
    records.find((r) => r.platform === 3 && r.encoding === 1) ??
    records.find((r) => r.platform === 0);
  if (!pick) throw new Error("Font không có bảng ánh xạ Unicode.");

  const map = new Map<number, number>();
  const format = u16(pick.offset);
  if (format === 4) {
    const segCount = u16(pick.offset + 6) / 2;
    const endCodes = pick.offset + 14;
    const startCodes = endCodes + segCount * 2 + 2;
    const deltas = startCodes + segCount * 2;
    const rangeOffsets = deltas + segCount * 2;
    for (let s = 0; s < segCount; s++) {
      const end = u16(endCodes + s * 2);
      const start = u16(startCodes + s * 2);
      const delta = u16(deltas + s * 2);
      const rangeOffset = u16(rangeOffsets + s * 2);
      for (let c = start; c <= end && c < 0xffff; c++) {
        let glyph: number;
        if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
        else {
          const raw = u16(rangeOffsets + s * 2 + rangeOffset + (c - start) * 2);
          glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
        }
        if (glyph !== 0) map.set(c, glyph);
      }
    }
  } else if (format === 12) {
    const groups = u32(pick.offset + 12);
    for (let g = 0; g < groups; g++) {
      const rec = pick.offset + 16 + g * 12;
      const start = u32(rec);
      const end = u32(rec + 4);
      const firstGlyph = u32(rec + 8);
      for (let c = start; c <= end && c - start < 0x10000; c++) map.set(c, firstGlyph + (c - start));
    }
  } else {
    throw new Error(`Định dạng cmap ${format} không được hỗ trợ.`);
  }

  return {
    bytes,
    unitsPerEm,
    ascent,
    descent,
    capHeight,
    bbox: [i16(head + 36), i16(head + 38), i16(head + 40), i16(head + 42)],
    numGlyphs,
    glyphFor: (codePoint) => map.get(codePoint) ?? 0,
    advance: (glyphId) => u16(hmtx + 4 * Math.min(glyphId, numHMetrics - 1)),
  };
}
