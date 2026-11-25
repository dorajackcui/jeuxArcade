import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const size = 256;
let seed = 0x319ac405;
function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}
function cloud(spacing) {
  const cells = size / spacing;
  const nodes = Array.from({ length: cells * cells }, () => random() * 2 - 1);
  const at = (col, row) => nodes[(row % cells) * cells + col % cells];
  const smooth = value => value * value * (3 - 2 * value);
  const mix = (first, second, ratio) => first + (second - first) * ratio;
  return (col, row) => {
    const left = Math.floor(col / spacing), top = Math.floor(row / spacing);
    const horizontal = smooth(col % spacing / spacing), vertical = smooth(row % spacing / spacing);
    return mix(mix(at(left, top), at(left + 1, top), horizontal),
      mix(at(left, top + 1), at(left + 1, top + 1), horizontal), vertical);
  };
}
const tooth = cloud(4), press = cloud(32);
const raw = Buffer.alloc(size * (size + 1));
for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    const value = (random() * 2 - 1) * .72 + tooth(col, row) * .19 + press(col, row) * .09;
    raw[row * (size + 1) + col + 1] = Math.round(127.5 + 127.5 * value);
  }
}
function chunk(name, bytes) {
  const data = Buffer.concat([Buffer.from(name), bytes]);
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, data, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8;
writeFileSync(new URL('paper-grain.png', import.meta.url), Buffer.concat([
  Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
  chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
]));
