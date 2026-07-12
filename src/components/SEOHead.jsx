/**
 * SEOHead — injects per-page <title>, meta description, OG tags, and Twitter
 * card tags into <head> using react-helmet-async's HelmetProvider (set up in
 * main.jsx).
 *
 * Usage:
 *   <SEOHead
 *     title="Our Menu"
 *     description="Fresh-made burgers, sides, drinks & combos."
 *     image="https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_1200/one%20in%20a%20million/images/million-classic"
 *     url="https://oneinamillion.com/menu"
 *   />
 */

import { Helmet } from 'react-helmet-async';

const SITE_NAME   = 'One in a Million';
const SITE_URL    = 'https://oneinamillion.com';
const DEFAULT_IMG = 'https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_1200,h_630,c_fill/one%20in%20a%20million/images/million-classic';
const DEFAULT_DESC = 'Order the best burgers in Jabalpur — customize, track, enjoy. Fresh-made patties, bold Indian spices, lightning-fast delivery.';
const TWITTER_HANDLE = '@oneinamillion';

export default function SEOHead({
  title,
  description = DEFAULT_DESC,
  image       = DEFAULT_IMG,
  url,
  type        = 'website',
  noindex     = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Best Burgers in Jabalpur`;
  const canonicalUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  return (
    <Helmet>
      {/* ── Primary ──────────────────────────────────────────────────────── */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* ── Open Graph ───────────────────────────────────────────────────── */}
      <meta property="og:type"        content={type} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url"         content={canonicalUrl} />
      <meta property="og:image"       content={image} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt"   content={fullTitle} />
      <meta property="og:locale"      content="en_IN" />

      {/* ── Twitter Card ─────────────────────────────────────────────────── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content={TWITTER_HANDLE} />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />

      {/* ── Structured Data (JSON-LD) ─────────────────────────────────────── */}
      <script type="application/ld+json">{JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESC,
        servesCuisine: 'American, Indian Fusion',
        priceRange: '₹₹',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Jabalpur',
          addressRegion: 'Madhya Pradesh',
          addressCountry: 'IN',
        },
        image: DEFAULT_IMG,
        sameAs: [],
      })}</script>
    </Helmet>
  );
}
