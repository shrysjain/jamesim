/** Photo-matched material roles and small deterministic, embedded surface textures. */
import { deflateSync } from 'node:zlib';

function png(width, height, rgba) {
  const crc = (bytes) => {
    let n = 0xffffffff;
    for (const b of bytes) {
      n ^= b;
      for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (0xedb88320 & -(n & 1));
    }
    return (n ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const name = Buffer.from(type),
      result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length);
    name.copy(result, 4);
    data.copy(result, 8);
    result.writeUInt32BE(crc(Buffer.concat([name, data])), data.length + 8);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++)
    rgba.copy(
      rows,
      y * (width * 4 + 1) + 1,
      y * width * 4,
      (y + 1) * width * 4,
    );
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function surface(kind) {
  const size = 128,
    pixels = Buffer.alloc(size * size * 4);
  // Cyan/teal square vinyl over dark carbon backing, sampled from the supplied photos.
  const palette = [
    [0, 159, 187],
    [0, 180, 205],
    [0, 128, 155],
    [0, 110, 132],
    [0, 145, 169],
    [0, 188, 211],
    [0, 101, 125],
  ];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const cellX = Math.floor(x / 8),
        cellY = Math.floor(y / 8);
      const edge = x < 6 || x >= 122 || y < 5 || y >= 123;
      const shade =
        20 + ((x + y) % 8 < 4 ? 9 : 0) + ((x - y + size) % 8 < 4 ? 4 : 0);
      const color =
        kind === 'wrap' && !edge
          ? palette[
              ((cellX * 137 + cellY * 73) ^ (cellX * cellY * 11)) %
                palette.length
            ]
          : [shade, shade + 3, shade + 4];
      pixels.set([...color, 255], (y * size + x) * 4);
    }
  return png(size, size, pixels);
}

export function photoAppearance(doc) {
  const textures = new Map();
  for (const kind of ['wrap', 'carbon'])
    textures.set(
      kind,
      doc
        .createTexture(`8592-${kind}`)
        .setMimeType('image/png')
        .setImage(surface(kind)),
    );
  const roles = {
    number: { color: [1, 1, 1, 1], metal: 0, rough: 0.95 },
    wrap: { color: [1, 1, 1, 1], metal: 0.05, rough: 0.65, texture: 'wrap' },
    carbon: { color: [1, 1, 1, 1], metal: 0.1, rough: 0.55, texture: 'carbon' },
    teal: { color: [0.004, 0.27, 0.31, 1], metal: 0.6, rough: 0.4 },
    orange: { color: [1, 0.2, 0.008, 1], metal: 0, rough: 0.7 },
    rubber: { color: [0.018, 0.022, 0.025, 1], metal: 0, rough: 0.85 },
    silver: { color: [0.69, 0.74, 0.77, 1], metal: 0.8, rough: 0.3 },
    blackMetal: { color: [0.055, 0.065, 0.07, 1], metal: 0.65, rough: 0.45 },
    clear: { color: [0.84, 0.92, 0.94, 0.16], metal: 0, rough: 0.15 },
    led: { color: [1, 0.79, 0.73, 1], metal: 0, rough: 0.3 },
  };
  const role = (name, sourceMaterial, path) => {
    // The source foam contains separate white number faces. Alliance recoloring
    // must affect only the red fabric faces, never the CAD lettering.
    if (/BumperFoam/.test(name))
      return sourceMaterial === 54 ? 'number' : 'bumper';
    if (/SideHopper|HopperExtensionSide|^Part 2$/.test(name)) return 'wrap';
    if (/Frankenmount|Herringbone roller/i.test(name)) return 'orange';
    if (
      /SH3-(11-TopPlate|06-UnderPlate|13-FeederPlateFinal|15-MotorPlate)|PolycarbPlate/.test(
        name,
      )
    )
      return 'carbon';
    if (/HopperExtensionFront/.test(name)) return 'clear';
    if (/SH-XX-ShooterSidePlates/.test(name)) return 'silver';
    if (/Belt|PolycarbTube|LiveRoller|Tread, Black/.test(name)) return 'rubber';
    if (/gear|pulley/i.test(name)) return 'blackMetal';
    if (sourceMaterial === 14) return 'teal';
    if (sourceMaterial === 2) return 'orange';
    return String(sourceMaterial);
  };
  function material(key) {
    const config = roles[key];
    if (!config) return null;
    const m = doc
      .createMaterial(`8592-${key}`)
      .setBaseColorFactor(config.color)
      .setMetallicFactor(config.metal)
      .setRoughnessFactor(config.rough)
      .setDoubleSided(true);
    if (config.texture) {
      m.setBaseColorTexture(textures.get(config.texture));
      m.getBaseColorTextureInfo().setMinFilter(9728).setMagFilter(9728);
    }
    if (config.color[3] < 1) m.setAlphaMode('BLEND');
    return m;
  }
  return { role, material, textured: (key) => !!roles[key]?.texture };
}
