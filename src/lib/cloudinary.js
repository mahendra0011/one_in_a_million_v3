/**
 * cloudinary.js — central helpers for generating optimised Cloudinary URLs.
 *
 * All URLs use:
 *   f_auto  → serves WebP on Chrome/Edge/Firefox, AVIF where supported, JPEG fallback
 *   q_auto  → Cloudinary picks the best quality (typically 75–85, ~50% smaller than raw JPEG)
 *
 * Usage:
 *   import { menuImageUrl, ogImageUrl } from '../lib/cloudinary';
 *   <img src={menuImageUrl('million-classic')} ... />
 */

const CLOUD_NAME = 'dsjxrospe';
const FOLDER     = 'one%20in%20a%20million/images';
const BASE       = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

/**
 * Build a Cloudinary URL with arbitrary transformations.
 * @param {string} id       — image public-id (no extension)
 * @param {string} transforms — Cloudinary transformation string
 */
export function cloudinaryUrl(id, transforms = '') {
  const t = transforms ? `${transforms}/` : '';
  return `${BASE}/${t}${FOLDER}/${id}`;
}

/**
 * Menu card images — square crop, 600px, WebP auto.
 * Used in ProductCard and MenuPage.
 */
export function menuImageUrl(id) {
  return cloudinaryUrl(id, 'f_auto,q_auto,w_600,h_600,c_fill');
}

/**
 * Open Graph / Twitter card share image — 1200×630 landscape.
 */
export function ogImageUrl(id = 'million-classic') {
  return cloudinaryUrl(id, 'f_auto,q_auto,w_1200,h_630,c_fill');
}

/**
 * Hero / full-width banner — responsive widths, WebP auto.
 * Returns a srcset string ready for <img srcset="...">.
 */
export function heroSrcset(id, widths = [400, 800, 1200, 1600]) {
  return widths
    .map(w => `${cloudinaryUrl(id, `f_auto,q_auto,w_${w}`)} ${w}w`)
    .join(', ');
}

/**
 * Thumbnail — small square, useful for cart / order items.
 */
export function thumbUrl(id) {
  return cloudinaryUrl(id, 'f_auto,q_auto,w_120,h_120,c_fill');
}
