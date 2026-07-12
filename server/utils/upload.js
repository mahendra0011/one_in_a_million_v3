const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

const IMAGE_MAGIC = [
  { mime: 'image/jpeg', offset: 0, sig: Buffer.from([0xFF, 0xD8, 0xFF]) },
  { mime: 'image/png',  offset: 0, sig: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) },
  { mime: 'image/gif',  offset: 0, sig: Buffer.from('GIF8') },
  { mime: 'image/webp', offset: 0, sig: Buffer.from('RIFF') },
];

export function checkMagicBytes(fileBuffer, declaredMime) {
  for (const { mime, offset, sig } of IMAGE_MAGIC) {
    if (mime !== declaredMime) continue;
    const slice = fileBuffer.slice(offset, offset + sig.length);
    if (slice.equals(sig)) {
      if (mime === 'image/webp') {
        const webpSig = fileBuffer.slice(8, 12);
        return webpSig.equals(Buffer.from('WEBP'));
      }
      return true;
    }
  }
  return false;
}

export { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE };
