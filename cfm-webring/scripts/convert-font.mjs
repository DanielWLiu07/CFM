import opentype from 'opentype.js';
import fs from 'fs';
import path from 'path';

const inputPath = process.argv[2] || 'public/fonts/arcadeclassic.ttf';
const outputPath = process.argv[3] || 'public/fonts/arcadeclassic.typeface.json';

const font = opentype.loadSync(inputPath);

const scale = (1000 * 100) / ((font.unitsPerEm || 2048) * 72);
const result = {
  glyphs: {},
  familyName: font.names.fontFamily?.en || 'Unknown',
  ascender: Math.round(font.ascender * scale),
  descender: Math.round(font.descender * scale),
  underlinePosition: Math.round((font.tables.post?.underlinePosition || 0) * scale),
  underlineThickness: Math.round((font.tables.post?.underlineThickness || 0) * scale),
  boundingBox: {
    xMin: Math.round((font.tables.head?.xMin || 0) * scale),
    yMin: Math.round((font.tables.head?.yMin || 0) * scale),
    xMax: Math.round((font.tables.head?.xMax || 0) * scale),
    yMax: Math.round((font.tables.head?.yMax || 0) * scale),
  },
  resolution: 1000,
  original_font_information: font.tables.name,
};

for (let i = 0; i < font.glyphs.length; i++) {
  const glyph = font.glyphs.get(i);
  if (glyph.unicode === undefined) continue;

  const token = {};
  token.ha = Math.round(glyph.advanceWidth * scale);
  token.x_min = Math.round((glyph.xMin || 0) * scale);
  token.x_max = Math.round((glyph.xMax || 0) * scale);
  token.o = '';

  if (glyph.path) {
    for (const cmd of glyph.path.commands) {
      switch (cmd.type) {
        case 'M':
          token.o += `m ${Math.round(cmd.x * scale)} ${Math.round(cmd.y * scale)} `;
          break;
        case 'L':
          token.o += `l ${Math.round(cmd.x * scale)} ${Math.round(cmd.y * scale)} `;
          break;
        case 'Q':
          token.o += `q ${Math.round(cmd.x1 * scale)} ${Math.round(cmd.y1 * scale)} ${Math.round(cmd.x * scale)} ${Math.round(cmd.y * scale)} `;
          break;
        case 'C':
          token.o += `b ${Math.round(cmd.x1 * scale)} ${Math.round(cmd.y1 * scale)} ${Math.round(cmd.x2 * scale)} ${Math.round(cmd.y2 * scale)} ${Math.round(cmd.x * scale)} ${Math.round(cmd.y * scale)} `;
          break;
        case 'Z':
          break;
      }
    }
  }

  result.glyphs[String.fromCodePoint(glyph.unicode)] = token;
}

fs.writeFileSync(outputPath, JSON.stringify(result));
console.log(`Converted ${inputPath} -> ${outputPath}`);
console.log(`Glyphs: ${Object.keys(result.glyphs).length}`);
