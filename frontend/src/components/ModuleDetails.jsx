import { useState } from 'react';
import { Search, TrendingUp, Info, Sparkles, Zap, Target, BarChart3, Eye, Lightbulb, ChevronRight } from 'lucide-react';

// Comprehensive metric information database - ALL metrics from backend
const metricDatabase = {
  // ==================== PERFORMANCE METRICS ====================
  lcp_seconds: { name: 'Largest Contentful Paint', category: 'Performance', description: 'Time until main content is visible (seconds)', why: 'Fast loading keeps visitors engaged. Slow sites lose 53% of mobile users.', calculation: 'Measures when the largest image or text block becomes visible', ideal: 'Under 2.5 seconds', icon: '⚡', color: 'from-yellow-500 to-orange-500' },
  tbt_ms: { name: 'Total Blocking Time', category: 'Performance', description: 'Time main thread is blocked (milliseconds)', why: 'Lower blocking time means faster interactivity and better user experience.', calculation: 'Sum of blocking time for long tasks (>50ms) between FCP and TTI', ideal: 'Under 300ms', icon: '⏱️', color: 'from-orange-500 to-red-500' },
  cls: { name: 'Cumulative Layout Shift', category: 'Performance', description: 'Visual stability while loading', why: 'Prevents annoying page jumps that cause misclicks and frustration.', calculation: 'Tracks unexpected layout shifts during page load', ideal: 'Under 0.1', icon: '🎢', color: 'from-red-500 to-pink-500' },
  fcp_seconds: { name: 'First Contentful Paint', category: 'Performance', description: 'Time to first visible content (seconds)', why: 'First impression matters. Quick feedback assures users the page is loading.', calculation: 'Time from navigation to first DOM content render', ideal: 'Under 1.8 seconds', icon: '🎨', color: 'from-green-500 to-emerald-500' },
  using_real_data: { name: 'Real User Data', category: 'Performance', description: 'Using real Chrome UX Report data vs simulated', why: 'Real user data provides more accurate performance insights than lab tests.', calculation: 'Checks if Chrome UX Report has data for your URL', ideal: 'True (real data available)', icon: '📊', color: 'from-blue-500 to-cyan-500' },
  data_source: { name: 'Data Source', category: 'Performance', description: 'Source of performance metrics', why: 'Knowing data source helps interpret results correctly.', calculation: 'CrUX (real users) or PageSpeed (simulated)', ideal: 'CrUX for production sites', icon: '🔍', color: 'from-slate-500 to-gray-500' },
  real_ttfb: { name: 'Real TTFB', category: 'Performance', description: 'Actual server response time from CrUX', why: 'Real TTFB reflects actual user experience with server speed.', calculation: 'Time to First Byte from Chrome User Experience Report', ideal: 'Under 800ms', icon: '🚀', color: 'from-cyan-500 to-blue-500' },
  core_web_vitals_score: { name: 'Core Web Vitals', category: 'Performance', description: 'Overall score for LCP, FID, CLS', why: 'Google uses Core Web Vitals as a ranking factor.', calculation: 'Weighted score of LCP (40%), FID (40%), CLS (20%)', ideal: '90+ (all vitals good)', icon: '🎯', color: 'from-green-600 to-emerald-600' },
  total_page_weight_mb: { name: 'Page Weight', category: 'Performance', description: 'Total size of page resources (MB)', why: 'Lighter pages load faster, especially on mobile networks.', calculation: 'Sum of all resource sizes (HTML, CSS, JS, images, fonts)', ideal: 'Under 2MB', icon: '⚖️', color: 'from-purple-500 to-pink-500' },
  requests_count: { name: 'HTTP Requests', category: 'Performance', description: 'Number of resource requests', why: 'Fewer requests reduce latency and improve load time.', calculation: 'Counts all HTTP requests (scripts, images, fonts, etc.)', ideal: 'Under 50 requests', icon: '📡', color: 'from-indigo-500 to-purple-500' },
  large_asset_count: { name: 'Large Assets', category: 'Performance', description: 'Resources over 300KB', why: 'Large files slow down your page. Optimize images and scripts.', calculation: 'Counts resources larger than 300KB', ideal: '0-2 large assets', icon: '📦', color: 'from-red-600 to-orange-600' },
  load_cost_score: { name: 'Load Cost Score', category: 'Performance', description: 'Resource efficiency rating', why: 'Efficient resource loading improves performance and user experience.', calculation: 'Based on total weight, large assets, and request count', ideal: '70+ is efficient', icon: '💰', color: 'from-emerald-500 to-teal-500' },
  preconnect_preload_count: { name: 'Resource Hints', category: 'Performance', description: 'Preconnect/preload optimizations', why: 'Resource hints help browser prioritize critical resources.', calculation: 'Counts preconnect and preload link tags', ideal: '2-5 hints for critical resources', icon: '🔗', color: 'from-blue-600 to-indigo-600' },
  ttfb_ms: { name: 'Time to First Byte', category: 'Performance', description: 'Server response time (milliseconds)', why: 'Fast server response is foundation of good performance.', calculation: 'Time from request to first byte received', ideal: 'Under 600ms', icon: '⏰', color: 'from-yellow-600 to-orange-600' },
  network_efficiency_score: { name: 'Network Efficiency', category: 'Performance', description: 'How well network resources are used', why: 'Efficient network usage reduces load time and data usage.', calculation: 'Based on TTFB, compression, caching, and CDN usage', ideal: '80+ is excellent', icon: '🌐', color: 'from-teal-600 to-cyan-600' },
  blocking_stylesheets_count: { name: 'Blocking Stylesheets', category: 'Performance', description: 'CSS files blocking page render', why: 'Blocking CSS delays first paint. Critical CSS should be inlined.', calculation: 'Counts non-async, non-deferred CSS links', ideal: '0-1 blocking stylesheet', icon: '🎨', color: 'from-pink-600 to-red-600' },
  blocking_scripts_count: { name: 'Blocking Scripts', category: 'Performance', description: 'JavaScript files blocking parsing', why: 'Blocking scripts delay page rendering. Use async/defer.', calculation: 'Counts non-async, non-deferred script tags', ideal: '0-2 blocking scripts', icon: '⚠️', color: 'from-orange-600 to-red-600' },
  critical_css_present: { name: 'Critical CSS', category: 'Performance', description: 'Above-fold CSS inlined', why: 'Inlining critical CSS eliminates render-blocking requests.', calculation: 'Checks for inline styles in <head>', ideal: 'True (critical CSS present)', icon: '✨', color: 'from-green-500 to-emerald-500' },
  render_blocking_score: { name: 'Render Blocking', category: 'Performance', description: 'Optimization of render-blocking resources', why: 'Reducing render-blocking resources speeds up first paint.', calculation: 'Based on blocking CSS/JS count and critical CSS', ideal: '80+ is well optimized', icon: '🚦', color: 'from-amber-600 to-yellow-600' },
  images_missing_srcset_ratio: { name: 'Responsive Images', category: 'Performance', description: 'Percentage missing srcset attribute', why: 'Srcset serves appropriate image sizes, saving bandwidth.', calculation: '(Images without srcset / total images) × 100', ideal: 'Under 20%', icon: '🖼️', color: 'from-blue-500 to-purple-500' },
  video_autoplay_with_sound_count: { name: 'Autoplay Videos', category: 'Performance', description: 'Videos autoplaying with sound', why: 'Autoplaying videos are intrusive and waste bandwidth.', calculation: 'Counts video elements with autoplay and no muted attribute', ideal: '0 autoplaying videos', icon: '🔊', color: 'from-red-500 to-pink-500' },
  media_optimization_score: { name: 'Media Optimization', category: 'Performance', description: 'Image and video efficiency', why: 'Optimized media loads faster and uses less bandwidth.', calculation: 'Based on srcset usage, lazy loading, and video autoplay', ideal: '75+ is well optimized', icon: '📸', color: 'from-violet-600 to-purple-600' },
  compression: { name: 'Content Encoding', category: 'Performance', description: 'Compression method (gzip/brotli)', why: 'Compression reduces transfer size by 70-80%.', calculation: 'Checks Content-Encoding header', ideal: 'brotli or gzip', icon: '🗜️', color: 'from-indigo-600 to-blue-600' },
  cache_control: { name: 'Cache Headers', category: 'Performance', description: 'Browser caching configuration', why: 'Proper caching avoids re-downloading unchanged resources.', calculation: 'Reads Cache-Control header', ideal: 'max-age=31536000 for static assets', icon: '💾', color: 'from-cyan-600 to-teal-600' },
  cache_ttl_days: { name: 'Cache Duration', category: 'Performance', description: 'How long resources are cached (days)', why: 'Longer cache duration for static assets improves repeat visits.', calculation: 'Extracts max-age from Cache-Control header', ideal: '365 days for static assets', icon: '📅', color: 'from-green-600 to-lime-600' },
  cdn_detected: { name: 'CDN Usage', category: 'Performance', description: 'Content Delivery Network detected', why: 'CDN serves content from locations closer to users.', calculation: 'Checks server headers and hostnames for CDN patterns', ideal: 'True (CDN in use)', icon: '🌍', color: 'from-blue-600 to-cyan-600' },
  caching_cdn_score: { name: 'Caching & CDN', category: 'Performance', description: 'Overall caching strategy rating', why: 'Good caching strategy dramatically improves repeat visit performance.', calculation: 'Based on cache headers, TTL, and CDN usage', ideal: '85+ is excellent', icon: '⚡', color: 'from-yellow-500 to-amber-500' },
  font_preload_present: { name: 'Font Preloading', category: 'Performance', description: 'Critical fonts preloaded', why: 'Preloading fonts prevents flash of invisible text (FOIT).', calculation: 'Checks for preload link tags with font resources', ideal: 'True (fonts preloaded)', icon: '🔤', color: 'from-slate-600 to-gray-600' },
  fonts_score: { name: 'Font Optimization', category: 'Performance', description: 'Web font loading strategy', why: 'Optimized fonts improve performance and prevent layout shifts.', calculation: 'Based on font preloading and display strategies', ideal: '70+ is well optimized', icon: 'Aa', color: 'from-purple-600 to-pink-600' },
  service_worker_present: { name: 'Service Worker', category: 'Performance', description: 'Offline capability enabled', why: 'Service workers enable offline functionality and faster repeat loads.', calculation: 'Checks for service worker registration', ideal: 'True (for PWAs)', icon: '⚙️', color: 'from-indigo-500 to-purple-500' },
  manifest_present: { name: 'Web App Manifest', category: 'Performance', description: 'PWA manifest file present', why: 'Manifest enables "Add to Home Screen" and app-like experience.', calculation: 'Checks for manifest.json link tag', ideal: 'True (for PWAs)', icon: '📱', color: 'from-blue-500 to-indigo-500' },
  progressive_enhancements_score: { name: 'Progressive Enhancements', category: 'Performance', description: 'PWA features implementation', why: 'Progressive enhancement makes sites work better on capable devices.', calculation: 'Based on service worker, manifest, and offline features', ideal: '60+ (PWA features)', icon: '🚀', color: 'from-emerald-600 to-teal-600' },

  // ==================== CONTENT METRICS ====================
  word_count: { name: 'Word Count', category: 'Content', description: 'Total words in main content', why: 'Comprehensive content (1000+ words) typically ranks better and provides more value.', calculation: 'Counts all words in main content area, excluding navigation and footer', ideal: '1000-2500 words for blog posts', icon: '📝', color: 'from-purple-500 to-pink-500' },
  flesch_score: { name: 'Readability Score', category: 'Content', description: 'How easy your content is to read (0-100)', why: 'Easier-to-read content (60-70) keeps visitors engaged and reduces bounce rates.', calculation: 'Flesch Reading Ease: 206.835 - 1.015(words/sentences) - 84.6(syllables/words)', ideal: '60-70 (conversational)', icon: '👓', color: 'from-blue-500 to-cyan-500' },
  avg_sentence_length: { name: 'Average Sentence Length', category: 'Content', description: 'Average words per sentence', why: 'Shorter sentences (15-20 words) are easier to scan and understand.', calculation: 'Total words divided by total sentences', ideal: '15-20 words per sentence', icon: '✏️', color: 'from-indigo-500 to-purple-500' },
  reading_time_min: { name: 'Reading Time', category: 'Content', description: 'Estimated minutes to read', why: 'Helps readers decide if they have time. 5-10 min is ideal for blog posts.', calculation: 'Word count divided by 200-250 words per minute', ideal: '5-10 minutes', icon: '⏱️', color: 'from-amber-500 to-orange-500' },
  content_depth_ratio: { name: 'Content Depth Ratio', category: 'Content', description: 'Content comprehensiveness score', why: 'In-depth content establishes expertise and authority.', calculation: 'Based on word count, heading structure, and information density', ideal: '0.7+ shows comprehensive coverage', icon: '🎯', color: 'from-violet-500 to-purple-500' },
  days_since_published: { name: 'Content Freshness', category: 'Content', description: 'Days since publication', why: 'Fresh content (<90 days) may rank better for trending topics.', calculation: 'Extracts published date from schema or meta tags', ideal: 'Under 90 days for trending topics', icon: '📅', color: 'from-green-500 to-emerald-500' },
  fresh_content: { name: 'Is Fresh', category: 'Content', description: 'Published within 90 days', why: 'Fresh content gets temporary boost in search for timely queries.', calculation: 'True if published date is within 90 days', ideal: 'True for news/trending content', icon: '✨', color: 'from-lime-500 to-green-500' },
  questions_count: { name: 'Questions Asked', category: 'Content', description: 'Number of questions in content', why: 'Questions engage readers and match voice search queries.', calculation: 'Counts sentences ending with question marks', ideal: '3-5 questions for engagement', icon: '❓', color: 'from-blue-600 to-cyan-600' },
  call_to_actions_count: { name: 'Call-to-Actions', category: 'Content', description: 'CTAs encouraging reader action', why: 'Clear CTAs guide readers and improve conversions.', calculation: 'Detects phrases like "subscribe", "download", "learn more"', ideal: '2-4 CTAs', icon: '👉', color: 'from-orange-600 to-red-600' },
  storytelling_matches: { name: 'Storytelling Elements', category: 'Content', description: 'Narrative and personal touches', why: 'Stories create emotional connection and are more memorable.', calculation: 'Detects narrative words like "I", "my", "story", "experience"', ideal: '5+ storytelling phrases', icon: '📖', color: 'from-pink-600 to-rose-600' },
  visuals_ratio: { name: 'Visual Content Ratio', category: 'Content', description: 'Images/videos per 500 words', why: 'Visual content breaks up text and increases engagement.', calculation: '(Images + Videos) / (Word Count / 500)', ideal: '1-2 visuals per 500 words', icon: '🖼️', color: 'from-purple-600 to-indigo-600' },

  // ==================== SEO METRICS ====================
  title_cleaned: { name: 'Page Title', category: 'SEO', description: 'Title tag content', why: 'Title is the most important on-page SEO element. Appears in search results.', calculation: 'Extracts <title> tag text', ideal: '50-60 characters with primary keyword', icon: '🏷️', color: 'from-blue-600 to-indigo-600' },
  sample_word_count: { name: 'Indexed Content Sample', category: 'SEO', description: 'Words in meta description sample', why: 'Represents how much content search engines see in preview.', calculation: 'Word count of first 1000 characters of body content', ideal: '150+ words', icon: '📄', color: 'from-slate-600 to-gray-600' },
  canonical_present: { name: 'Canonical Tag', category: 'SEO', description: 'Canonical URL specified', why: 'Prevents duplicate content issues across multiple URLs.', calculation: 'Checks for <link rel="canonical"> tag', ideal: 'True (canonical present)', icon: '🔗', color: 'from-indigo-600 to-purple-600' },
  open_graph_present: { name: 'Open Graph Tags', category: 'SEO', description: 'Facebook/social preview tags', why: 'Beautiful social previews increase shares and click-through rates.', calculation: 'Checks for og:title, og:description, og:image', ideal: 'True (all OG tags present)', icon: '📱', color: 'from-blue-500 to-indigo-500' },
  twitter_card_present: { name: 'Twitter Card', category: 'SEO', description: 'Twitter-specific preview tags', why: 'Optimized Twitter previews improve engagement on Twitter.', calculation: 'Checks for twitter:card, twitter:title, twitter:image', ideal: 'True (Twitter Card present)', icon: '🐦', color: 'from-sky-500 to-blue-500' },
  schema_present: { name: 'Structured Data', category: 'SEO', description: 'Schema.org markup present', why: 'Structured data enables rich results (stars, recipes, FAQs) in search.', calculation: 'Checks for JSON-LD or microdata schema markup', ideal: 'True (Article/Recipe schema)', icon: '🎯', color: 'from-green-600 to-emerald-600' },

  // ==================== ACCESSIBILITY METRICS ====================
  h1_present: { name: 'H1 Heading', category: 'Accessibility', description: 'Main heading present', why: 'H1 helps screen readers and search engines understand page topic.', calculation: 'Checks for at least one <h1> tag', ideal: 'True (exactly one H1)', icon: '📌', color: 'from-blue-600 to-cyan-600' },
  html_lang_present: { name: 'Language Attribute', category: 'Accessibility', description: 'HTML lang attribute set', why: 'Helps screen readers pronounce content correctly.', calculation: 'Checks for lang attribute on <html> tag', ideal: 'True (lang="en" or other)', icon: '🌐', color: 'from-green-600 to-teal-600' },
  missing_alt_count: { name: 'Missing Alt Text', category: 'Accessibility', description: 'Images without alt attributes', why: 'Alt text is critical for screen readers and image SEO.', calculation: 'Counts <img> tags without alt attribute', ideal: '0 missing alt tags', icon: '🖼️', color: 'from-orange-600 to-red-600' },

  // ==================== UX METRICS ====================
  mobile_responsive: { name: 'Mobile Responsive', category: 'User Experience', description: 'Mobile-friendly viewport', why: '60%+ of traffic is mobile. Responsive design is essential.', calculation: 'Checks for viewport meta tag with proper settings', ideal: 'True (viewport configured)', icon: '📱', color: 'from-teal-500 to-cyan-500' },
  images_lazy_fraction: { name: 'Lazy Loading Images', category: 'User Experience', description: 'Percentage of images lazy loaded', why: 'Lazy loading improves initial load time by deferring offscreen images.', calculation: '(Lazy images / total images) × 100', ideal: '60%+ lazy loaded', icon: '⚡', color: 'from-yellow-500 to-amber-500' },
  images_missing_dimensions: { name: 'Images Without Dimensions', category: 'User Experience', description: 'Images missing width/height', why: 'Dimensions prevent layout shifts as images load.', calculation: 'Counts images without width and height attributes', ideal: '0 missing dimensions', icon: '📐', color: 'from-red-500 to-orange-500' },
  nav_link_count: { name: 'Navigation Links', category: 'User Experience', description: 'Links in main navigation', why: 'Clear navigation helps users find content. 5-7 is optimal.', calculation: 'Counts links in <nav> element', ideal: '5-7 navigation links', icon: '🧭', color: 'from-indigo-600 to-purple-600' },
  has_search_feature: { name: 'Search Feature', category: 'User Experience', description: 'Site search present', why: 'Search helps users find specific content on larger sites.', calculation: 'Checks for search input or search functionality', ideal: 'True (for sites with 20+ pages)', icon: '🔍', color: 'from-blue-500 to-cyan-500' },
  has_categories_or_tags: { name: 'Categories/Tags', category: 'User Experience', description: 'Content categorization present', why: 'Categories help users discover related content.', calculation: 'Detects category or tag links', ideal: 'True (categorization present)', icon: '🏷️', color: 'from-purple-500 to-pink-500' },
  base_font_size: { name: 'Base Font Size', category: 'User Experience', description: 'Root text size in pixels', why: 'Readable font size (16px+) improves accessibility and user experience.', calculation: 'Extracts computed font-size from body element', ideal: '16-18 pixels', icon: 'Aa', color: 'from-slate-600 to-gray-600' },
  line_height: { name: 'Line Height', category: 'User Experience', description: 'Text line spacing', why: 'Proper line height (1.5+) improves readability.', calculation: 'Computed line-height from body element', ideal: '1.5-1.8', icon: '📏', color: 'from-cyan-600 to-blue-600' },
  responsive_image_ratio: { name: 'Responsive Image %', category: 'User Experience', description: 'Images with responsive attributes', why: 'Responsive images adapt to screen size, improving mobile experience.', calculation: '(Images with srcset or max-width / total) × 100', ideal: '80%+ responsive', icon: '🖼️', color: 'from-green-600 to-emerald-600' },
  images_with_dimensions_ratio: { name: 'Images With Dimensions %', category: 'User Experience', description: 'Images with width/height set', why: 'Prevents layout shifts and improves visual stability.', calculation: '(Images with dimensions / total images) × 100', ideal: '90%+ with dimensions', icon: '📐', color: 'from-indigo-500 to-purple-500' },
  large_tap_targets_ratio: { name: 'Large Tap Targets %', category: 'User Experience', description: 'Touch-friendly clickable elements', why: 'Large tap targets (44×44px) prevent misclicks on mobile.', calculation: '(Elements ≥44px / total interactive) × 100', ideal: '90%+ large enough', icon: '👆', color: 'from-teal-600 to-cyan-600' },
  links_without_href: { name: 'Invalid Links', category: 'User Experience', description: 'Links missing href attribute', why: 'Links without href break navigation and keyboard access.', calculation: 'Counts <a> tags without href', ideal: '0 invalid links', icon: '🔗', color: 'from-orange-600 to-red-600' },
  ad_elements_count: { name: 'Ad Elements', category: 'User Experience', description: 'Total advertising elements', why: 'Too many ads hurt user experience. Balance monetization and UX.', calculation: 'Counts ad-related divs, iframes, and scripts', ideal: 'Under 5 ad units', icon: '📢', color: 'from-yellow-600 to-orange-600' },
  ads_above_fold: { name: 'Ads Above Fold', category: 'User Experience', description: 'Ads in initial viewport', why: 'Too many above-fold ads violate Google guidelines.', calculation: 'Counts ad elements in first 600px', ideal: '0-1 above fold', icon: '⚠️', color: 'from-red-600 to-pink-600' },

  // ==================== TRUST METRICS ====================
  identity_page_count: { name: 'Identity Pages', category: 'Trust', description: 'About/Author pages present', why: 'Identity pages build trust and demonstrate E-E-A-T (Experience, Expertise, Authority, Trust).', calculation: 'Detects About, Author, Team pages', ideal: '2+ identity pages', icon: '👤', color: 'from-blue-600 to-indigo-600' },
  contact_methods_count: { name: 'Contact Methods', category: 'Trust', description: 'Ways to reach site owner', why: 'Multiple contact options (email, phone, form) build credibility.', calculation: 'Counts email links, phone numbers, contact forms', ideal: '2+ contact methods', icon: '📧', color: 'from-green-600 to-teal-600' },
  legal_page_count: { name: 'Legal Pages', category: 'Trust', description: 'Privacy/Terms pages', why: 'Legal pages are required for many monetization methods and build trust.', calculation: 'Detects Privacy Policy, Terms, Disclaimer pages', ideal: '2+ legal pages', icon: '⚖️', color: 'from-purple-600 to-indigo-600' },
  email_links: { name: 'Email Links', category: 'Trust', description: 'Mailto links present', why: 'Email links provide easy contact method.', calculation: 'Counts mailto: links', ideal: '1+ email link', icon: '✉️', color: 'from-cyan-600 to-blue-600' },

  // ==================== SECURITY METRICS ====================
  https: { name: 'HTTPS Security', category: 'Security', description: 'Secure encrypted connection', why: 'HTTPS protects visitor data, builds trust, and is a ranking factor.', calculation: 'Checks if URL uses HTTPS protocol', ideal: 'True (always use HTTPS)', icon: '🔒', color: 'from-green-500 to-teal-500' },
  
  // ==================== MONETIZATION METRICS ====================
  ads_total: { name: 'Total Ads', category: 'Monetization', description: 'All ad units on page', why: 'Balance ad revenue with user experience. 3-5 ads is optimal.', calculation: 'Counts all ad iframes, scripts, and containers', ideal: '3-5 ad units', icon: '💰', color: 'from-yellow-500 to-amber-500' },
  affiliate_links_count: { name: 'Affiliate Links', category: 'Monetization', description: 'Affiliate marketing links', why: 'Affiliate links generate revenue. Disclose them properly.', calculation: 'Detects Amazon, ShareASale, CJ, and other affiliate links', ideal: '3-10 contextual links', icon: '🔗', color: 'from-orange-500 to-red-500' },
  has_disclosure: { name: 'Affiliate Disclosure', category: 'Monetization', description: 'FTC-required disclosure present', why: 'Required by law when using affiliate links. Builds trust.', calculation: 'Detects "disclosure", "affiliate", "commission" text', ideal: 'True (disclosure present)', icon: '📋', color: 'from-blue-500 to-indigo-500' },
  buy_buttons_count: { name: 'Buy Buttons', category: 'Monetization', description: 'Direct purchase CTAs', why: 'Clear buy buttons improve conversion rates.', calculation: 'Counts "buy", "shop", "order" buttons', ideal: '2-4 buy buttons', icon: '🛒', color: 'from-green-500 to-emerald-500' },
  product_cards_count: { name: 'Product Cards', category: 'Monetization', description: 'Structured product displays', why: 'Product cards improve conversion by presenting offers clearly.', calculation: 'Detects product card patterns and structures', ideal: '1-3 product cards', icon: '🎁', color: 'from-purple-500 to-pink-500' },
  email_inputs_count: { name: 'Email Signup Forms', category: 'Monetization', description: 'Newsletter subscription forms', why: 'Email list is valuable asset for content creators.', calculation: 'Counts email input fields', ideal: '1-2 signup forms', icon: '📬', color: 'from-cyan-500 to-blue-500' },
  cta_count: { name: 'Total CTAs', category: 'Monetization', description: 'All call-to-action elements', why: 'Strategic CTAs guide users toward desired actions.', calculation: 'Counts buttons and links with CTA patterns', ideal: '4-8 CTAs', icon: '👆', color: 'from-teal-500 to-green-500' },
  popup_count: { name: 'Popups', category: 'Monetization', description: 'Modal overlays', why: 'Popups can build email list but hurt UX if overused.', calculation: 'Detects modal, popup, and overlay patterns', ideal: '0-1 popup (exit-intent)', icon: '🪟', color: 'from-orange-500 to-red-500' },
  deceptive_patterns_count: { name: 'Deceptive Patterns', category: 'Monetization', description: 'Dark UX patterns detected', why: 'Deceptive patterns hurt trust and may violate platform policies.', calculation: 'Detects fake countdown timers, hidden costs, forced continuity', ideal: '0 deceptive patterns', icon: '⚠️', color: 'from-red-600 to-rose-600' }
};

