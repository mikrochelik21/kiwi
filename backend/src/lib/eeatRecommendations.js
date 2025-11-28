/**
 * EEAT-Focused Recommendations for Bloggers
 * Based on Google's E-E-A-T guidelines (Experience, Expertise, Authoritativeness, Trustworthiness)
 * Recommendations are blogger-friendly and avoid complex technical implementations
 */

export function generateEEATRecommendations(metrics, topKeywords = []) {
  const recs = [];
  const pushRec = (id, summary, impact, effort, example_code) => {
    if (!id || !summary) return;
    recs.push({ id, summary, impact: Number(impact) || 0, effort: effort || 'Low', example_code: example_code || '' });
  };

  // Extract metrics
  const {
    // Content metrics
    webUniquenessMetric,
    databaseUniquenessMetric,
    duplicateRatio,
    photoOriginality,
    imagesCount,
    wordCount,
    fleschScore,
    avgSentenceLength,
    headings,
    freshContent,
    clickHereAnchors,
    internalLinksTotal,
    
    // SEO metrics
    metaDescription,
    structuredDataPresent,
    robotsIndexable,
    openGraphPresent,
    imagesMissingAlt,
    
    // Trust metrics
    aboutPresent,
    contactPresent,
    privacyPresent,
    brokenLinksCount,
    brokenLinkRate,
    
    // Performance metrics
    lcpValue,
    htmlSize,
    blockingScripts,
    adScripts,
    overlays,
    stickyAds,
    
    // UX metrics
    viewport,
    lazyFraction,
    imagesMissingDims,
    
    // Security metrics
    https,
    analyticsPresent
  } = metrics;

  // ============================================
  // EEAT: EXPERIENCE & ORIGINALITY (Top Priority)
  // ============================================
  
  // Use web uniqueness metric for general content originality
  if (webUniquenessMetric && webUniquenessMetric.score < 60) {
    pushRec(
      'eeat-original-insights',
      `Share your personal experience and what makes your approach different`,
      9,
      'Medium',
      `Talk about what you actually tried, what worked for you, and what surprised you along the way.`
    );
  }
  
  // Use database uniqueness for industry-specific vocabulary
  if (databaseUniquenessMetric && databaseUniquenessMetric.score < 60) {
    pushRec(
      'eeat-industry-uniqueness',
      `Use more specific terms to stand out from other blogs in your niche`,
      7,
      'Medium',
      `Instead of generic words, get specific with varieties, techniques, or regional names that show your expertise.`
    );
  }
  
  if (duplicateRatio > 30) {
    pushRec(
      'eeat-avoid-copying',
      'Some parts sound too similar to other content—add your unique perspective',
      duplicateRatio > 50 ? 9 : 7,
      'Medium',
      `Share what you learned through your own experience, your personal process, and tips that worked for you.`
    );
  }

  if (photoOriginality < 0.5 && imagesCount > 0) {
    pushRec(
      'eeat-original-photos',
      'Use your own photos instead of stock images to show real experience',
      8,
      'Medium',
      'Take photos while you cook/work/create. Shows you actually did it!'
    );
  }

  if (wordCount < 600) {
    pushRec(
      'eeat-substantial-value',
      'Add more helpful details to make this more valuable for readers',
      8,
      'Medium',
      'Explain the why behind your advice, answer common questions, or share mistakes you made so others can avoid them.'
    );
  }

  // ============================================
  // EEAT: EXPERTISE & AUTHORITY
  // ============================================

  if (freshContent === false) {
    pushRec(
      'eeat-content-freshness',
      'Update old posts with new info, current tips, or add "Updated [Date]" note',
      6,
      'Medium',
      'Add: "Updated Jan 2025 with new tips" at top. Keep content current.'
    );
  }

  const subheadingsCount = (headings?.h2 || 0) + (headings?.h3 || 0);
  const neededSubs = Math.max(2, Math.floor(wordCount / 600));
  if (subheadingsCount < neededSubs && wordCount > 800) {
    pushRec(
      'eeat-descriptive-headings',
      `Use clear headings to organize your content and help readers scan`,
      7,
      'Low',
      'Make headings descriptive and helpful, like "Why This Works" or "What to Avoid" instead of generic ones.'
    );
  }

  if (!(headings?.h1 > 0)) {
    pushRec(
      'eeat-clear-title',
      `Add a clear, descriptive title that tells readers exactly what they'll learn`,
      7,
      'Low',
      'Example: "How to Make Fluffy Pancakes (with Video)" vs "Pancakes"'
    );
  }

  if (internalLinksTotal < 5 && wordCount > 600) {
    const anchorIdeas = (topKeywords || []).slice(0, 2).map(k => k.word).join(', ');
    pushRec(
      'eeat-related-content',
      `Link to your other related posts to help readers explore more`,
      6,
      'Low',
      `Connect readers to 2-4 of your other articles on ${anchorIdeas || 'similar topics'} for deeper value.`
    );
  }

  // ============================================
  // EEAT: TRUSTWORTHINESS
  // ============================================

  if (!contactPresent) {
    pushRec(
      'eeat-contact-page',
      'Add a contact page so readers can reach you—builds trust',
      6,
      'Low',
      'Email, contact form, or social media links work. Be reachable.'
    );
  }

  if (!privacyPresent && (adScripts > 3 || analyticsPresent)) {
    pushRec(
      'eeat-privacy-policy',
      'Add a privacy policy if you use ads or analytics—shows transparency',
      5,
      'Low',
      'Use a privacy policy generator. Be clear about what you track.'
    );
  }

  if (brokenLinkRate !== null && brokenLinkRate > 10) {
    pushRec(
      'eeat-fix-broken-links',
      `Fix ${brokenLinksCount} broken links—they hurt credibility (${Math.round(brokenLinkRate)}% broken)`,
      brokenLinkRate > 25 ? 7 : 5,
      'Medium',
      'Check links quarterly. Update or remove dead ones.'
    );
  }

  if (clickHereAnchors > 0) {
    pushRec(
      'eeat-descriptive-links',
      `Replace ${clickHereAnchors} "click here" links with descriptive text that tells what they'll find`,
      4,
      'Low',
      'Instead of "click here", use "see my chocolate cake recipe" or "read the full guide"'
    );
  }

  // ============================================
  // READABILITY & USER EXPERIENCE
  // ============================================

  if (fleschScore < 50) {
    pushRec(
      'eeat-readability',
      'Simplify your writing to make it easier to follow',
      6,
      'Low',
      `Use shorter sentences, break up long paragraphs, and add bullet points for important steps. Write conversationally.`
    );
  }

  if (avgSentenceLength > 20) {
    pushRec(
      'eeat-short-sentences',
      'Break up long sentences—easier to skim and understand',
      5,
      'Low',
      'One idea per sentence. Split sentences at "and" or "but".'
    );
  }

  // ============================================
  // PERFORMANCE (Blogger-Friendly)
  // ============================================

  if (lcpValue && lcpValue > 2.5) {
    pushRec(
      'perf-page-speed',
      'Your page could load faster—try compressing your images',
      lcpValue > 4 ? 8 : 6,
      'Medium',
      'Compress images before uploading using free tools. Smaller files mean faster loading for your readers.'
    );
  }

  if (htmlSize > 500000) {
    pushRec(
      'perf-image-size',
      `Page is heavy (~${Math.round(htmlSize/1024)} KB)—resize images before uploading`,
      htmlSize > 1000000 ? 7 : 5,
      'Medium',
      'Save images at 1200px width max. Use JPG for photos, PNG for graphics.'
    );
  }

  if (blockingScripts > 3) {
    pushRec(
      'perf-reduce-plugins',
      `${blockingScripts} plugins/widgets slow down your page—remove unused ones`,
      blockingScripts > 6 ? 7 : 5,
      'Low',
      `Deactivate plugins you don't use. Each widget adds load time.`
    );
  }

  if (adScripts > 6 || overlays > 1 || stickyAds > 0) {
    pushRec(
      'perf-reduce-ads',
      `Too many pop-ups or ads frustrate readers (${overlays} pop-ups, ${stickyAds} sticky ads)`,
      overlays > 2 ? 7 : 5,
      'Medium',
      'Limit to 1 pop-up max. Sticky ads should be small and non-intrusive.'
    );
  }

  // ============================================
  // SEO (Blogger-Friendly)
  // ============================================

  if (!metaDescription || metaDescription.length < 50) {
    pushRec(
      'seo-meta-description',
      'Add a description that makes people want to click in search results',
      !metaDescription ? 7 : 5,
      'Low',
      'Write 120-160 characters that preview what readers will learn and why it matters to them.'
    );
  } else if (metaDescription.length > 160) {
    pushRec(
      'seo-meta-description-trim',
      `Shorten meta description to 120-160 characters so it doesn't get cut off in search`,
      4,
      'Low',
      'Keep the hook at the start. Cut filler words.'
    );
  }

  if (!openGraphPresent) {
    pushRec(
      'seo-social-preview',
      'Add social preview tags so your posts look good when shared on Facebook/Twitter',
      6,
      'Low',
      'Most blogging platforms have this in settings: Title, Description, Image for social sharing.'
    );
  }

  if (imagesMissingAlt > 2) {
    pushRec(
      'seo-image-descriptions',
      `Add descriptive text to ${imagesMissingAlt} images (helps SEO and accessibility)`,
      imagesMissingAlt > 5 ? 6 : 4,
      'Low',
      `Describe what's in the image: "golden brown pancakes on white plate" not just "pancakes"`
    );
  }

  if (!robotsIndexable) {
    pushRec(
      'seo-allow-indexing',
      'Allow search engines to find your blog in settings',
      7,
      'Low',
      'In your blog settings: uncheck "Discourage search engines" or similar option.'
    );
  }

  // ============================================
  // UX (User Experience)
  // ============================================

  if (!viewport) {
    pushRec(
      'ux-mobile-friendly',
      'Make sure your blog looks good on phones',
      7,
      'Low',
      'Use a responsive theme. Test on your phone. Text should be readable without zooming.'
    );
  }

  if (lazyFraction < 0.5 && imagesCount > 3) {
    pushRec(
      'ux-lazy-images',
      'Enable lazy loading so images load as readers scroll (speeds up initial load)',
      5,
      'Low',
      'Most platforms have this in settings or plugins. Turn on "Lazy Load Images".'
    );
  }

  if (imagesMissingDims > 3) {
    pushRec(
      'ux-image-dimensions',
      `Set image sizes to prevent page jumping while loading (${imagesMissingDims} images affected)`,
      5,
      'Low',
      'Upload images at consistent sizes. Many themes do this automatically.'
    );
  }

  // ============================================
  // SECURITY (Simplified)
  // ============================================

  if (!https) {
    pushRec(
      'security-https',
      'Enable HTTPS (secure connection) for reader safety',
      8,
      'Medium',
      'Contact your hosting provider to enable SSL certificate (usually free).'
    );
  }

  // Deduplicate by id and sort by impact desc
  const unique = new Map();
  for (const r of recs) {
    const existing = unique.get(r.id);
    if (!existing || (r.impact || 0) > (existing.impact || 0)) {
      unique.set(r.id, r);
    }
  }
  
  return Array.from(unique.values())
    .sort((a, b) => (b.impact || 0) - (a.impact || 0))
    .slice(0, 12); // Top 12 recommendations
}
