/**
 * Analysis Thresholds Configuration
 * Centralized configuration for all analysis thresholds and magic numbers
 * Makes it easy to tune the analysis engine without searching through code
 */

export const THRESHOLDS = {
  // Content Analysis
  content: {
    MIN_WORD_COUNT: 300,              // Minimum words for blog analysis
    STRICT_NONBLOG_MIN: 700,          // Stricter minimum for non-blog pages
    MAX_BODY_CHARS_FAST: 150000,      // Max chars to process in fast mode
    MAX_BODY_CHARS_FULL: 300000,      // Max chars to process in full mode
    FLESCH_READING_EASE_MIN: 50,      // Minimum readability score
    DUPLICATE_PARAGRAPH_RATIO: 30,    // % duplicate paragraphs threshold
  },

  // HTML & Network
  html: {
    MAX_SIZE_BYTES: 800000,           // 800KB max HTML size
    LARGE_SIZE_WARNING: 500000,       // 500KB triggers warning
    MAX_EXTERNAL_LINK_CHECKS: 5,      // Number of external links to check
    BROKEN_LINK_RATE_THRESHOLD: 10,   // % broken links to trigger warning
  },

  // Performance Metrics
  performance: {
    // Core Web Vitals
    LCP_GOOD_MS: 2500,                // Largest Contentful Paint (good)
    LCP_POOR_MS: 4000,                // LCP (poor)
    FCP_GOOD_MS: 1800,                // First Contentful Paint (good)
    FCP_POOR_MS: 3000,                // FCP (poor)
    CLS_GOOD: 0.1,                    // Cumulative Layout Shift (good)
    CLS_POOR: 0.25,                   // CLS (poor)
    FID_GOOD_MS: 100,                 // First Input Delay (good)
    FID_POOR_MS: 300,                 // FID (poor)
    TTFB_GOOD_MS: 800,                // Time to First Byte (good)
    TTFB_POOR_MS: 1800,               // TTFB (poor)
    
    // Page Weight
    TOTAL_WEIGHT_GOOD_MB: 1.0,        // Total page weight (good)
    TOTAL_WEIGHT_POOR_MB: 3.0,        // Total page weight (poor)
    LARGE_ASSET_SIZE_KB: 500,         // Asset size threshold
    
    // Rendering
    BLOCKING_SCRIPTS_THRESHOLD: 2,    // Max blocking scripts before warning
    BLOCKING_STYLESHEETS_THRESHOLD: 1, // Max blocking stylesheets
  },

  // SEO
  seo: {
    TITLE_MIN_LENGTH: 30,             // Minimum title length
    TITLE_MAX_LENGTH: 60,             // Maximum title length
    META_DESC_MIN_LENGTH: 50,         // Minimum meta description
    META_DESC_MAX_LENGTH: 160,        // Maximum meta description
    INTERNAL_LINKS_MIN: 5,            // Minimum internal links for good SEO
    MISSING_ALT_THRESHOLD: 2,         // Max images without alt text
    H1_COUNT_MAX: 1,                  // Maximum H1 tags
  },

  // UX
  ux: {
    LAZY_LOADING_MIN_FRACTION: 0.3,   // Min % of images with lazy loading
    LAZY_LOADING_IMAGE_COUNT: 5,      // Min images to check lazy loading
    MISSING_DIMENSIONS_THRESHOLD: 3,  // Max images without dimensions
    VIEWPORT_IMPACT: 9,               // Recommendation priority for viewport
  },

  // Ads & Overlays
  ads: {
    AD_SCRIPTS_THRESHOLD: 6,          // Max ad scripts before warning
    OVERLAYS_THRESHOLD: 1,            // Max overlays before warning
    STICKY_ADS_THRESHOLD: 0,          // Max sticky ads (0 = any triggers)
  },

  // Cache & CDN
  cache: {
    MIN_TTL_DAYS: 7,                  // Minimum cache TTL
    RECOMMENDED_TTL_DAYS: 30,         // Recommended cache TTL
  },

  // Timeouts (in milliseconds)
  timeouts: {
    PAGE_FETCH_MS: 30000,             // 30 seconds for page fetch
    PAGESPEED_API_MS: 20000,          // 20 seconds for PageSpeed API
    SITEMAP_CHECK_MS: 2000,           // 2 seconds for sitemap check
    ROBOTS_CHECK_MS: 2000,            // 2 seconds for robots.txt check
    EXTERNAL_LINK_CHECK_MS: 1500,     // 1.5 seconds per external link
  },

  // Uniqueness & Keyword Analysis
  uniqueness: {
    TOP_KEYWORDS_COUNT: 10,           // Number of keywords to extract
    BIGRAM_MIN_FREQUENCY: 2,          // Minimum bigram frequency
    BIGRAM_WEIGHT_MULTIPLIER: 1.2,    // Weight boost for bigrams
    KEYWORD_RARITY_THRESHOLD: 7,      // Score threshold for rarity warning
  },

  // Recommendations Priority
  recommendations: {
    PRIORITY_HIGH: 9,
    PRIORITY_MEDIUM: 7,
    PRIORITY_LOW: 5,
  }
};

export default THRESHOLDS;