const ModuleDetails = ({ results }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or explorer

  // Get all unique categories
  const categories = ['all', ...new Set(Object.values(metricDatabase).map(m => m.category))];

  // Filter metrics based on search and category
  const filteredMetrics = Object.entries(metricDatabase).filter(([key, metric]) => {
    const matchesSearch = metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         metric.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || metric.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Get metric value from results
  const getMetricValue = (metricKey) => {
    if (!results?.modules) return null;
    
    for (const [moduleName, moduleData] of Object.entries(results.modules)) {
      if (moduleData.metrics && metricKey in moduleData.metrics) {
        return moduleData.metrics[metricKey];
      }
    }
    return null;
  };

  // Score color helper
  const getScoreColor = (value, metricKey) => {
    const metric = metricDatabase[metricKey];
    if (!metric) return 'text-slate-600';
    
    if (typeof value === 'boolean') {
      return value ? 'text-green-600' : 'text-red-600';
    }
    
    // Performance metrics (lower is better for LCP, CLS, etc.)
    if (metricKey.includes('lcp') || metricKey.includes('cls') || metricKey.includes('fcp')) {
      if (value < 2) return 'text-green-600';
      if (value < 4) return 'text-yellow-600';
      return 'text-red-600';
    }
    
    // General scoring (higher is better)
    if (typeof value === 'number') {
      if (value >= 70) return 'text-green-600';
      if (value >= 50) return 'text-yellow-600';
      return 'text-orange-600';
    }
    
    return 'text-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Toggle View Mode */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'grid'
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Module View
        </button>
        <button
          onClick={() => setViewMode('explorer')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'explorer'
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Search className="w-4 h-4 inline mr-2" />
          Metric Explorer
        </button>
      </div>

      {/* Module Grid View */}
      {viewMode === 'grid' && (
        <div className="grid md:grid-cols-2 gap-6">
          {results?.modules && Object.entries(results.modules).map(([key, { score, metrics }], i) => {
            const formatModuleName = (name) => {
              if (name === 'seo') return 'SEO';
              if (name === 'ux') return 'User Experience';
              return name.charAt(0).toUpperCase() + name.slice(1);
            };

            const orderedEntries = (() => {
              if (key === 'content' && metrics) {
                const priorityKeys = [
                  'depth_score', 'readability_score', 'structure_score', 'media_score',
                  'engagement_score', 'originality_score', 'relevance_score'
                ];
                const primary = priorityKeys.filter(k => k in metrics).map(k => [k, metrics[k]]);
                const rest = Object.entries(metrics).filter(([k]) => !priorityKeys.includes(k));
                return [...primary, ...rest];
              }
              return Object.entries(metrics || {});
            })();

            return (
              <div
                key={i}
                className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-8 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] group"
                style={{
                  animation: `fadeIn 0.5s ease-out ${i * 0.1}s backwards`
                }}
              >
                {/* Module Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-slate-900">{formatModuleName(key)}</h3>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-2xl font-bold w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                      {score}
                    </div>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${score}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>

                {/* Metrics List */}
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {orderedEntries
                    .filter(([_, v]) => v !== null && v !== undefined)
                    .filter(([mkey]) => mkey !== 'web_uniqueness' && mkey !== 'database_uniqueness' && mkey !== 'keyword_rarity_data')
                    .map(([mkey, mval], j) => {
                      const metricInfo = metricDatabase[mkey];
                      
                      return (
                        <div
                          key={j}
                          onClick={() => metricInfo && setSelectedMetric({ key: mkey, ...metricInfo, value: mval })}
                          className={`group/metric relative py-3 px-4 rounded-xl hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 ${
                            metricInfo ? 'cursor-pointer' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-base text-slate-700 flex items-center gap-2">
                              {metricInfo?.icon && <span className="text-lg">{metricInfo.icon}</span>}
                              {metricInfo?.name || mkey.replace(/_/g, ' ')}
                              {metricInfo && (
                                <Info className="w-4 h-4 text-slate-400 opacity-0 group-hover/metric:opacity-100 transition-opacity" />
                              )}
                            </span>
                            <span className={`font-semibold text-lg ${getScoreColor(mval, mkey)}`}>
                              {typeof mval === 'boolean' ? (mval ? '✓' : '✗') : 
                               typeof mval === 'number' && !Number.isInteger(mval) ? mval.toFixed(2) : String(mval)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Metric Explorer View */}
      {viewMode === 'explorer' && (
        <div className="space-y-6">
          {/* Search and Filter Bar */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-6 shadow-lg">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search metrics... (e.g., 'readability', 'speed', 'SEO')"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeCategory === cat
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMetrics.map(([key, metric]) => {
              const value = getMetricValue(key);
              const hasValue = value !== null && value !== undefined;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedMetric({ key, ...metric, value })}
                  className="group bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/50 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden"
                >
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                  
                  {/* Content */}
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-4xl">{metric.icon}</div>
                      {hasValue && (
                        <div className={`font-bold text-xl ${getScoreColor(value, key)}`}>
                          {typeof value === 'boolean' ? (value ? '✓' : '✗') : 
                           typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
                        </div>
                      )}
                    </div>
                    
                    <h4 className="font-bold text-slate-900 mb-2 text-lg">{metric.name}</h4>
                    <p className="text-base text-slate-600 line-clamp-2">{metric.description}</p>
                    
                    <div className="mt-3 flex items-center text-xs text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Learn more</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMetrics.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-slate-600">No metrics found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}

      {/* Metric Detail Modal */}
      {selectedMetric && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMetric(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${selectedMetric.color} p-8 text-white rounded-t-3xl`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-5xl mb-3">{selectedMetric.icon}</div>
                  <h2 className="text-3xl font-bold mb-2">{selectedMetric.name}</h2>
                  <p className="text-white/90">{selectedMetric.description}</p>
                </div>
                {selectedMetric.value !== null && selectedMetric.value !== undefined && (
                  <div className="bg-white/20 backdrop-blur-xl rounded-2xl px-6 py-4 text-center">
                    <div className="text-sm opacity-90 mb-1">Your Score</div>
                    <div className="text-4xl font-bold">
                      {typeof selectedMetric.value === 'boolean' 
                        ? (selectedMetric.value ? '✓' : '✗')
                        : typeof selectedMetric.value === 'number' && !Number.isInteger(selectedMetric.value)
                        ? selectedMetric.value.toFixed(2)
                        : selectedMetric.value}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Why It Matters */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h3 className="text-xl font-bold text-slate-900">Why It Matters</h3>
                </div>
                <p className="text-slate-700 leading-relaxed">{selectedMetric.why}</p>
              </div>

              {/* How It's Calculated */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-blue-500" />
                  <h3 className="text-xl font-bold text-slate-900">How It's Calculated</h3>
                </div>
                <p className="text-slate-700 leading-relaxed font-mono text-sm bg-slate-50 p-4 rounded-xl">
                  {selectedMetric.calculation}
                </p>
              </div>

              {/* Ideal Range */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-green-500" />
                  <h3 className="text-xl font-bold text-slate-900">Ideal Range</h3>
                </div>
                <p className="text-slate-700 leading-relaxed bg-green-50 p-4 rounded-xl border border-green-200">
                  {selectedMetric.ideal}
                </p>
              </div>

              {/* Category Badge */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <span className="text-sm text-slate-600">Category</span>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r ${selectedMetric.color} text-white`}>
                  {selectedMetric.category}
                </span>
              </div>
            </div>

            {/* Close Button */}
            <div className="p-6 border-t border-slate-200">
              <button
                onClick={() => setSelectedMetric(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #06b6d4);
          border-radius: 10px;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default ModuleDetails;
