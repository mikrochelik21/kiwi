import { load } from 'cheerio';

// Simple in-memory TTL cache
const CACHE_TTL_MS = Number(process.env.ANALYSIS_CACHE_TTL_MS || 600000); // 10 minutes default
const _cache = new Map(); // key -> { ts, data }

function cacheKey(url, opts) {
  return `${url}::fast=${opts.fast?'1':'0'}::llm=${opts.llm?'1':'0'}`;
}

export function getCached(url, opts) {
  const key = cacheKey(url, opts);
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCached(url, opts, data) {
  const key = cacheKey(url, opts);
  _cache.set(key, { ts: Date.now(), data });
}

// Utility helpers
const clamp = v => Math.max(0, Math.min(100, v));
const norm = (val, good, bad) => { if (val <= good) return 100; if (val >= bad) return 0; return Math.round(((bad - val)/(bad-good))*100); };

async function fetchHtml(url, timeoutMs = Number(process.env.PAGE_FETCH_TIMEOUT_MS || 20000)) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': 'CreatorLensBot/1.0 (+https://example.com)' }, signal: ctrl.signal });
  clearTimeout(t);
  const elapsed = Date.now() - start;
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  let html = await res.text();
  const MAX_HTML_BYTES = Number(process.env.MAX_HTML_BYTES || 800000);
  if (html.length > MAX_HTML_BYTES) html = html.slice(0, MAX_HTML_BYTES);
  return { html, res, elapsed };
}

function aggregateDom(html) {
  const $ = load(html);
  const htmlLength = html.length;
  const images = $('img').toArray();
  const links = $('a[href]').toArray();
  const paragraphs = $('p').toArray();
  const lists = $('ul,ol').toArray();
  const tables = $('table').toArray();
  const videos = $('video').toArray();
  const headings = { h1: $('h1').length, h2: $('h2').length, h3: $('h3').length, h4: $('h4').length, h5: $('h5').length, h6: $('h6').length };
  const mainEl = $('main').first();
  const mainText = (mainEl.length ? mainEl.text() : $('body').text()).trim();
  const CONTENT_LIMIT = Number(process.env.CONTENT_LIMIT_CHARS || 8000);
  const contentSample = mainText.slice(0, CONTENT_LIMIT);
  return { $, htmlLength, images, links, paragraphs, lists, tables, videos, headings, contentSample };
}

function performanceModule(dom, res, fetchMs) {
  const { $, images } = dom;
  const htmlSize = Buffer.byteLength($.html() || '', 'utf8');
  const imagesMissingDims = images.filter(el => !$(el).attr('width') || !$(el).attr('height')).length;
  const imagesCount = images.length;
  const scriptsCount = $('script[src]').length;
  const blockingScripts = $('script[src]').filter((i, el) => !$(el).attr('defer') && !$(el).attr('async')).length;
  const stylesheetsCount = $('link[rel="stylesheet"]').length;
  const blockingStylesheetsCount = $('head link[rel="stylesheet"]').filter((i, el) => {
    const media = ($(el).attr('media') || '').toLowerCase();
    return !media || media === 'all';
  }).length;
  const inlineStylesLen = $('style').toArray().reduce((acc, el) => acc + ($(el).html()?.length || 0), 0);
  const potentialLCP = images.slice(0,10).reduce((acc, el) => acc + (($(el).attr('loading') === 'eager') ? 400 : 200), 0);
  const totalWeightEstimate = htmlSize + imagesCount*50000 + scriptsCount*30000 + stylesheetsCount*12000;
  const lcpScore = norm(potentialLCP, 1200, 4000);
  const tbtScore = norm(blockingScripts*250, 0, 2000);
  const clsScore = clamp(100 - Math.round(imagesMissingDims*2.5));
  const networkScore = norm(totalWeightEstimate/1000, 450, 5000);
  const blockingScore = clamp(100 - Math.round((blockingScripts+blockingStylesheetsCount)*8));
  const renderBlockingPenalty = blockingScripts*50 + blockingStylesheetsCount*30;
  const overall = Math.round(
    0.24*lcpScore + 0.20*tbtScore + 0.18*clsScore + 0.18*networkScore + 0.12*blockingScore + 0.08*clamp(100 - Math.round(renderBlockingPenalty/20))
  );
  return {
    score: overall,
    metrics: {
      html_size_bytes: htmlSize,
      image_count: imagesCount,
      image_missing_dimensions: imagesMissingDims,
      script_count: scriptsCount,
      blocking_script_count: blockingScripts,
      stylesheet_count: stylesheetsCount,
      blocking_stylesheet_count: blockingStylesheetsCount,
      inline_style_bytes: inlineStylesLen,
      estimated_total_weight_bytes: totalWeightEstimate,
      fetch_time_ms: fetchMs,
      lcp_proxy_score: lcpScore,
      tbt_proxy_score: tbtScore,
      cls_proxy_score: clsScore,
      network_efficiency_score: networkScore,
      render_blocking_score: blockingScore
    }
  };
}

function accessibilityModule(dom) {
  const { $, images, headings } = dom;
  const h1Present = headings.h1 === 1;
  const altGood = images.filter(el => (el.attribs.alt || '').trim().length >= 5).length;
  const altMissing = images.length - images.filter(el => (el.attribs.alt || '').trim().length > 0).length;
  const mainLandmark = $('main').length > 0;
  const emptyLinks = $('a').toArray().filter(el => !$(el).text().trim()).length;
  const scoreRaw = (h1Present?20:0) + Math.min(30, altGood*2) + (mainLandmark?15:5) + Math.max(0, 20 - altMissing*2) + Math.max(0, 15 - emptyLinks*3);
  return {
    score: clamp(scoreRaw),
    metrics: {
      h1_present: h1Present,
      alt_good_count: altGood,
      alt_missing_count: altMissing,
      main_landmark_present: mainLandmark,
      empty_link_count: emptyLinks
    }
  };
}

function seoModule(dom) {
  const { $, headings, contentSample, links } = dom;
  const titleRaw = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const h1Count = headings.h1;
  const https = canonical ? canonical.startsWith('https://') : true;
  const ogTags = $('meta[property^="og:"]').length;
  const twitterTags = $('meta[name^="twitter:"]').length;
  const schemaPresence = $('script[type="application/ld+json"]').length > 0;
  const identityRaw = (titleRaw?4:0) + (metaDesc?4:0) + (h1Count===1?4:0) + (canonical?2:0) + (https?2:0) + (schemaPresence?2:0); // /18
  const contentRaw = Math.min(6, Math.round(contentSample.length/800)); // /6
  const linkingRaw = Math.min(6, links.length>50?6:links.length>20?5:links.length>5?4:2); // /6
  const technicalRaw = (ogTags?2:0) + (twitterTags?2:0) + (schemaPresence?2:0); // /6
  const rawTotal = identityRaw + contentRaw + linkingRaw + technicalRaw; // max 36
  const normalized = Math.round((rawTotal/36)*100);
  return {
    score: normalized,
    metrics: {
      identity_raw: identityRaw,
      content_raw: contentRaw,
      linking_raw: linkingRaw,
      technical_raw: technicalRaw,
      raw_total_components: rawTotal,
      normalized_score: normalized,
      title_length: titleRaw.length,
      meta_description_present: !!metaDesc,
      canonical_present: !!canonical,
      schema_presence: schemaPresence,
      og_tag_count: ogTags,
      twitter_tag_count: twitterTags
    }
  };
}

function contentModule(dom) {
  const { $, contentSample, headings, paragraphs, lists, tables, images, videos, htmlLength } = dom;
  const text = contentSample;
  const lowerText = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const SENTENCE_SAMPLE_LIMIT = 10000;
  const sentenceSample = text.slice(0, SENTENCE_SAMPLE_LIMIT);
  const sentences = sentenceSample.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
  const avgSentenceLen = sentences.length ? Math.round((words.length / sentences.length) * 100) / 100 : words.length;
  const COMPLEX_SCAN_LIMIT = 3000;
  const complexWordCount = words.slice(0, COMPLEX_SCAN_LIMIT).filter(w => w.length >= 12).length;
  const complexRatio = wordCount ? complexWordCount / wordCount : 0;
  const passiveMatches = (sentenceSample.match(/\b(is|was|were|be|been|being|are|am)\s+\w+ed\b/gi) || []).length;
  const rawTitle = $('title').text().trim().toLowerCase();
  const primaryKeyword = rawTitle.split(/\s+/).filter(Boolean)[0] || '';
  const keywordRegex = primaryKeyword ? new RegExp(`\\b${primaryKeyword}\\b`, 'g') : null;
  const topicFreq = keywordRegex ? (lowerText.match(keywordRegex)||[]).length : 0;

  // --- NEW POINT-BASED SCORING SYSTEM (0-100) ---
  
  // 1. Readability Score (0-40): Flesch (0-20) + Avg Sentence Length (0-20)
  const syllables = Math.round(words.slice(0,5000).reduce((acc,w)=> acc + Math.ceil(w.length/3), 0));
  const sentencesCount = Math.max(1, sentences.length);
  const wordsCount = Math.max(1, words.length);
  const fleschScore = 206.835 - 1.015 * (wordsCount / sentencesCount) - 84.6 * (syllables / wordsCount);
  
  let fleschPoints;
  if (fleschScore >= 60) fleschPoints = 20;
  else if (fleschScore >= 30) fleschPoints = 15;
  else if (fleschScore >= 0) fleschPoints = 10;
  else if (fleschScore >= -30) fleschPoints = 5;
  else fleschPoints = 2;
  
  let sentenceLenPoints;
  if (avgSentenceLen >= 10 && avgSentenceLen <= 20) sentenceLenPoints = 20;
  else if (avgSentenceLen > 20 && avgSentenceLen <= 25) sentenceLenPoints = 15;
  else if (avgSentenceLen >= 5 && avgSentenceLen < 10) sentenceLenPoints = 12;
  else if (avgSentenceLen < 5) sentenceLenPoints = 10;
  else sentenceLenPoints = 5; // >25
  
  const readabilityPointsTotal = fleschPoints + sentenceLenPoints; // max 40
  
  // 2. Word Count Score (0-20)
  let wordCountPoints;
  if (wordCount >= 1500 && wordCount <= 3000) wordCountPoints = 20;
  else if (wordCount >= 800 && wordCount < 1500) wordCountPoints = 18;
  else if (wordCount >= 500 && wordCount < 800) wordCountPoints = 12;
  else if (wordCount >= 200 && wordCount < 500) wordCountPoints = 8;
  else if (wordCount < 200) wordCountPoints = 2;
  else wordCountPoints = 10; // >3000 penalty
  
  // 3. Reading Time Score (0-20)
  const readingTimeMinutes = Math.round((wordCount / 200) * 10) / 10;
  let readingTimePoints;
  if (readingTimeMinutes >= 4 && readingTimeMinutes <= 8) readingTimePoints = 20;
  else if (readingTimeMinutes >= 2 && readingTimeMinutes < 4) readingTimePoints = 15;
  else if (readingTimeMinutes > 8 && readingTimeMinutes <= 12) readingTimePoints = 12;
  else if (readingTimeMinutes < 2) readingTimePoints = 5;
  else readingTimePoints = 6; // >12
  
  // 4. Content Depth Score (0-20)
  const depthRatio = sentencesCount ? Math.round((wordCount / sentencesCount) * 100) / 100 : avgSentenceLen;
  let depthPoints;
  if (depthRatio >= 15 && depthRatio <= 25) depthPoints = 20;
  else if (depthRatio >= 12 && depthRatio < 15) depthPoints = 16;
  else if (depthRatio >= 9 && depthRatio < 12) depthPoints = 12;
  else if (depthRatio >= 6 && depthRatio < 9) depthPoints = 8;
  else if (depthRatio < 6) depthPoints = 4;
  else depthPoints = 12; // >25
  
  // NEW COMPOSITE SCORE (0-100)
  const newCompositeScore = readabilityPointsTotal + wordCountPoints + readingTimePoints + depthPoints;
  
  // --- LEGACY METRICS (for comparison) ---
  const headingStructurePoints = (headings.h1>0 ? 2 : 0) + (headings.h2>1 ? 2 : headings.h2>0 ? 1 : 0) + (headings.h3>0 ? 1 : 0);
  const textDensity = text.length / Math.max(htmlLength, 1);
  const textDensityPoints = textDensity >= 0.25 ? 4 : textDensity >= 0.15 ? 3 : textDensity >= 0.08 ? 2 : 1;
  const topicConsistencyPoints = topicFreq >= 5 ? 4 : topicFreq >= 2 ? 3 : topicFreq > 0 ? 2 : 1;
  const legacyDepthScore = (wordCount >= 2000 ? 7 : wordCount >= 1200 ? 6 : wordCount >= 800 ? 5 : wordCount >= 400 ? 4 : wordCount > 0 ? 2 : 0) + headingStructurePoints + textDensityPoints + topicConsistencyPoints;
  const passiveVoicePoints = passiveMatches === 0 ? 2 : passiveMatches <= 3 ? 1 : 0;
  const complexWordPoints = complexRatio <= 0.10 ? 2 : complexRatio <= 0.18 ? 1 : 0;
  const legacySentenceLenPoints = avgSentenceLen <= 18 ? 5 : avgSentenceLen <= 25 ? 4 : avgSentenceLen <= 35 ? 3 : avgSentenceLen <= 45 ? 2 : 1;
  const legacyReadabilityFormulaPoints = fleschScore >= 60 ? 6 : fleschScore >= 50 ? 5 : fleschScore >= 40 ? 4 : fleschScore >= 30 ? 3 : fleschScore >= 20 ? 2 : 1;
  const legacyReadabilityScore = legacySentenceLenPoints + legacyReadabilityFormulaPoints + passiveVoicePoints + complexWordPoints;
  const h1Quality = headings.h1 === 1 ? 4 : headings.h1 > 1 ? 2 : 0;
  let hierarchyPoints = 5; const presentLevels=[]; [1,2,3].forEach(l=>{ if($(`h${l}`).length) presentLevels.push(l); });
  for(let i=0;i<presentLevels.length-1;i++){ if(presentLevels[i+1]-presentLevels[i] > 1) hierarchyPoints = Math.max(2, hierarchyPoints-2); }
  const listUsage = lists.length > 0 ? (lists.length >= 2 ? 3 : 2) : 1;
  const sectioning = paragraphs.length >= 8 ? 3 : paragraphs.length >= 4 ? 2 : 1;
  const legacyStructureScore = h1Quality + hierarchyPoints + listUsage + sectioning;
  const meaningfulAltCount = images.filter(el => (el.attribs.alt || '').trim().length >= 5).length;
  const imageRelevance = images.length ? Math.min(4, Math.round((meaningfulAltCount/Math.max(1,images.length))*4)) : 2;
  const captionUsage = $('figcaption').length > 0 ? 2 : 1;
  const mediaCountPoints = (images.length + videos.length + tables.length) >= 3 ? 2 : 1;
  const mediaDiversity = (images.length>0)+(videos.length>0)+(tables.length>0) >= 2 ? 2 : 1;
  const legacyMediaScore = imageRelevance + captionUsage + mediaCountPoints + mediaDiversity;
  const wordsPerH2 = headings.h2>0 ? Math.round(wordCount / headings.h2) : wordCount;
  const subheadingFrequency = wordsPerH2 <= 300 ? 3 : wordsPerH2 <= 600 ? 2 : 1;
  const shortParagraphs = paragraphs.filter(el => ($(el).text().trim().split(/\s+/).length) <= 120).length;
  const paragraphLengthPoints = shortParagraphs / Math.max(1, paragraphs.length) >= 0.6 ? 3 : 2;
  const questionsPresent = /\?/g.test(text) ? 2 : 1;
  const ctaPresent = /(subscribe|sign up|learn more|contact|get started|try now)/i.test(text) ? 2 : 1;
  const legacyEngagementScore = subheadingFrequency + paragraphLengthPoints + questionsPresent + ctaPresent;
  const normalizedSentences = sentences.slice(0,400).map(s => s.trim().toLowerCase()).filter(s => s.length >= 40);
  const seen = new Map(); let duplicateCount = 0; normalizedSentences.forEach(s => { const c = seen.get(s)||0; if (c===1) duplicateCount++; seen.set(s, c+1); });
  const duplicateSentencePoints = duplicateCount === 0 ? 6 : duplicateCount <= 2 ? 4 : duplicateCount <= 5 ? 2 : 1;
  const keywordDensity = wordCount ? (topicFreq / wordCount) * 100 : 0;
  const keywordStuffingPenalty = (keywordDensity > 5) ? -2 : 0;
  const boilerplatePenalty = /(lorem ipsum|click here|terms and conditions)/i.test(text) ? -1 : 0;
  const legacyOriginalityScore = Math.max(0, duplicateSentencePoints + keywordStuffingPenalty + boilerplatePenalty);
  const earlyText = lowerText.slice(0, 600);
  const earlyKeywordPresence = primaryKeyword && earlyText.includes(primaryKeyword) ? 3 : 1;
  const keywordInHeaders = (() => { let c=0; $('h2,h3').each((i,el)=>{ const t=$(el).text().toLowerCase(); if (primaryKeyword && t.includes(primaryKeyword)) c++; }); return c>=2 ? 5 : c>=1 ? 3 : 1; })();
  const titleBodySimilarity = (() => { const titleWords = (rawTitle || '').split(/\s+/).filter(w=>w.length>3); const overlap = titleWords.filter(w => lowerText.includes(w.toLowerCase())).length; return overlap >= 8 ? 5 : overlap >= 4 ? 3 : overlap >= 2 ? 2 : 1; })();
  const topicDriftLow = /privacy policy|terms of service|cookie/i.test(text) ? 1 : 2;
  const legacyRelevanceScore = earlyKeywordPresence + keywordInHeaders + titleBodySimilarity + topicDriftLow;
  const legacyTotal = legacyDepthScore + legacyReadabilityScore + legacyStructureScore + legacyMediaScore + legacyEngagementScore + legacyOriginalityScore + legacyRelevanceScore;
  const legacyNormalized = Math.round(Math.min(100, Math.max(0, legacyTotal)));

  return { 
    score: newCompositeScore,
    metrics: {
      // NEW SCORING BREAKDOWN
      new_composite_score: newCompositeScore,
      readability_points_total: readabilityPointsTotal,
      readability_flesch_points: fleschPoints,
      readability_sentence_length_points: sentenceLenPoints,
      word_count_points: wordCountPoints,
      reading_time_points: readingTimePoints,
      content_depth_points: depthPoints,
      // RAW VALUES
      flesch_score: Math.round(fleschScore * 100) / 100,
      avg_sentence_length: avgSentenceLen,
      word_count: wordCount,
      reading_time_minutes: readingTimeMinutes,
      content_depth_ratio: depthRatio,
      keyword_frequency: topicFreq,
      duplicate_sentence_count: duplicateCount,
      complex_word_ratio: Math.round(complexRatio*100)/100,
      passive_voice_matches: passiveMatches,
      paragraph_count: paragraphs.length,
      h2_count: headings.h2,
      h3_count: headings.h3,
      // LEGACY (for comparison)
      legacy_score: legacyNormalized,
      legacy_depth_score: legacyDepthScore,
      legacy_readability_score: legacyReadabilityScore,
      legacy_structure_score: legacyStructureScore,
      legacy_media_score: legacyMediaScore,
      legacy_engagement_score: legacyEngagementScore,
      legacy_originality_score: legacyOriginalityScore,
      legacy_relevance_score: legacyRelevanceScore
    }
  };
}

export async function analyzeUrl(url, opts = { fast: true, llm: false }) {
  const cached = getCached(url, opts);
  if (cached) return { ...cached, cached: true };
  const fetchUrl = url.includes('//') ? url : `https://${url}`;
  const start = Date.now();
  const { html, res, elapsed } = await fetchHtml(fetchUrl);
  const dom = aggregateDom(html);
  const [performance, accessibility, seo, content] = await Promise.all([
    performanceModule(dom, res, elapsed),
    accessibilityModule(dom),
    seoModule(dom),
    contentModule(dom)
  ]);
  const finalScore = Math.round(0.28*performance.score + 0.20*accessibility.score + 0.32*seo.score + 0.20*content.score);
  const payload = { url: fetchUrl, final_score: finalScore, modules: { performance, accessibility, seo, content }, phase: opts.fast ? 'fast' : 'full', generated_ms: Date.now() - start };
  setCached(url, opts, payload);
  return payload;
}
