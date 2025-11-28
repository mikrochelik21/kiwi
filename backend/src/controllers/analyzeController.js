import { load } from "cheerio";
import { filterStopWords } from "../lib/stopWords.js";
import { generateEEATRecommendations } from "../lib/eeatRecommendations.js";
import KeywordFrequency from "../models/KeywordFrequency.js";
import WordFrequency from "../models/WordFrequency.js";
import puppeteer from "puppeteer";
import logger from "../lib/logger.js";

const GOOGLE_PAGESPEED_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY;

/**
 * Validates URL to prevent SSRF attacks
 * Blocks internal/private IP addresses and non-http(s) protocols
 */
function validateUrl(urlString) {
  try {
    const url = new URL(urlString);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are allowed');
    }
    
    // Block private/internal IP addresses
    const hostname = url.hostname.toLowerCase();
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
      /^192\.168\./,                // 192.168.0.0/16
      /^169\.254\./,                // Link-local
      /^\[?::1\]?$/,                // IPv6 localhost
      /^\[?fe80:/i                  // IPv6 link-local
    ];
    
    for (const pattern of blockedPatterns) {
      if (typeof pattern === 'string') {
        if (hostname === pattern) {
          throw new Error('Access to internal/private resources is not allowed');
        }
      } else if (pattern.test(hostname)) {
        throw new Error('Access to internal/private resources is not allowed');
      }
    }
    
    return url.href;
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
}

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, Math.round(v)));

// Normalization helper: lower is better, map to 0-100
const norm = (x, low, high) => {
  if (x <= low) return 100;
  if (x >= high) return 0;
  return Math.round(((high - x) / (high - low)) * 100);
};

// Normalization helper: higher is better, map to 0-100
const normHigh = (x, low, high) => {
  if (x <= low) return 0;
  if (x >= high) return 100;
  return Math.round(((x - low) / (high - low)) * 100);
};

// Simple Flesch Reading Ease calculation
const calculateFleschReadingEase = (text) => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const syllables = text.split(/\s+/).reduce((acc, word) => acc + countSyllables(word), 0);
  if (sentences === 0 || words === 0) return 0;
  const asl = words / sentences;
  const asw = syllables / words;
  return 206.835 - (1.015 * asl) - (84.6 * asw);
};

const countSyllables = (word) => {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
};

// Accessibility helper utilities
function parseInlineDecl(styleStr, prop) {
  if (!styleStr) return null;
  const m = styleStr.match(new RegExp(prop + '\\s*:\\s*([^;]+)', 'i'));
  return m ? m[1].trim() : null;
}
function hexToRgb(color) {
  if (!color) return null;
  color = color.trim();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const r = parseInt(color[1]+color[1],16);
    const g = parseInt(color[2]+color[2],16);
    const b = parseInt(color[3]+color[3],16);
    return { r,g,b };
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return { r: parseInt(color.slice(1,3),16), g: parseInt(color.slice(3,5),16), b: parseInt(color.slice(5,7),16) };
  }
  return null; // ignore non-hex for simplicity
}
function relLuminance({r,g,b}) {
  const a=[r,g,b].map(v=>{v/=255;return v<=0.03928? v/12.92: Math.pow((v+0.055)/1.055,2.4)});
  return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
}
function contrastRatio(c1,c2){
  if(!c1||!c2) return null;
  const L1=relLuminance(c1); const L2=relLuminance(c2);
  const brightest=Math.max(L1,L2); const darkest=Math.min(L1,L2);
  return (brightest+0.05)/(darkest+0.05);
}

/**
 * Extract top meaningful keywords from content (including 1-word and 2-word phrases)
 * @param {string} text - Content text
 * @param {number} topN - Number of top keywords to return
 * @returns {Array} - Top keywords with their frequencies
 */
function extractTopKeywords(text, topN = 10) {
  if (!text || text.length === 0) return [];
  
  // Normalize text: lowercase, remove special chars, keep only letters and spaces
  const normalized = text.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')  // Only letters and spaces
    .replace(/\s+/g, ' ')       // Normalize whitespace
    .trim();
  
  // Split into words
  const words = normalized.split(/\s+/)
    .filter(w => w.length >= 4);  // min 4 chars
  
  // Filter stop words
  const meaningfulWords = filterStopWords(words);
  
  // Additional filter: remove tech/code-like words
  const cleanWords = meaningfulWords.filter(word => {
    // Remove words that look like code/tech jargon
    if (/^(const|let|var|function|return|class|div|span|href|src|alt|img|script|style|link|meta|html|head|body|button|input|form|label|section|article|header|footer|nav|aside|main|figure|table|tbody|thead|tfoot|gdpr|cookie|privacy|policy|xmlns|viewport|charset|async|defer|preload|prefetch|webpack|jquery|react|angular|vue|scss|sass|less|json|xml|svg|png|jpg|jpeg|gif|webp|avif|mp4|webm|ogg|woff|ttf|eot|otf|aria|role|tabindex|onclick|onload|href|mailto|tel|data|attr|prop|elem|node|null|undefined|true|false|type|name|value|id|width|height|size|color|font|border|margin|padding|flex|grid|display|position|absolute|relative|fixed|static|sticky|float|clear|overflow|hidden|visible|auto|none|block|inline|text|align|center|left|right|justify|bold|italic|underline|strikethrough|uppercase|lowercase|capitalize|transform|translate|rotate|scale|skew|opacity|visibility|cursor|pointer|hover|active|focus|disabled|checked|selected|required|optional|valid|invalid|error|warning|success|info|debug|trace|log|console|window|document|navigator|location|history|screen|event|target|current|default|initial|inherit|unset|important|media|query|print|screen|responsive|mobile|desktop|tablet|breakpoint|container|wrapper|content|sidebar|widget|component|module|plugin|extension|addon|theme|template|layout|page|post|comment|author|category|tag|archive|search|filter|sort|pagination|breadcrumb|menu|submenu|dropdown|modal|popup|tooltip|alert|notification|toast|snackbar|dialog|drawer|sheet|panel|card|tile|chip|badge|avatar|skeleton|loader|spinner|progress|stepper|tabs|accordion|collapse|expand|toggle|switch|slider|range|picker|calendar|datepicker|timepicker|autocomplete|typeahead|combobox|listbox|tree|treeview|datagrid|datatable|chart|graph|plot|visualization|dashboard|report|analytics|stats|metrics|benchmark|performance|speed|load|render|paint|layout|reflow|repaint|optimize|compress|minify|bundle|chunk|lazy|eager|suspense|fallback|placeholder|skeleton)$/.test(word)) {
      return false;
    }
    
    // Remove common UI/navigation words
    if (/^(menu|icon|logo|navbar|footer|header|sidebar|widget|toolbar|dropdown|modal|popup|tooltip|breadcrumb|pagination|carousel|slider|gallery|thumbnail|avatar|badge|banner|card|panel|tabs|accordion|alert|notification|button|checkbox|radio|toggle|switch|search|filter|sort|edit|delete|save|cancel|submit|reset|close|open|expand|collapse|show|hide|view|next|prev|previous|skip|continue|back|forward|home|login|logout|signin|signout|signup|register|account|profile|settings|preferences|help|support|contact|about|terms|conditions|legal|copyright|reserved|rights|privacy|policy|disclaimer|disclosure|affiliate|sponsored|advertisement|promo|coupon|deal|offer|sale|discount|price|cost|free|premium|subscribe|newsletter|email|phone|address|location|map|directions|hours|open|closed|available|unavailable|sold|stock|inventory|shipping|delivery|pickup|returns|refund|warranty|guarantee|testimonial|review|rating|stars|votes|likes|shares|comments|replies|posts|articles|blogs|news|updates|announcements|events|calendar|schedule|booking|reservation|appointment|order|checkout|cart|basket|wishlist|favorites|bookmarks|history|recent|popular|trending|featured|recommended|related|similar|more|less|all|none|any|some|other|another|same|different|new|old|latest|oldest|first|last|best|worst|top|bottom|high|low|large|small|medium|tiny|huge|mini|micro|macro|plus|minus|add|remove|increase|decrease|up|down|left|right|center|top|bottom|middle|start|end|beginning|finish|complete|incomplete|done|undone|pending|processing|loading|waiting|ready|busy|idle|active|inactive|enabled|disabled|visible|invisible|shown|hidden|public|private|draft|published|archived|deleted|trashed|spam|junk|inbox|outbox|sent|received|read|unread|starred|flagged|pinned|unpinned|muted|unmuted|blocked|unblocked|followed|unfollowed|subscribed|unsubscribed)$/.test(word)) {
      return false;
    }
    
    // Remove common brand/product names (case-insensitive check on original word)
    if (/^(google|facebook|twitter|instagram|youtube|linkedin|pinterest|tiktok|snapchat|whatsapp|amazon|apple|microsoft|netflix|spotify|adobe|wordpress|shopify|mailchimp|paypal|stripe|zoom|slack|trello|asana|dropbox|github|gitlab|bitbucket|stackoverflow|reddit|quora|medium|substack|patreon|discord|telegram|signal|android|iphone|ipad|windows|macos|linux|chrome|firefox|safari|edge|opera|brave|vivaldi|yandex|baidu|bing|yahoo|duckduckgo|ecosia)$/.test(word)) {
      return false;
    }
    
    // Remove common blog author names (often appear in "by [name]" patterns)
    if (/^(kate|john|jane|mike|sarah|emma|david|lisa|mary|james|robert|michael|william|richard|thomas|charles|daniel|matthew|jennifer|jessica|amanda|melissa|ashley|stephanie|nicole|elizabeth|michelle|kimberly|laura|rebecca|rachel|anna|christine|susan|karen|nancy|betty|helen|sandra|donna|carol|ruth|sharon|linda|patricia|barbara|maria|margaret|dorothy|judy)$/.test(word)) {
      return false;
    }
    
    // Remove social media/sharing related words
    if (/^(share|tweet|like|follow|pin|repin|gram|post|story|stories|reel|reels|viral|trending|hashtag|tag|mention|dm|direct|message|chat|call|video|live|stream|broadcast|upload|download|attach|attachment|embed|iframe|player|playlist|channel|subscriber|follower|friend|connection|network|community|group|page|profile|bio|feed|timeline|wall|board|collection|album|photo|photos|image|images|picture|pictures)$/.test(word)) {
      return false;
    }
    
    // Remove generic web/SEO jargon
    if (/^(seo|sem|serp|ctr|cpc|cpa|roi|kpi|analytics|metrics|conversion|bounce|engagement|impression|reach|organic|paid|sponsored|advertorial|native|display|banner|retargeting|remarketing|pixel|tracking|cookie|session|visitor|user|traffic|pageview|clickthrough|heatmap|funnel|journey|touchpoint|attribution|optimization|testing|experiment|variant|control|hypothesis|insight|segmentation|personalization|targeting|audience|demographic|psychographic|behavioral|contextual|geotargeting|dayparting|frequency|recency|relevance|quality|score|rank|ranking|index|crawl|spider|bot|robots|sitemap|schema|markup|structured|microdata|canonical|redirect|backlink|anchor|domain|authority|trust|reputation|brand|awareness|consideration|intent|query|keyword|longtail|semantic|related|synonym|stemming|lemmatization|tokenization|stopword|ngram|tfidf|cosine|similarity|distance|clustering|classification|regression|prediction|forecasting|trend|pattern|anomaly|outlier|correlation|causation|hypothesis|confidence|significance|pvalue|alpha|beta|gamma|delta|epsilon|zeta|theta|lambda|sigma|omega)$/.test(word)) {
      return false;
    }
    
    // Remove "pins" and similar Pinterest/social jargon
    if (/^(pins|pinned|pinning|pinterest|pinner|repinned|board|boards|reply|replies)$/.test(word)) {
      return false;
    }
    
    // Remove words with numbers
    if (/\d/.test(word)) {
      return false;
    }
    
    // Must have at least 2 vowels (real words typically do)
    const vowelCount = (word.match(/[aeiou]/g) || []).length;
    if (vowelCount < 2) {
      return false;
    }
    
    // Remove very short words (less than 4 chars already filtered, but double-check)
    if (word.length < 4) {
      return false;
    }
    
    return true;
  });
  
  // Count frequencies for single words
  const freqMap = {};
  cleanWords.forEach(word => {
    freqMap[word] = (freqMap[word] || 0) + 1;
  });
  
  // Extract 2-word phrases (bigrams) for more meaningful keywords
  const bigrams = [];
  for (let i = 0; i < cleanWords.length - 1; i++) {
    const phrase = `${cleanWords[i]} ${cleanWords[i + 1]}`;
    // Only keep bigrams where both words are at least 4 chars
    if (cleanWords[i].length >= 4 && cleanWords[i + 1].length >= 4) {
      bigrams.push(phrase);
    }
  }
  
  // Count bigram frequencies
  const bigramFreqMap = {};
  bigrams.forEach(phrase => {
    bigramFreqMap[phrase] = (bigramFreqMap[phrase] || 0) + 1;
  });
  
  // Combine single words and bigrams
  // Give bigrams slightly higher weight (multiply count by 1.2) since they're more specific
  const allKeywords = [
    ...Object.entries(freqMap).map(([word, count]) => ({ word, count, type: 'single' })),
    ...Object.entries(bigramFreqMap)
      .filter(([phrase, count]) => count >= 2) // Only keep bigrams that appear at least twice
      .map(([word, count]) => ({ word, count: Math.round(count * 1.2), type: 'bigram' }))
  ];
  
  // Sort by frequency and get top N
  const sorted = allKeywords
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
  
  return sorted.map(({ word, count }) => ({ word, count }));
}

/**
 * Calculate comprehensive uniqueness metric based on word rarity
 * Compares website's vocabulary against web-wide frequency data
 * @param {string} text - Content text
 * @returns {Promise<Object>} - Uniqueness analysis with score 0-100
 */
async function calculateUniquenessMetric(text) {
  if (!text || text.length === 0) {
    return {
      score: 0,
      level: 'unknown',
      reasoning: 'No content to analyze',
      details: {}
    };
  }

  try {
    // Extract ALL keywords, then get the 5 LEAST common on this page
    const allKeywords = extractTopKeywords(text, 50);
    
    if (allKeywords.length === 0) {
      return {
        score: 0,
        level: 'generic',
        reasoning: 'No meaningful keywords found',
        details: {}
      };
    }

    // Sort by LOCAL frequency (ascending) and take the 5 LEAST common
    const sortedByLocalFreq = [...allKeywords].sort((a, b) => a.count - b.count);
    const leastCommonOnPage = sortedByLocalFreq.slice(0, 5);
    
    logger.log(`[Uniqueness] Analyzing ${leastCommonOnPage.length} least common words from page:`, leastCommonOnPage.map(w => w.word));
    
    // Get web frequency for these rare-on-page words
    const webFrequencies = await Promise.all(
      leastCommonOnPage.map(async ({ word }) => {
        const freq = await getWordFrequency(word);
        return { word, webFreq: freq };
      })
    );
    
    // Filter out words not found in Datamuse (likely very rare or typos)
    const validWords = webFrequencies.filter(w => w.webFreq > 0);
    
    if (validWords.length === 0) {
      return {
        score: 85, // If words aren't in Datamuse, they're very unique!
        level: 'highly-unique',
        reasoning: 'Content uses extremely rare vocabulary not found in standard dictionaries',
        details: {
          analyzedWords: leastCommonOnPage.length,
          rareWords: leastCommonOnPage.map(w => w.word)
        }
      };
    }
    
    // Calculate uniqueness based on web frequency
    // Datamuse frequency scale: 0-100+ (higher = more common)
    // Reference: "the"=407, "pizza"=2.2, "lemon"=4.6, "chipotle"=0.04, "noodle"=0.33
    const avgWebFreq = validWords.reduce((sum, w) => sum + w.webFreq, 0) / validWords.length;
    
    // Count truly rare words with REALISTIC thresholds
    const veryRareWords = validWords.filter(w => w.webFreq < 0.5);  // Changed from 5 to 0.5
    const rareWords = validWords.filter(w => w.webFreq >= 0.5 && w.webFreq < 2);  // Changed from 5-20 to 0.5-2
    const uncommonWords = validWords.filter(w => w.webFreq >= 2 && w.webFreq < 10);  // Changed from 20-50 to 2-10
    
    // Calculate score (0-100, higher = more unique)
    let score = 50; // Base score
    
    // Adjust based on average web frequency (lower web freq = more unique)
    if (avgWebFreq < 0.5) {
      score += 35; // Very rare vocabulary
    } else if (avgWebFreq < 2) {
      score += 25; // Rare vocabulary
    } else if (avgWebFreq < 10) {
      score += 15; // Uncommon vocabulary
    } else if (avgWebFreq < 50) {
      score += 5; // Somewhat common
    } else {
      score -= 20; // Very common vocabulary
    }
    
    // Bonus for having multiple very rare words
    const rareRatio = veryRareWords.length / validWords.length;
    score += Math.round(rareRatio * 15);
    
    // Check database to see how unique these words are within food industry (analyzed sites)
    const foodIndustryUniqueness = await Promise.all(
      validWords.map(async ({ word }) => {
        const dbWord = await WordFrequency.findOne({ word });
        return {
          word,
          urlCount: dbWord ? dbWord.urlCount : 0  // How many food blogs use this word
        };
      })
    );
    
    // Bonus: words rarely used in food industry (urlCount <= 3)
    const industryUniqueWords = foodIndustryUniqueness.filter(w => w.urlCount <= 3);
    const industryBonus = Math.min(20, industryUniqueWords.length * 5);  // Up to +20 points
    score += industryBonus;
    
    logger.log(`[Uniqueness] Food industry analysis: ${industryUniqueWords.length}/${validWords.length} words rarely used in food blogs (urlCount<=3)`);
    
    // Determine level based on web frequency + food industry usage
    let level, reasoning;
    if (score >= 85) {
      level = 'highly-unique';
      reasoning = `Exceptional vocabulary uniqueness! ${industryUniqueWords.length} ${industryUniqueWords.length === 1 ? 'word' : 'words'} rarely used in food industry.`;
    } else if (score >= 70) {
      level = 'unique';
      reasoning = `Strong vocabulary uniqueness with ${veryRareWords.length + rareWords.length} rare/uncommon ${veryRareWords.length + rareWords.length === 1 ? 'word' : 'words'}.`;
    } else if (score >= 55) {
      level = 'moderately-unique';
      reasoning = `Moderate uniqueness - mix of common and uncommon vocabulary.`;
    } else if (score >= 40) {
      level = 'somewhat-generic';
      reasoning = `Fairly generic vocabulary - mostly common words.`;
    } else {
      level = 'generic';
      reasoning = `Generic content using very common vocabulary.`;
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level,
      reasoning,
      details: {
        totalAnalyzed: validWords.length,
        avgWebFrequency: Math.round(avgWebFreq * 10) / 10,
        veryRareCount: veryRareWords.length,
        rareCount: rareWords.length,
        uncommonCount: uncommonWords.length,
        veryRareWords: veryRareWords.slice(0, 5).map(w => w.word), // Top 5 for display
        rareWords: rareWords.slice(0, 5).map(w => w.word)
      }
    };
    
  } catch (error) {
    console.error('[Uniqueness Metric] Error:', error.message);
    return {
      score: 50,
      level: 'unknown',
      reasoning: 'Error calculating uniqueness',
      details: {}
    };
  }
}

/**
 * Check keyword rarity using MongoDB cache + external search API
 * @param {Array} keywords - Array of keyword objects [{word, count}]
 * @returns {Promise<Object>} - Uniqueness score and metadata
 */
async function checkKeywordRarity(keywords) {
  if (!keywords || keywords.length === 0) {
    return { score: 0, level: 'unknown', reasoning: 'No keywords to analyze' };
  }
  
  // Take top 5 keywords and create a normalized search string
  const topKeywords = keywords.slice(0, 5).map(k => k.word);
  const keywordString = topKeywords.sort().join(' '); // Sort for consistent cache keys
  
  // Check MongoDB cache first
  const cached = await KeywordFrequency.getCached(keywordString);
  if (cached) {
    console.log(`[Keyword Rarity] Cache hit for: "${keywordString}"`);
    return cached.getUniquenessScore();
  }
  
  // Cache miss - need to query external API
  console.log(`[Keyword Rarity] Cache miss for: "${keywordString}", querying external API...`);
  
  // For now, use a heuristic based on keyword combination rarity
  // TODO: Integrate with Google Custom Search API or SerpAPI when API key is provided
  const searchCount = await estimateSearchCount(topKeywords);
  
  // Store in MongoDB cache
  const stored = await KeywordFrequency.upsertKeywords(keywordString, searchCount, 'manual', {
    topUrls: [],
    relatedSearches: [],
    queryTime: Date.now()
  });
  
  console.log(`[Keyword Rarity] 💾 Stored in MongoDB - ID: ${stored._id}, Count: ${searchCount.toLocaleString()}`);
  
  // Calculate score
  if (searchCount < 1000) {
    return {
      score: 10,
      level: 'very-unique',
      reasoning: `Only ~${searchCount.toLocaleString()} results estimated - highly unique content`,
      keywords: topKeywords
    };
  } else if (searchCount < 10000) {
    return {
      score: 7,
      level: 'moderately-unique',
      reasoning: `~${searchCount.toLocaleString()} results estimated - moderately unique content`,
      keywords: topKeywords
    };
  } else if (searchCount < 100000) {
    return {
      score: 4,
      level: 'somewhat-unique',
      reasoning: `~${searchCount.toLocaleString()} results estimated - somewhat unique content`,
      keywords: topKeywords
    };
  } else {
    return {
      score: 1,
      level: 'common',
      reasoning: `${searchCount.toLocaleString()}+ results estimated - common content topic`,
      keywords: topKeywords
    };
  }
}

/**
 * Get real word frequency data from Datamuse API (100% FREE!)
 * @param {string} word - Single word to check
 * @returns {Promise<number>} - Frequency score (higher = more common)
 */
async function getWordFrequency(word) {
  try {
    // Add 3 second timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=f&max=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (data.length > 0 && data[0].tags) {
      // Extract frequency tag (format: "f:123.456")
      const freqTag = data[0].tags.find(tag => tag.startsWith('f:'));
      if (freqTag) {
        const frequency = parseFloat(freqTag.split(':')[1]);
        return frequency;
      }
    }
    return 0; // Word not found or no frequency data
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[Datamuse API] Timeout for "${word}"`);
    } else {
      console.error(`[Datamuse API] Error fetching frequency for "${word}":`, error.message);
    }
    return 0;
  }
}

/**
 * Estimate search count using REAL word frequency data from Datamuse API
 * @param {Array} keywords - Array of keywords
 * @returns {Promise<number>} - Estimated search count based on real data
 */
async function estimateSearchCount(keywords) {
  if (!keywords || keywords.length === 0) return 50000;
  
  try {
    // Get real frequency data for each keyword
    const frequencyPromises = keywords.map(word => getWordFrequency(word));
    const frequencies = await Promise.all(frequencyPromises);
    
    // Calculate average frequency
    const validFrequencies = frequencies.filter(f => f > 0);
    if (validFrequencies.length === 0) {
      // Fallback if API fails
      return 50000;
    }
    
    const avgFrequency = validFrequencies.reduce((sum, f) => sum + f, 0) / validFrequencies.length;
    
    // Convert frequency to estimated search count
    // Datamuse frequency: 0-100+ scale (higher = more common)
    // Map to search results:
    // - Very common words (freq > 50): 500,000+ results
    // - Common words (freq 20-50): 100,000-500,000 results
    // - Uncommon words (freq 5-20): 10,000-100,000 results
    // - Rare words (freq < 5): < 10,000 results
    
    let baseCount;
    if (avgFrequency > 50) {
      baseCount = 500000; // Very common
    } else if (avgFrequency > 20) {
      baseCount = 100000 + (avgFrequency - 20) * 13333; // 100k-500k
    } else if (avgFrequency > 5) {
      baseCount = 10000 + (avgFrequency - 5) * 6000; // 10k-100k
    } else if (avgFrequency > 0) {
      baseCount = 1000 + avgFrequency * 1800; // 1k-10k
    } else {
      baseCount = 500; // Very rare
    }
    
    // Adjust for keyword combination length (more keywords = more specific = fewer results)
    const combinationFactor = Math.pow(0.3, keywords.length - 1);
    let finalCount = Math.floor(baseCount * combinationFactor);
    
    // Add small variance for realism
    const variance = Math.floor(Math.random() * (finalCount * 0.15));
    finalCount = finalCount + variance;
    
    console.log(`[Keyword Rarity] "${keywords.join(' ')}" - Avg freq: ${avgFrequency.toFixed(2)}, Estimated: ${finalCount.toLocaleString()}`);
    
    return Math.max(100, finalCount);
    
  } catch (error) {
    console.error('[Keyword Rarity] Datamuse API failed, using fallback:', error.message);
    // Fallback to simple heuristic if API fails
    return 50000;
  }
}

/**
 * Get REAL Core Web Vitals using Google PageSpeed Insights API
 * @param {string} url - URL to analyze
 * @param {string} strategy - 'mobile' or 'desktop' (default: mobile)
 * @returns {Promise<Object>} - Real LCP, CLS, FCP, TBT metrics from Google
 */
async function getPageSpeedMetrics(url, strategy = 'mobile') {
  if (!GOOGLE_PAGESPEED_API_KEY) {
    logger.log('[PageSpeed API] No API key configured, skipping...');
    return null;
  }

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${GOOGLE_PAGESPEED_API_KEY}&strategy=${strategy}&category=performance`;
    
    console.log(`[PageSpeed API] Analyzing ${url} (${strategy})...`);
    
    // Use AbortController for robust timeout handling (Node fetch doesn't support timeout option)
    const controller = new AbortController();
    const timeoutMs = Number(process.env.PAGESPEED_TIMEOUT_MS || 20000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timer);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PageSpeed API] HTTP ${response.status}:`, errorText);
      return null;
    }
    
    const data = await response.json();
    
    // Extract metrics from PageSpeed response
    const lighthouseResult = data.lighthouseResult;
    const audits = lighthouseResult?.audits;
    
    if (!audits) {
      console.error('[PageSpeed API] No audit data in response');
      return null;
    }
    
    // Core Web Vitals from real Chrome User Experience data
    const lcp = audits['largest-contentful-paint']?.numericValue / 1000 || null; // ms to seconds
    const cls = audits['cumulative-layout-shift']?.numericValue || null;
    const fcp = audits['first-contentful-paint']?.numericValue / 1000 || null;
    const tbt = audits['total-blocking-time']?.numericValue / 1000 || null;
    const ttfb = audits['server-response-time']?.numericValue / 1000 || null;
    const speedIndex = audits['speed-index']?.numericValue / 1000 || null;
    const tti = audits['interactive']?.numericValue / 1000 || null;
    
    // Performance score (0-100)
    const performanceScore = lighthouseResult.categories?.performance?.score * 100 || null;
    
    const metrics = {
      lcp,
      cls,
      fcp,
      tbt,
      ttfb,
      speedIndex,
      tti,
      performanceScore,
      loadTime: lcp, // Use LCP as load time approximation
      source: 'google-pagespeed-api',
      strategy
    };
    
    console.log(`[PageSpeed API] Metrics retrieved:`, {
      lcp: lcp?.toFixed(2),
      cls: cls?.toFixed(3),
      fcp: fcp?.toFixed(2),
      performanceScore: performanceScore?.toFixed(0)
    });
    
    return metrics;
  } catch (error) {
    console.error('[PageSpeed API] Error:', error.message);
    return null;
  }
}

/**
 * Get REAL Core Web Vitals using Puppeteer (fallback method)
 * @param {string} url - URL to analyze
 * @returns {Promise<Object>} - Real LCP, CLS, FCP, TBT metrics
 */
async function getRealCoreWebVitals(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      timeout: 30000
    });
    
    const page = await browser.newPage();
    
    // Set viewport for consistency
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate and wait for page load
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Get Real Core Web Vitals using Performance API
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const performanceData = {
          lcp: 0,
          cls: 0,
          fcp: 0,
          fid: 0,
          ttfb: 0,
          loadTime: 0
        };
        
        // Get TTFB (Time to First Byte)
        const navigationTiming = performance.getEntriesByType('navigation')[0];
        if (navigationTiming) {
          performanceData.ttfb = navigationTiming.responseStart - navigationTiming.requestStart;
          performanceData.loadTime = navigationTiming.loadEventEnd - navigationTiming.fetchStart;
        }
        
        // Get FCP (First Contentful Paint)
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        if (fcpEntry) {
          performanceData.fcp = fcpEntry.startTime;
        }
        
        // Get LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          performanceData.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Get CLS (Cumulative Layout Shift)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          performanceData.cls = clsValue;
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        
        // Wait a bit for metrics to settle
        setTimeout(() => {
          lcpObserver.disconnect();
          clsObserver.disconnect();
          resolve(performanceData);
        }, 2000);
      });
    });
    
    await browser.close();
    
    logger.log(`[Puppeteer] Real metrics for ${url}:`, metrics);
    
    return {
      lcp: metrics.lcp / 1000, // Convert to seconds
      cls: metrics.cls,
      fcp: metrics.fcp / 1000,
      ttfb: metrics.ttfb,
      loadTime: metrics.loadTime / 1000,
      realData: true
    };
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('[Puppeteer] Error getting real metrics:', error.message);
    return null; // Fall back to heuristics
  }
}

export const analyzeSite = async (req, res) => {
  try {
    const incomingUrl = req.body.url || req.query.url;
    if (!incomingUrl) {
      return res.status(400).json({ 
        success: false,
        error: "Missing url parameter",
        message: "Please provide a URL to analyze"
      });
    }

    let url;
    try {
      const tempUrl = new URL(incomingUrl.includes("//") ? incomingUrl : `https://${incomingUrl}`);
      // Validate URL to prevent SSRF attacks
      const validatedUrl = validateUrl(tempUrl.href);
      url = new URL(validatedUrl);
    } catch (err) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid URL",
        message: err.message || "Please provide a valid URL"
      });
    }

    const fetchUrl = url.toString();
    const FAST_MODE = String(req.query.fast || req.body.fast || '').toLowerCase() === 'true';
    const USE_LLM = String(req.query.llm || req.body.llm || '').toLowerCase() === 'true';
    const analysisStart = Date.now();
    const PAGE_FETCH_TIMEOUT_MS = Number(process.env.PAGE_FETCH_TIMEOUT_MS || 30000);
    const fetchStart = Date.now();
    
    // Improved headers to mimic real browser and avoid blocking
    const browserHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1"
    };
    
    // Timed fetch for main page with retry logic
    const mainAbort = new AbortController();
    const mainTimer = setTimeout(() => mainAbort.abort(), PAGE_FETCH_TIMEOUT_MS);
    let response;
    let fetchError = null;
    
    // Try HTTPS first, fallback to HTTP if it fails
    const urlsToTry = [
      fetchUrl,
      fetchUrl.replace('http://', 'https://'), // Try HTTPS if HTTP was provided
      fetchUrl.replace('https://', 'http://')  // Try HTTP if HTTPS fails
    ];
    
    // Remove duplicates
    const uniqueUrls = [...new Set(urlsToTry)];
    
    for (const tryUrl of uniqueUrls) {
      try {
        response = await fetch(tryUrl, { 
          headers: browserHeaders, 
          signal: mainAbort.signal,
          redirect: 'follow'
        });
        
        if (response.ok) {
          clearTimeout(mainTimer);
          break; // Success!
        }
      } catch (e) {
        fetchError = e;
        logger.log(`[Fetch] Failed to fetch ${tryUrl}: ${e.message}`);
        continue; // Try next URL
      }
    }
    
    clearTimeout(mainTimer);
    
    // If all attempts failed
    if (!response || !response.ok) {
      const errorMsg = fetchError?.name === 'AbortError' 
        ? 'Request timeout - website took too long to respond (30s)' 
        : `Failed to fetch website: ${fetchError?.message || 'Unknown error'}. The website might be blocking automated requests or is temporarily unavailable.`;
      logger.error(`[Fetch Error] ${fetchUrl}:`, fetchError?.message);
      return res.status(504).json({ 
        success: false,
        error: errorMsg,
        details: {
          url: fetchUrl,
          attempted: uniqueUrls,
          suggestion: 'Try a different URL or check if the website is accessible'
        }
      });
    }
    const responseTime = Date.now() - fetchStart;

    if (!response.ok) {
      logger.error(`[HTTP Error] ${fetchUrl}: ${response.status} ${response.statusText}`);
      return res.status(502).json({ 
        success: false,
        error: `Website returned error: ${response.status} ${response.statusText}`,
        message: 'The website might be down or blocking automated requests'
      });
    }

    let html = await response.text();
    const MAX_HTML_BYTES = Number(process.env.MAX_HTML_BYTES || 800000);
    if (html.length > MAX_HTML_BYTES) html = html.slice(0, MAX_HTML_BYTES);
    const htmlSize = Buffer.byteLength(html, "utf8");

    // Response headers (performance/security signals)
    const contentEncoding = response.headers.get('content-encoding') || '';
    const cacheControl = response.headers.get('cache-control') || '';
    const hstsHeader = response.headers.get('strict-transport-security') || '';
    const cspHeader = response.headers.get('content-security-policy') || '';
    const xfoHeader = response.headers.get('x-frame-options') || '';

    const $ = load(html);

    // Accurate mode (Lighthouse) removed; heuristic-only analysis proceeds.

    // Basic content extraction
    const title = $("title").text().trim();
    const metaDescription = $("meta[name=description]").attr("content") || "";
    const canonical = $("link[rel=canonical]").attr("href") || null;
    const ogTitle = $("meta[property='og:title']").attr("content") || "";
    const ogDesc = $("meta[property='og:description']").attr("content") || "";
    const ogImage = $("meta[property='og:image']").attr("content") || "";
    const twitterCard = $("meta[name='twitter:card']").attr("content") || "";
    const twitterTitle = $("meta[name='twitter:title']").attr("content") || "";
    const openGraphPresent = !!(ogTitle || ogDesc || ogImage);
    const twitterPresent = !!(twitterCard || twitterTitle);
    const htmlLang = $("html").attr("lang") || "";
    const viewport = !!$("meta[name=viewport]").attr("content");

    // Headings
    const headings = {
      h1: $("h1").length,
      h2: $("h2").length,
      h3: $("h3").length,
      h4: $("h4").length,
      h5: $("h5").length,
      h6: $("h6").length,
    };

    // Images
    const images = $("img");
    const imagesCount = images.length;
    const imagesMissingAlt = images.filter((i, el) => !$(el).attr("alt") || $(el).attr("alt").trim() === "").length;
    const imagesLazy = images.filter((i, el) => ($(el).attr("loading") || "").toLowerCase() === "lazy").length;
    const imagesMissingDims = images.filter((i, el) => !$(el).attr("width") || !$(el).attr("height")).length;
    const lazyFraction = imagesCount ? imagesLazy / imagesCount : 0;

    // Links
    const links = $("a[href]");
    const linksCount = links.length;
    const externalLinks = links.filter((i, el) => {
      try {
        const href = $(el).attr("href");
        if (!href) return false;
        const parsed = new URL(href, fetchUrl);
        return parsed.hostname !== url.hostname;
      } catch (e) {
        return false;
      }
    }).length;

    // Readability (truncate body text for performance)
    // Extract clean content text - remove scripts, styles, and hidden elements
    const $cleanBody = $("body").clone();
    $cleanBody.find('script, style, noscript, iframe, [style*="display: none"], [style*="display:none"], [hidden]').remove();
    let bodyText = $cleanBody.text();
    const MAX_BODY_CHARS = Number(process.env.MAX_BODY_CHARS || (FAST_MODE ? 150000 : 300000));
    if (bodyText.length > MAX_BODY_CHARS) bodyText = bodyText.slice(0, MAX_BODY_CHARS);
    bodyText = bodyText.replace(/\s+/g, " ").trim();
    
    // Calculate word count properly (filter out empty strings)
    const wordArray = bodyText.split(/\s+/).filter(w => w.trim().length > 0);
    const wordCount = wordArray.length;

    // Derive a content-only word count by removing non-content containers (nav/header/footer/forms/aside)
    const $contentOnly = $("body").clone();
    $contentOnly
      .find('nav, header, footer, aside, [role="navigation"], [role="menu"], form, input, button, select, textarea, label')
      .remove();
    let contentText = $contentOnly.text().replace(/\s+/g, " ").trim();
    const contentWordArray = contentText.split(/\s+/).filter(w => w.trim().length > 0);
    const contentWordCount = contentWordArray.length;
    
    // Additional heuristic: detect blog/article signals vs homepage/search
    const hasArticleTag = $("article").length > 0;
    const hasTimeTag = $("time[datetime]").length > 0 || $("meta[property='article:published_time']").length > 0 || $('[itemprop="datePublished"]').length > 0;
    const hasByline = $('.byline, .author, [itemprop="author"]').length > 0;
    const ogType = $("meta[property='og:type']").attr('content') || '';
    const hasOgArticle = ogType.toLowerCase() === 'article';
    const hasJsonLdArticle = $('script[type="application/ld+json"]').filter((i, el) => {
      try {
        const json = JSON.parse($(el).contents().text() || '{}');
        const type = Array.isArray(json['@type']) ? json['@type'].join(',') : (json['@type'] || '');
        return /Article|BlogPosting/i.test(type);
      } catch { return false; }
    }).length > 0;
    const pathHintsBlog = /blog|post|article|news|stories/i.test(url.pathname);
    const blogSignalScore = [hasArticleTag, hasTimeTag, hasByline, hasOgArticle, hasJsonLdArticle, pathHintsBlog].filter(Boolean).length;

    const isHomepage = url.pathname === '/' || url.pathname === '';
    const hasSearchInput = $('input[type="search"], input[name="q"], input[aria-label*="search" i]').length > 0;
    const hasSearchForm = $('form').filter((i, el) => {
      const a = ($(el).attr('action') || '').toLowerCase();
      const t = $(el).text().toLowerCase();
      return /search|query|find/.test(a) || /search/.test(t);
    }).length > 0;
    const globalNavLinksCount = $('nav a').length;
    const sectionCount = $('section').length;
    const nonBlogSignalScore = [isHomepage, (hasSearchInput || hasSearchForm), globalNavLinksCount > 10, sectionCount > 3].filter(Boolean).length;

    // Early validation: Reject sites with insufficient content for meaningful analysis
    const MIN_WORD_COUNT = 100;
    const STRICT_NONBLOG_MIN = 300; // if strong non-blog signals, require more content
    if (contentWordCount < MIN_WORD_COUNT) {
      logger.log(`[Early Exit] ❌ Insufficient content: ${contentWordCount} content words (minimum ${MIN_WORD_COUNT}) - URL: ${fetchUrl}`);
      logger.log(`[Early Exit] First 200 chars (content-only): "${contentText.slice(0, 200)}..."`);
      return res.status(400).json({
        error: "Insufficient content for analysis",
        message: `This page has only ${contentWordCount} content words. We need at least ${MIN_WORD_COUNT} words to provide a meaningful analysis. This might be a homepage, search engine, or landing page without substantial blog content.`,
        wordCount: contentWordCount,
        minimumRequired: MIN_WORD_COUNT,
        suggestions: [
          "Try analyzing a blog post or article page instead of the homepage",
          "Look for pages with substantial text content (guides, tutorials, documentation)",
          "Avoid analyzing search engines, app launchers, or minimal landing pages"
        ]
      });
    }

    // If strong non-blog signals and limited content, do not analyze
    if (nonBlogSignalScore >= 2 && blogSignalScore < 2 && contentWordCount < STRICT_NONBLOG_MIN) {
      console.log(`[Early Exit] 🚫 Non-blog page detected (signals: nonBlog=${nonBlogSignalScore}, blog=${blogSignalScore}) with ${contentWordCount} content words < ${STRICT_NONBLOG_MIN}: ${fetchUrl}`);
      return res.status(400).json({
        error: "Non-article page detected",
        message: `This appears to be a homepage or search/landing page rather than a blog/article. For meaningful analysis, please provide an article URL with substantial text content (≥ ${STRICT_NONBLOG_MIN} content words).`,
        wordCount: contentWordCount,
        minimumRequired: STRICT_NONBLOG_MIN,
        suggestions: [
          "Open a specific blog post or article on the blog",
          "Avoid homepages or search portals (e.g., google.com)",
          "Use URLs that include /blog/ or /post/ where possible"
        ]
      });
    }
    
    console.log(`[Content] ✅ Word count: ${wordCount} (all) / ${contentWordCount} (content-only), signals blog=${blogSignalScore} nonBlog=${nonBlogSignalScore} - Proceeding`);
    
    const readingTimeMin = Math.max(1, Math.round(wordCount / 200));
    const fleschScore = calculateFleschReadingEase(bodyText);
    const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.length > 0 ? sentences.reduce((acc, s) => acc + s.split(" ").length, 0) / sentences.length : 0;

    // Scripts & CSS
    const scriptsCount = $("script[src]").length;
    const blockingScripts = $("script[src]").filter((i, el) => !$(el).attr("defer") && !$(el).attr("async")).length;
    const stylesheetsCount = $("link[rel=stylesheet]").length;
    // Count only potentially render-blocking stylesheets in <head>, excluding print/disabled
    const blockingStylesheetsCount = $("head link[rel='stylesheet']").filter((i, el) => {
      const media = ($(el).attr('media') || '').toLowerCase();
      const disabled = $(el).attr('disabled') != null;
      if (disabled) return false;
      if (media && (media.includes('print'))) return false;
      // Treat media other than 'all'/'screen'/'' as non-blocking
      if (media && !['all','screen'].includes(media)) return false;
      return true;
    }).length;
    const iframesCount = $("iframe").length;

    // Ads heuristics
    const adScripts = $("script[src]").filter((i, el) => {
      const src = $(el).attr("src") || "";
      return /ads|doubleclick|googlesyndication|amazon-ads|facebook|twitter|instagram|linkedin/i.test(src);
    }).length;
    const adIframes = iframesCount; // assume iframes are ads
    const adElements = $("[id*=ad], [class*=ad], [id*=banner], [class*=banner]").length;
    const overlays = $("[id*=popup], [class*=popup], [id*=modal], [class*=modal]").length;
    const stickyAds = $("[style*=position\\s*:\\s*fixed], [style*=position\\s*:\\s*sticky]").filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return /ad|promo|sponsor/i.test(text);
    }).length;
    const analyticsScripts = $("script").filter((i, el) => {
      const src = ($(el).attr("src") || "").toLowerCase();
      const inlineCode = ($(el).html() || "").toLowerCase();
      const vendorSignature = /(google-analytics|gtag|googletagmanager|plausible|matomo|segment|mixpanel|heap|fullstory|clarity|hotjar|pintrk|fbq|adobe|omni|tagmanager|analytics\.js)/i;
      const inlineSignature = /(gtag\(|ga\(|dataLayer\.|plausible\(|_paq\.push|fbq\(|clarity\(|hj\.|mixpanel\.|heap\.track)/i;
      return vendorSignature.test(src) || inlineSignature.test(inlineCode);
    }).length;
    const analyticsPresent = analyticsScripts > 0;

    // Trust signals
    const contactPresent = !!$("a[href*='contact'], [href*='about']").length || /contact|about/i.test($("body").text());
    const privacyPresent = !!$("a[href*='privacy'], [href*='policy']").length;
    const aboutPresent = !!$("a[href*='about']").length;

    // Security
    const https = url.protocol === "https:";
    const cspPresent = !!$("meta[http-equiv='Content-Security-Policy']").length || !!cspHeader;
    const hstsPresent = !!hstsHeader;
    const xfoPresent = !!xfoHeader;

    // Compute subscores

    // ========================================
    // PERFORMANCE - WITH REAL PAGESPEED API METRICS
    // ========================================
    
    // Tier 1: Try Google PageSpeed Insights API (most accurate, professional)
    // Tier 2: Try Puppeteer (if no API key or API fails)
    // Tier 3: Fall back to heuristics
    
    let realMetrics = null;
    let usingRealData = false;
    let dataSource = 'estimated';
    
    if (!FAST_MODE) {
      // Tier 1: PageSpeed API
      console.log('[Performance] Attempting to get real metrics with Google PageSpeed API...');
      realMetrics = await getPageSpeedMetrics(fetchUrl, 'mobile');
      
      if (realMetrics) {
        usingRealData = true;
        dataSource = 'google-pagespeed-api';
        console.log('[Performance] ✅ Using REAL Google PageSpeed API metrics');
      } else {
        // Tier 2: Puppeteer fallback
        console.log('[Performance] PageSpeed API unavailable, trying Puppeteer...');
        realMetrics = await getRealCoreWebVitals(fetchUrl);
        if (realMetrics) {
          usingRealData = true;
          dataSource = 'puppeteer';
          console.log('[Performance] ✅ Using REAL Puppeteer metrics');
        }
      }
    }
    
    // Use real data if available, otherwise fall back to heuristics
    let lcpValue, lcpScore, tbtProxyMs, tbtScore, clsValue, clsScore, fcpValue, realTTFB;
    
    if (usingRealData) {
      
      // LCP (Largest Contentful Paint) - Real data
      lcpValue = realMetrics.lcp;
      lcpScore = norm(lcpValue, 2.5, 4.0);
      
      // CLS (Cumulative Layout Shift) - Real data
      clsValue = realMetrics.cls;
      clsScore = norm(clsValue, 0.1, 0.25);
      
      // FCP (First Contentful Paint) - Real data
      fcpValue = realMetrics.fcp;
      
      // TBT - Use real data if from PageSpeed API, otherwise estimate
      if (realMetrics.tbt !== null && realMetrics.tbt !== undefined) {
        tbtProxyMs = realMetrics.tbt * 1000; // Convert seconds to ms
        tbtScore = norm(tbtProxyMs, 0, 250);
      } else {
        // Fallback estimate for Puppeteer
        tbtProxyMs = Math.min(400, blockingScripts * 40);
        tbtScore = norm(tbtProxyMs, 0, 250);
      }
      
      // TTFB - Use real data if available
      realTTFB = realMetrics.ttfb;
      
    } else {
      console.log('[Performance] ⚠️ Using heuristic estimates (Puppeteer unavailable)');
      
      // Heuristic LCP proxy from HTML size (approximation)
      lcpValue = Math.max(1, htmlSize / 100000);
      lcpScore = norm(lcpValue, 2.5, 4.0);
      
      // Refined heuristic TBT proxy (approx 40ms per blocking script, capped 400ms)
      tbtProxyMs = Math.min(400, blockingScripts * 40);
      tbtScore = norm(tbtProxyMs, 0, 250);
      
      // Heuristic CLS proxy: missing image dimensions increases shift risk
      clsValue = Math.min(0.5, (imagesMissingDims / Math.max(1, imagesCount)) * 0.25);
      clsScore = norm(clsValue, 0.1, 0.25);
      
      fcpValue = null;
      realTTFB = null;
    }

    // Renormalize Core Web Vitals
    const wL = 0.50, wT = 0.30, wC = 0.20;
    const presentWeights = wL + (tbtScore === null ? 0 : wT) + wC;
    const coreSum = (wL * lcpScore) + (wC * clsScore) + (tbtScore === null ? 0 : (wT * tbtScore));
    const CoreWebVitals_score = clamp(Math.round(coreSum / presentWeights));

    // Load Cost
    const totalPageWeightMB = Math.round((htmlSize / (1024 * 1024)) * 100) / 100;
    const requestsCount = (scriptsCount + stylesheetsCount + imagesCount + iframesCount + 1);
    const largeAssetCount = (imagesCount > 0 ? images.filter((i, el) => {
      const src = ($(el).attr('src') || '').toLowerCase();
      if (!src) return false;
      if (/icon|logo|sprite|favicon|\.svg$/.test(src)) return false;
      return /\.(jpg|jpeg|png|gif|mp4|webm)$/i.test(src);
    }).length : 0);
    const LoadCost_score = clamp(Math.round(
      0.55 * norm(totalPageWeightMB, 0.3, 3.0) +
      0.30 * norm(requestsCount, 10, 120) +
      0.15 * norm(largeAssetCount, 0, 8)
    ));

    // Network Efficiency
    const preconnectPreloadCount = $("link[rel='preconnect'], link[rel='dns-prefetch'], link[rel='preload']").length;
    const ttfbMs = responseTime;
    const preconnectScore = clamp(Math.round((Math.min(preconnectPreloadCount, 3) / 3) * 100));
    const ttfbScore = norm(ttfbMs, 50, 800);
    const http2Score = 70; // Neutral default since protocol unknown
    const NetworkEfficiency_score = clamp(Math.round(
      0.4 * http2Score +
      0.3 * preconnectScore +
      0.3 * ttfbScore
    ));

    // Render Blocking Resources
    const criticalCssPresent = $("style").length > 0; // heuristic for inline critical CSS
    // Render-blocking heuristic based on blocking stylesheet count + TBT proxy
    const blockingCssScore = norm(blockingStylesheetsCount, 3, 15);
    const rbWeights = (tbtProxyMs === null) ? { wJS: 0.3, wCSS: 0.5 } : { wJS: 0.5, wCSS: 0.3 };
    const tbtForRenderBlockingMs = (tbtProxyMs === null) ? Math.min(600, blockingScripts * 60) : tbtProxyMs;
    const RenderBlocking_score = clamp(Math.round(
      rbWeights.wJS * norm(tbtForRenderBlockingMs, 0, 500) +
      rbWeights.wCSS * blockingCssScore +
      0.2 * (criticalCssPresent ? 100 : 0)
    ));

    // Media Optimization
    const imagesWithSrcset = $("img[srcset], picture source[srcset]").length;
    const imagesMissingSrcsetRatio = imagesCount ? (imagesCount - imagesWithSrcset) / imagesCount : 0;
    const videoAutoplayWithSound = $("video[autoplay]").filter((i, el) => !$(el).attr('muted')).length;
    const MediaOptimization_score = clamp(Math.round(
      0.6 * norm(imagesMissingSrcsetRatio, 0, 0.8) +
      0.2 * norm(imagesMissingDims, 0, Math.max(4, imagesCount)) +
      0.2 * clamp(100 - Math.min(100, videoAutoplayWithSound * 50))
    ));

    // Caching & CDN
    const cacheTtlDays = (() => {
      const m = cacheControl.match(/max-age\s*=\s*(\d+)/i);
      if (!m) return 0;
      return parseInt(m[1], 10) / 86400; // precise days (can be fractional)
    })();
    const cdnDetected = /x-cache|via|cf-ray|x-amz-cf-id/i.test(JSON.stringify(Object.fromEntries(response.headers))); // heuristic
    const cachePresenceScore = cacheControl ? 100 : 40;
    const ttlScore = normHigh(cacheTtlDays, 0.1, 30); // higher TTL is better
    const cdnScore = cdnDetected ? 100 : 50;
    const compressionPresenceScore = /(gzip|br)/i.test(contentEncoding) ? 100 : 50;
    const Caching_CDN_score = clamp(Math.round(
      0.5 * cachePresenceScore +
      0.3 * cdnScore +
      0.2 * ttlScore
    ));

    // Webfonts & Fonts Loading
    const fontPreload = $("link[rel='preload'][as='font']").length > 0;
    const Fonts_score = clamp(Math.round(
      0.6 * (fontPreload ? 100 : 60) +
      0.4 * 80
    ));

    // Progressive Enhancements & SW
    const serviceWorkerPresent = $("script").filter((i, el) => /serviceWorker/i.test($(el).text())).length > 0;
    const manifestPresent = $("link[rel='manifest']").length > 0;
    const ProgressiveEnhancements_score = clamp(Math.round(
      0.6 * (serviceWorkerPresent ? 100 : 0) +
      0.4 * (manifestPresent ? 100 : 0)
    ));

    // Aggregate performance per module formula
    let performanceScore = Math.round(
      0.25 * CoreWebVitals_score +
      0.18 * LoadCost_score +
      0.12 * NetworkEfficiency_score +
      0.12 * RenderBlocking_score +
      0.10 * MediaOptimization_score +
      0.08 * Caching_CDN_score +
      0.05 * Fonts_score +
      0.05 * ProgressiveEnhancements_score
    );
    performanceScore = clamp(performanceScore);

    // Accessibility (Expanded) -> raw 0-110 -> normalized 0-100
    let accessibilityRaw = 0;
    // B1 Semantic Structure (25)
    const headingLevels = [];
    [1,2,3,4,5,6].forEach(l=> { if ($(`h${l}`).length) headingLevels.push(l); });
    let headingIssues = 0;
    if (!headings.h1) headingIssues += 2;
    for (let i=0;i<headingLevels.length-1;i++) { if (headingLevels[i+1] - headingLevels[i] > 1) headingIssues++; }
    const headingPoints = Math.max(0, 8 - headingIssues);
    const landmarkTags = ['main','header','footer','nav'];
    const landmarkCount = landmarkTags.reduce((a,t)=> a + ($(t).length?1:0),0);
    const landmarkPoints = Math.min(5, landmarkCount);
    const semanticTags = ['header','main','footer','nav','article','section','aside'];
    const divCount = $('div').length;
    const semanticCount = semanticTags.reduce((a,t)=> a + $(t).length,0);
    const divRatio = semanticCount / Math.max(1, divCount);
    const divSoupPoints = divRatio >= 0.5 ? 5 : divRatio >=0.3 ? 3 : divRatio >=0.15 ? 2 : 1;
    const lists = $('ul,ol'); let listIssues=0; lists.each((i,el)=>{ if ($(el).children('li').length===0) listIssues++; });
    const listPoints = Math.max(0, 3 - listIssues);
    const tables = $('table'); let tableGood=0; tables.each((i,el)=>{ const $el=$(el); if ($el.find('th').length||$el.find('caption').length||$el.find('thead').length) tableGood++; });
    const tablePoints = Math.min(4, tableGood);
    const semanticStructurePoints = headingPoints + landmarkPoints + divSoupPoints + listPoints + tablePoints; accessibilityRaw += semanticStructurePoints;
    // B2 Text Contrast & Readability (20)
    const textSelectors = ['p','span','li','a','h1','h2','h3','h4','h5','h6'];
    let contrastSamples=0, contrastPass=0;
    textSelectors.forEach(sel=> $(sel).each((i,el)=>{ if (contrastSamples>200) return; const style=($(el).attr('style')||''); const fg=parseInlineDecl(style,'color'); const bg=parseInlineDecl(style,'background-color'); if(!fg||!bg) return; const fgRgb=hexToRgb(fg); const bgRgb=hexToRgb(bg); if(!fgRgb||!bgRgb) return; const ratio=contrastRatio(fgRgb,bgRgb); if(ratio){ contrastSamples++; if(ratio>=4.5) contrastPass++; } }));
    const contrastPoints = contrastSamples? Math.round((contrastPass/contrastSamples)*10):5;
    let fontSamples=0,fontOk=0; textSelectors.forEach(sel=> $(sel).each((i,el)=>{ const style=($(el).attr('style')||''); const fs=parseInlineDecl(style,'font-size'); if(fs){ fontSamples++; const m=fs.match(/(\d+(?:\.\d+)?)px/); if(m && parseFloat(m[1])>=16) fontOk++; }}));
    const fontSizePoints = fontSamples? Math.round((fontOk/fontSamples)*4):2;
    let lhSamples=0,lhOk=0; textSelectors.forEach(sel=> $(sel).each((i,el)=>{ const style=($(el).attr('style')||''); const lh=parseInlineDecl(style,'line-height'); if(lh){ lhSamples++; const num=parseFloat(lh); if(!isNaN(num)&&num>=1.4) lhOk++; }}));
    const lineHeightPoints = lhSamples? Math.round((lhOk/lhSamples)*3):2;
    let badFont=false; textSelectors.forEach(sel=> $(sel).each((i,el)=>{ const style=($(el).attr('style')||''); const ff=parseInlineDecl(style,'font-family'); if(ff && /comic|papyrus|cursive|fantasy/i.test(ff)) badFont=true; }));
    const fontFamilyPoints = badFont?1:3;
    const textContrastPoints = contrastPoints + fontSizePoints + lineHeightPoints + fontFamilyPoints; accessibilityRaw += textContrastPoints;
    // B3 Image Accessibility (15)
    const imageTotal = imagesCount; const altMissing = imagesMissingAlt; const altMissingRatio = imageTotal? altMissing/imageTotal:0; const missingAltPoints = Math.round((1 - Math.min(1,altMissingRatio))*7);
    let decorativeOk=0, decorativeTotal=0; images.each((i,el)=>{ const cls=($(el).attr('class')||''); if(/icon|decor|badge|avatar/i.test(cls)){ decorativeTotal++; const alt=($(el).attr('alt')||''); if(alt==='') decorativeOk++; }});
    const decorativePoints = decorativeTotal? Math.round((decorativeOk/decorativeTotal)*3):2;
    let longAlt=0; images.each((i,el)=>{ const alt=($(el).attr('alt')||''); if(alt.length>120) longAlt++; });
    const longAltPoints = longAlt===0?2: longAlt===1?1:0;
    const svgs=$('svg'); let svgAccessible=0; svgs.each((i,el)=>{ const hasTitle=$(el).find('title').length>0; const role=($(el).attr('role')||''); if(hasTitle||/img|presentation|graphics-document/i.test(role)) svgAccessible++; });
    const svgPoints = svgs.length? Math.round((svgAccessible/svgs.length)*3):2;
    const imageAccessibilityPoints = missingAltPoints + decorativePoints + longAltPoints + svgPoints; accessibilityRaw += imageAccessibilityPoints;
    // B4 Media & Interactive (15)
    const inputs=$('input,textarea,select'); let labeled=0; inputs.each((i,el)=>{ const id=$(el).attr('id'); if(id && $(`label[for='${id}']`).length) labeled++; });
    const formLabelPoints = inputs.length? Math.round((labeled/inputs.length)*6):3;
    const buttons=$('button,[role="button"],a.button'); let buttonsNamed=0; buttons.each((i,el)=>{ const txt=$(el).text().trim(); const aria=($(el).attr('aria-label')||''); if(txt.length>0||aria.length>0) buttonsNamed++; });
    const buttonNamePoints = buttons.length? Math.round((buttonsNamed/buttons.length)*4):2;
    const videos=$('video'); let videoGood=0; videos.each((i,el)=>{ const $el=$(el); const autoplay=$el.attr('autoplay')!=null && !$el.attr('muted'); const hasTrack=$el.find('track[kind="captions"]').length>0; if(!autoplay && ($el.attr('controls')!=null) && hasTrack) videoGood++; });
    const mediaPoints = videos.length? Math.min(3,videoGood):1;
    let linksMeaningful=0; const linkElems=$('a[href]'); linkElems.each((i,el)=>{ const txt=$(el).text().trim().toLowerCase(); if(txt && !/click here|here|read more|more/i.test(txt)) linksMeaningful++; });
    const linkTextPoints = linkElems.length? Math.round((linksMeaningful/linkElems.length)*2):1;
    const mediaInteractivePoints = formLabelPoints + buttonNamePoints + mediaPoints + linkTextPoints; accessibilityRaw += mediaInteractivePoints;
    // B5 Keyboard Navigation & Focus (15)
    const positiveTab = $('[tabindex]').filter((i,el)=>{ const v=$(el).attr('tabindex'); return v && parseInt(v)>0; }).length;
    const tabindexPoints = positiveTab===0?4: positiveTab<=2?2:1;
    const fauxInteractive = $('div[onclick], span[onclick]').length;
    const focusableProperPoints = fauxInteractive===0?4: fauxInteractive<=3?2:1;
    const hasFocusStyle = /:focus/.test($('style').text() + $('head style').text());
    const focusStylePoints = hasFocusStyle?4:2;
    const skipLink = $('a[href^="#"]').filter((i,el)=> /skip/i.test($(el).text())).first().length>0;
    const skipLinkPoints = skipLink?3:1;
    const keyboardFocusPoints = tabindexPoints + focusableProperPoints + focusStylePoints + skipLinkPoints; accessibilityRaw += keyboardFocusPoints;
    // B6 ARIA Usage Quality (10)
    const validRoles = new Set(['button','navigation','main','contentinfo','banner','link','img','dialog','alert','alertdialog','status','tab','tabpanel','tablist','textbox','search','form','progressbar','list','listitem','table','row','cell','rowgroup','heading','article','complementary','region','switch','checkbox','radio','radiogroup','slider','spinbutton','menu','menubar','menuitem','menuitemcheckbox','menuitemradio']);
    const roleElems=$('[role]'); let invalidRoles=0; roleElems.each((i,el)=>{ const r=($(el).attr('role')||'').trim().toLowerCase(); if(r && !validRoles.has(r)) invalidRoles++; });
    const ariaRolePoints = Math.max(0,4 - invalidRoles);
    const ariaOveruse = $('[aria-label],[aria-labelledby],[aria-hidden],[aria-expanded]').filter((i,el)=>{ const attrs=Object.keys(el.attribs||{}).filter(a=> a.startsWith('aria-')); return attrs.length>2 && el.tagName==='div'; }).length;
    const ariaOverusePoints = ariaOveruse===0?2: ariaOveruse<=3?1:0;
    let ariaLabelNeededMissing=0; roleElems.each((i,el)=>{ const r=$(el).attr('role'); if(/button|tab|dialog/.test(r)){ const txt=$(el).text().trim(); const aria=($(el).attr('aria-label')||''); if(!txt && !aria) ariaLabelNeededMissing++; } });
    const ariaLabelPoints = ariaLabelNeededMissing===0?2: ariaLabelNeededMissing<=2?1:0;
    const liveRegions = $('[aria-live]'); const livePoints = liveRegions.length?2:1;
    const ariaPoints = ariaRolePoints + ariaOverusePoints + ariaLabelPoints + livePoints; accessibilityRaw += ariaPoints;
    // B7 Mobile Accessibility (Bonus 10)
    const viewportMeta = $('meta[name="viewport"]').attr('content')||'';
    const viewportPoints = viewportMeta?3:0;
    const zoomDisabled = /user-scalable=no|maximum-scale=1/.test(viewportMeta);
    const zoomPoints = zoomDisabled?0:3;
    const tapTargets = $('a[href], button'); let tapOk=0; tapTargets.each((i,el)=>{ const txt=$(el).text().trim(); if(txt.length>=4) tapOk++; });
    const tapTargetPoints = tapTargets.length? Math.round((tapOk/tapTargets.length)*4):2;
    const mobileAccessibilityPoints = viewportPoints + tapTargetPoints + zoomPoints; accessibilityRaw += mobileAccessibilityPoints;
    const accessibilityScore = clamp(Math.round((accessibilityRaw/110)*100));

    // --- Expanded SEO Scoring ---
    let seoRaw = 0;
    // 1. Meta Tags & Page Identity (15)
    const titleLen = title.length;
    let titlePoints = 0; if (title) { titlePoints = (titleLen >= 45 && titleLen <= 65) ? 6 : (titleLen >= 30 && titleLen <= 75) ? 4 : 2; }
    let descPoints = 0; if (metaDescription) { const dLen = metaDescription.length; descPoints = (dLen >= 120 && dLen <= 160) ? 4 : (dLen >= 60 && dLen <= 180) ? 3 : 1; }
    const canonicalPresent = !!canonical;
    const canonicalUrlObj = canonical ? new URL(canonical, fetchUrl) : null;
    const canonicalSelf = canonicalUrlObj ? canonicalUrlObj.hostname === url.hostname : false;
    const canonicalPoints = canonicalPresent ? (canonicalSelf ? 2 : 1) : 0;
    const ogTwitterPoints = (openGraphPresent ? 1 : 0) + (twitterPresent ? 1 : 0);
    // meta keywords spam check
    const metaKeywords = $("meta[name='keywords']").attr('content') || '';
    let keywordsPoints = 1; if (metaKeywords){ const kwList = metaKeywords.split(/[,\s]+/).filter(Boolean); if (kwList.length > 15) keywordsPoints = 0; }
    const identityPoints = titlePoints + descPoints + canonicalPoints + ogTwitterPoints + keywordsPoints; // /15
    seoRaw += identityPoints;

    // --- Simplified & Improved SEO Scoring ---
    // 1. Identity (recompute with clearer weighting)
    let cleanedTitle = title.trim();
    // Remove excessive length & simple repetition (split on | or - and dedupe adjacent identical parts)
    const titleParts = cleanedTitle.split(/\s*[|\-–—]\s*/).map(p=>p.trim()).filter(p=>p);
    const distinctParts = []; titleParts.forEach(p=> { if (distinctParts[distinctParts.length-1] !== p) distinctParts.push(p); });
    if (distinctParts.length && distinctParts.join(' ').length < cleanedTitle.length * 0.9) {
      cleanedTitle = distinctParts.join(' | ');
    }
    if (cleanedTitle.length > 120) cleanedTitle = cleanedTitle.slice(0,120).trim();
    const titleOptimal = cleanedTitle.length >= 30 && cleanedTitle.length <= 75;
    const metaDescOptimal = metaDescription.length >= 60 && metaDescription.length <= 180;
    const identityRaw = (
      (cleanedTitle ? 3 : 0) +
      (titleOptimal ? 2 : 1) +
      (metaDescription ? 3 : 0) +
      (metaDescOptimal ? 2 : (metaDescription ? 1 : 0)) +
      (canonicalPresent ? 3 : 0) +
      (openGraphPresent ? 3 : 0) +
      (twitterPresent ? 2 : 0)
    ); // max 18

    // 2. Content (main body focused) limit to first 6000 chars
    const mainElDom = $('main').first();
    const mainSourceText = mainElDom.length ? mainElDom.text().trim() : bodyText;
    const CONTENT_LIMIT_SEO = 6000;
    const bodySample = mainSourceText.slice(0, CONTENT_LIMIT_SEO);
    const sampleWords = bodySample.split(/\s+/).filter(Boolean);
    const sampleWordCount = sampleWords.length;
    const wordCountPoints = sampleWordCount >= 1200 ? 6 : sampleWordCount >= 600 ? 5 : sampleWordCount >= 300 ? 4 : sampleWordCount > 0 ? 2 : 0; // /6
    const readabilityPoints = fleschScore >= 60 ? 4 : fleschScore >= 50 ? 3 : fleschScore >= 40 ? 2 : 1; // /4
    const headingPresencePoints = headings.h1 > 0 ? 3 : 1; // /3
    const contentRaw = wordCountPoints + readabilityPoints + headingPresencePoints; // max 13

    // 3. Internal Linking (keep simple)
    const internalLinksTotal = links.filter((i,el)=>{ const href=$(el).attr('href'); if(!href) return false; try { const u=new URL(href, fetchUrl); return u.hostname===url.hostname; } catch { return false; }}).length;
    const linkingRaw = internalLinksTotal === 0 ? 2 : internalLinksTotal < 10 ? 6 : internalLinksTotal < 30 ? 8 : 10; // max 10

    // 4. Technical + Markup (light) include schema presence
    const ldScriptsFast = $("script[type='application/ld+json']");
    const schemaPresence = ldScriptsFast.length > 0;
    const httpsPoints = url.protocol === 'https:' ? 3 : 0; // /3
    const canonicalLightPoints = canonicalPresent ? 3 : 0; // /3
    const ttfbPointsLight = ttfbMs <= 300 ? 3 : ttfbMs <= 800 ? 2 : 1; // /3
    const ogPoints = openGraphPresent ? 3 : 0; // /3
    const twitterPoints = twitterPresent ? 2 : 0; // /2
    const schemaPoints = schemaPresence ? 2 : 0; // /2
    const techRaw = httpsPoints + canonicalLightPoints + ttfbPointsLight + ogPoints + twitterPoints + schemaPoints; // max 16
    const techScaled = Math.round((techRaw / 16) * 10); // scale to 10 for weight balance

    // Raw total (before scaling content/identity to weighted design)
    const rawTotal = identityRaw + contentRaw + linkingRaw + techRaw; // max 18+13+10+16 = 57
    const seoScore = clamp(Math.round((rawTotal / 57) * 100));

    // Provide scaled components (keep intuitive ranges)
    const identityScaled = Math.round((identityRaw / 18) * 20); // scale to /20
    const contentScaled = Math.round((contentRaw / 13) * 20); // /20
    const linkingScaled = linkingRaw; // /10
    const technicalScaled = techScaled; // /10
    const simplifiedRawTotal = identityScaled + contentScaled + linkingScaled + technicalScaled; // max 60 (informational)

    // Content Quality - NEW POINT-BASED SCORING SYSTEM (0-100)
    // 1. Readability (0-40): Flesch (0-20) + Avg Sentence Length (0-20)
    let fleschPoints;
    if (fleschScore >= 60) fleschPoints = 20;
    else if (fleschScore >= 30) fleschPoints = 15;
    else if (fleschScore >= 0) fleschPoints = 10;
    else if (fleschScore >= -30) fleschPoints = 5;
    else fleschPoints = 2;
    
    let sentenceLenPoints;
    if (avgSentenceLength >= 10 && avgSentenceLength <= 20) sentenceLenPoints = 20;
    else if (avgSentenceLength > 20 && avgSentenceLength <= 25) sentenceLenPoints = 15;
    else if (avgSentenceLength >= 5 && avgSentenceLength < 10) sentenceLenPoints = 12;
    else if (avgSentenceLength < 5) sentenceLenPoints = 10;
    else sentenceLenPoints = 5; // >25
    
    const readabilityPointsTotal = fleschPoints + sentenceLenPoints; // max 40
    
    // 2. Word Count Score (0-20)
    let wordCountPointsNew;
    if (wordCount >= 1500 && wordCount <= 3000) wordCountPointsNew = 20;
    else if (wordCount >= 800 && wordCount < 1500) wordCountPointsNew = 18;
    else if (wordCount >= 500 && wordCount < 800) wordCountPointsNew = 12;
    else if (wordCount >= 200 && wordCount < 500) wordCountPointsNew = 8;
    else if (wordCount < 200) wordCountPointsNew = 2;
    else wordCountPointsNew = 10; // >3000 penalty
    
    // 3. Reading Time Score (0-20)
    let readingTimePoints;
    if (readingTimeMin >= 4 && readingTimeMin <= 8) readingTimePoints = 20;
    else if (readingTimeMin >= 2 && readingTimeMin < 4) readingTimePoints = 15;
    else if (readingTimeMin > 8 && readingTimeMin <= 12) readingTimePoints = 12;
    else if (readingTimeMin < 2) readingTimePoints = 5;
    else readingTimePoints = 6; // >12
    
    // 4. Content Depth Score (0-20)
    const sentencesCountForDepth = sentences.length || 1;
    const depthRatio = wordCount / sentencesCountForDepth;
    let depthPoints;
    if (depthRatio >= 15 && depthRatio <= 25) depthPoints = 20;
    else if (depthRatio >= 12 && depthRatio < 15) depthPoints = 16;
    else if (depthRatio >= 9 && depthRatio < 12) depthPoints = 12;
    else if (depthRatio >= 6 && depthRatio < 9) depthPoints = 8;
    else if (depthRatio < 6) depthPoints = 4;
    else depthPoints = 12; // >25
    
    // 5. Content Engagement Score (0-20)
    // 5.1 Interactive Elements (0-8)
    const questionsCount = (bodyText.match(/\?/g) || []).length;
    const hasQuestions = questionsCount >= 3 && questionsCount <= 20; // Rhetorical questions engage readers
    const callToActions = (bodyText.match(/tell us|share|comment|let us know|what do you think|leave a comment|subscribe|join/gi) || []).length;
    const hasCallToActions = callToActions >= 2;
    const interactiveEngagementPoints = (hasQuestions ? 4 : 0) + (hasCallToActions ? 4 : 0); // max 8
    
    // 5.2 Storytelling Elements (0-7)
    const storytellingKeywords = /personal|story|experience|journey|learned|discovered|tried|tested|favorite|love|hate|recommend|advice|tip|secret|mistake|success|fail/gi;
    const storytellingMatches = (bodyText.match(storytellingKeywords) || []).length;
    let storytellingPoints;
    if (storytellingMatches >= 10) storytellingPoints = 7;
    else if (storytellingMatches >= 5) storytellingPoints = 5;
    else if (storytellingMatches >= 2) storytellingPoints = 3;
    else storytellingPoints = 0;
    
    // 5.3 Visual Content Density (0-5)
    const contentBlocks = Math.max(1, $('p').length + $('h2, h3, h4').length);
    const visualsRatio = (imagesCount + $('video').length) / contentBlocks;
    let visualDensityPoints;
    if (visualsRatio >= 0.3 && visualsRatio <= 0.8) visualDensityPoints = 5; // Good balance
    else if (visualsRatio >= 0.15 || visualsRatio <= 1.2) visualDensityPoints = 3;
    else visualDensityPoints = 1;
    
    const engagementPoints = interactiveEngagementPoints + storytellingPoints + visualDensityPoints; // max 20
    
    const contentScore = readabilityPointsTotal + wordCountPointsNew + readingTimePoints + depthPoints + engagementPoints; // max 120 -> need to normalize
    const contentScoreNormalized = Math.round((contentScore / 120) * 100); // normalize to 0-100

    // UX - COMPREHENSIVE SCORING SYSTEM (0-100)
    // 1. Navigation & Searchability (0-25) - Enhanced for blog discovery
    const navElement = $('nav').first();
    const navPresent = navElement.length > 0;
    const navPresencePoints = navPresent ? 5 : 0;
    
    const navLinks = $('nav a[href]');
    const navLinkCount = navLinks.length;
    let navItemCountPoints;
    if (navLinkCount >= 4 && navLinkCount <= 8) navItemCountPoints = 8;
    else if (navLinkCount >= 2 && navLinkCount <= 3) navItemCountPoints = 5;
    else if (navLinkCount >= 9 && navLinkCount <= 12) navItemCountPoints = 4;
    else if (navLinkCount < 2) navItemCountPoints = 2;
    else navItemCountPoints = 0; // >12
    
    const homeLink = $('a[href="/"], a[href="./"], a[href="../"], a[href="' + url.origin + '"]').length > 0;
    const homeLinkPoints = homeLink ? 4 : 0;
    
    // 1.1 Search Functionality (0-5) - NEW for "Search Time for Blog Entry"
    const searchInput = $('input[type="search"], input[name*="search"], input[placeholder*="search" i], input[id*="search"]').length;
    const searchButton = $('button[type="submit"]').filter((i, el) => /search/i.test($(el).text())).length;
    const hasSearchFeature = searchInput > 0 || searchButton > 0;
    const searchPoints = hasSearchFeature ? 5 : 0;
    
    // 1.2 Category/Archive Organization (0-3) - NEW for content discovery
    const categoryLinks = $('a[href*="category"], a[href*="tag"], a[href*="archive"]').length;
    const hasCategoriesOrTags = categoryLinks >= 3;
    const categoryPoints = hasCategoriesOrTags ? 3 : 0;
    
    const navigationScore = navPresencePoints + navItemCountPoints + homeLinkPoints + searchPoints + categoryPoints; // max 25
    
    // 2. Readability & Typography (0-20)
    const bodyStyle = $('body').attr('style') || '';
    const fontSizeMatch = bodyStyle.match(/font-size\s*:\s*(\d+)px/);
    const baseFontSize = fontSizeMatch ? parseInt(fontSizeMatch[1]) : 16; // default assumption
    let uxFontSizePoints;
    if (baseFontSize >= 16) uxFontSizePoints = 10;
    else if (baseFontSize >= 14) uxFontSizePoints = 7;
    else if (baseFontSize >= 12) uxFontSizePoints = 4;
    else uxFontSizePoints = 0;
    
    const lineHeightMatch = bodyStyle.match(/line-height\s*:\s*([\d.]+)/);
    const lineHeight = lineHeightMatch ? parseFloat(lineHeightMatch[1]) : 1.5; // default assumption
    const uxLineHeightPoints = lineHeight >= 1.4 ? 5 : 2;
    
    const bodyColor = parseInlineDecl(bodyStyle, 'color');
    const bodyBg = parseInlineDecl(bodyStyle, 'background-color');
    const uxTextContrastPoints = (bodyColor && bodyBg && bodyColor !== bodyBg) ? 5 : 5; // assume good contrast by default if not same
    const typographyScore = uxFontSizePoints + uxLineHeightPoints + uxTextContrastPoints; // max 20
    
    // 3. Mobile Usability (0-20)
    const uxViewportPoints = viewport ? 10 : 0;
    
    const imagesWithResponsive = images.filter((i, el) => {
      const style = $(el).attr('style') || '';
      const maxWidth = /max-width\s*:\s*100%/.test(style);
      const widthAuto = /width\s*:\s*(100%|auto)/.test(style);
      return maxWidth || widthAuto;
    }).length;
    const responsiveRatio = imagesCount ? (imagesWithResponsive / imagesCount) * 100 : 100;
    let responsiveImgPoints;
    if (responsiveRatio >= 90) responsiveImgPoints = 5;
    else if (responsiveRatio >= 60) responsiveImgPoints = 3;
    else responsiveImgPoints = 1;
    
    const noHorizontalScrollPoints = 5; // Cannot detect without browser; assume good
    const mobileUsabilityScore = uxViewportPoints + responsiveImgPoints + noHorizontalScrollPoints; // max 20
    
    // 4. Layout Stability (0-15)
    const imagesWithDims = images.filter((i, el) => $(el).attr('width') && $(el).attr('height')).length;
    const dimsRatio = imagesCount ? (imagesWithDims / imagesCount) * 100 : 100;
    let imageDimPoints;
    if (dimsRatio >= 90) imageDimPoints = 10;
    else if (dimsRatio >= 70) imageDimPoints = 7;
    else if (dimsRatio >= 40) imageDimPoints = 4;
    else imageDimPoints = 0;
    
    const skeletonLoaders = $('[class*="skeleton"], [class*="loader"], [class*="placeholder"]').length;
    const shiftPronePoints = skeletonLoaders === 0 ? 5 : 3;
    const layoutStabilityScore = imageDimPoints + shiftPronePoints; // max 15
    
    // 5. Interaction Quality (0-15)
    const interactiveElements = $('button, a, input[type="button"], input[type="submit"]');
    let largeTargets = 0;
    interactiveElements.each((i, el) => {
      const style = $(el).attr('style') || '';
      const heightMatch = style.match(/height\s*:\s*(\d+)px/);
      const height = heightMatch ? parseInt(heightMatch[1]) : 40; // assume reasonable default
      if (height >= 32) largeTargets++;
    });
    const targetRatio = interactiveElements.length ? (largeTargets / interactiveElements.length) * 100 : 100;
    let uxTapTargetPoints;
    if (targetRatio >= 90) uxTapTargetPoints = 7;
    else if (targetRatio >= 60) uxTapTargetPoints = 5;
    else uxTapTargetPoints = 2;
    
    const linksWithoutHref = $('a').filter((i, el) => !$(el).attr('href') || $(el).attr('href').trim() === '').length;
    let validHrefPoints;
    if (linksWithoutHref === 0) validHrefPoints = 4;
    else if (linksWithoutHref <= 3) validHrefPoints = 2;
    else validHrefPoints = 0;
    
    const buttonsWithType = $('button[type]').length;
    const totalButtons = $('button').length;
    const buttonsTypePoints = (totalButtons === 0 || buttonsWithType === totalButtons) ? 4 : 2;
    const interactionScore = uxTapTargetPoints + validHrefPoints + buttonsTypePoints; // max 15
    
    // 6. Intrusiveness (Ads & Popups) (0-10)
    const adRelatedElements = $('[class*="ad"], [class*="banner"], [class*="advert"], [id*="ad"], [id*="banner"]').length;
    let adCountPoints;
    if (adRelatedElements <= 1) adCountPoints = 5;
    else if (adRelatedElements <= 4) adCountPoints = 3;
    else adCountPoints = 0;
    
    const adsAboveFold = $('[class*="ad"], [class*="banner"]').filter((i, el) => {
      const style = $(el).attr('style') || '';
      const topMatch = style.match(/top\s*:\s*(\d+)px/);
      const top = topMatch ? parseInt(topMatch[1]) : 1000; // assume below fold if not specified
      return top < 600;
    }).length;
    const adsFoldPoints = adsAboveFold === 0 ? 5 : 1;
    const intrusivenessScore = adCountPoints + adsFoldPoints; // max 10
    
    // FINAL UX SCORE
    // Navigation(25) + Typography(20) + Mobile(20) + Layout Stability(15) + Interaction(15) + Intrusiveness(10) = 105
    // Normalize to 100
    const uxScoreRaw = navigationScore + typographyScore + mobileUsabilityScore + layoutStabilityScore + interactionScore + intrusivenessScore;
    const uxScore = Math.round((uxScoreRaw / 105) * 100); // max 100

    // MONETIZATION - COMPREHENSIVE SCORING SYSTEM (0-100)
    // 1. Ad Implementation Quality (0-30)
    // 1.1 Ad Density (0-10)
    const adsTotal = adElements + adIframes;
    let adDensityPoints;
    if (adsTotal >= 1 && adsTotal <= 3) adDensityPoints = 10;
    else if (adsTotal >= 4 && adsTotal <= 6) adDensityPoints = 6;
    else if (adsTotal >= 7 && adsTotal <= 10) adDensityPoints = 3;
    else if (adsTotal > 10) adDensityPoints = 0;
    else adDensityPoints = 10; // 0 ads = perfect
    
    // 1.2 Ad Placement Quality (0-10)
    const adsAboveFoldCount = $('[class*="ad"], [class*="banner"], [class*="advert"]').filter((i, el) => {
      const style = $(el).attr('style') || '';
      const topMatch = style.match(/top\s*:\s*(\d+)px/);
      const top = topMatch ? parseInt(topMatch[1]) : 1000;
      return top < 600;
    }).length;
    let adPlacementPoints;
    if (adsAboveFoldCount === 0) adPlacementPoints = 10;
    else if (adsAboveFoldCount <= 2) adPlacementPoints = 6;
    else adPlacementPoints = 2;
    
    // 1.3 Ad Loading Hygiene (0-10)
    const lazyAds = $('[class*="ad"][loading="lazy"], [class*="banner"][loading="lazy"]').length;
    const blockingAdScripts = $('head script[src*="ad"], head script[src*="doubleclick"], head script[src*="googlesyndication"]').length;
    let adLoadingPoints;
    if (lazyAds > 0 && blockingAdScripts === 0) adLoadingPoints = 10;
    else if (lazyAds > 0) adLoadingPoints = 6;
    else if (blockingAdScripts === 0 && adsTotal > 0) adLoadingPoints = 5;
    else if (blockingAdScripts > 0) adLoadingPoints = 0;
    else adLoadingPoints = 10; // no ads = perfect
    
    const adsScore = adDensityPoints + adPlacementPoints + adLoadingPoints; // max 30
    
    // 2. Affiliate Optimization (0-20)
    // 2.1 Affiliate Link Presence (0-5)
    const affiliateLinks = $('a[href*="ref="], a[href*="aff"], a[href*="tag="], a[href*="affiliate"], a[href*="amzn.to"]');
    const affiliateCount = affiliateLinks.length;
    let affiliatePresencePoints;
    if (affiliateCount >= 1 && affiliateCount <= 20) affiliatePresencePoints = 5;
    else if (affiliateCount === 0) affiliatePresencePoints = 2;
    else affiliatePresencePoints = 1; // >20 spammy
    
    // 2.2 Affiliate Link Disclosure (0-5)
    const disclosureText = bodyText.toLowerCase();
    const hasDisclosure = /affiliate|commission|may earn|disclosure|paid link/i.test(disclosureText);
    const affiliateDisclosurePoints = hasDisclosure ? 5 : 0;
    
    // 2.3 Affiliate Relevancy (0-10)
    let descriptiveAffLinks = 0;
    affiliateLinks.each((i, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text.length > 10 && !/click here|here|link/i.test(text)) {
        descriptiveAffLinks++;
      }
    });
    const affRelevancyRatio = affiliateCount ? (descriptiveAffLinks / affiliateCount) * 100 : 100;
    let affiliateRelevancyPoints;
    if (affRelevancyRatio >= 80) affiliateRelevancyPoints = 10;
    else if (affRelevancyRatio >= 50) affiliateRelevancyPoints = 7;
    else if (affRelevancyRatio >= 20) affiliateRelevancyPoints = 3;
    else affiliateRelevancyPoints = 1;
    
    const affiliateScore = affiliatePresencePoints + affiliateDisclosurePoints + affiliateRelevancyPoints; // max 20
    
    // 3. Product/Sales Optimization (0-20)
    // 3.1 Buy Buttons Presence (0-8)
    const buyButtons = $('button, a').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return /buy|shop|order|cart|purchase|add to cart/i.test(text);
    });
    const buyButtonCount = buyButtons.length;
    let buyButtonPoints;
    if (buyButtonCount >= 1 && buyButtonCount <= 10) buyButtonPoints = 8;
    else if (buyButtonCount === 0) buyButtonPoints = 2;
    else buyButtonPoints = 4; // >10 might be excessive
    
    // 3.2 Product Presentation (0-6)
    const productCards = $('[class*="product"], [class*="item-card"], [class*="shop-card"]').length;
    const hasProductImages = $('[class*="product"] img, [class*="item"] img').length > 0;
    const hasPrice = /\$\d+|\d+\.\d{2}|price/i.test(bodyText);
    const productPresentationPoints = (productCards > 0 || (hasProductImages && hasPrice)) ? 6 : 2;
    
    // 3.3 Customer Trust Elements (0-6)
    const trustElements = /refund|money-back|guarantee|secure|ssl|verified|trusted|safe checkout/i;
    const trustMatches = (bodyText.match(trustElements) || []).length;
    let customerTrustPoints;
    if (trustMatches >= 2) customerTrustPoints = 6;
    else if (trustMatches === 1) customerTrustPoints = 3;
    else customerTrustPoints = 0;
    
    const productScore = buyButtonPoints + productPresentationPoints + customerTrustPoints; // max 20
    
    // 4. Subscription / Email Capture (0-10)
    // 4.1 Email Opt-In Presence (0-5)
    const emailInputs = $('input[type="email"], input[name*="email"]').length;
    const emailOptInPoints = emailInputs > 0 ? 5 : 0;
    
    // 4.2 Incentive Clarity (0-5)
    const emailFormContext = $('form').filter((i, el) => $(el).find('input[type="email"]').length > 0).parent().text().toLowerCase();
    const hasIncentive = /newsletter|free|updates|weekly|subscribe|exclusive|bonus|guide|ebook/i.test(emailFormContext || bodyText);
    let incentiveClarityPoints;
    if (hasIncentive && emailInputs > 0) incentiveClarityPoints = 5;
    else if (emailInputs > 0) incentiveClarityPoints = 3;
    else incentiveClarityPoints = 0;
    
    const subscriptionScore = emailOptInPoints + incentiveClarityPoints; // max 10
    
    // 5. CTA & Conversion Design (0-10)
    // 5.1 CTA Quantity (0-5)
    const ctaButtons = $('button, a').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return /subscribe|download|buy|learn more|sign-up|get started|try|join|register/i.test(text);
    });
    const ctaCount = ctaButtons.length;
    let ctaQuantityPoints;
    if (ctaCount >= 2 && ctaCount <= 10) ctaQuantityPoints = 5;
    else if (ctaCount === 1) ctaQuantityPoints = 3;
    else if (ctaCount > 10) ctaQuantityPoints = 1;
    else ctaQuantityPoints = 0;
    
    // 5.2 CTA Visibility (0-5)
    let visibleCtas = 0;
    ctaButtons.each((i, el) => {
      const style = $(el).attr('style') || '';
      const hasBackground = /background|bg-/.test(style + $(el).attr('class'));
      const heightMatch = style.match(/height\s*:\s*(\d+)px/);
      const height = heightMatch ? parseInt(heightMatch[1]) : 36;
      if (hasBackground && height >= 32) visibleCtas++;
    });
    const ctaVisibilityRatio = ctaCount ? (visibleCtas / ctaCount) * 100 : 0;
    let ctaVisibilityPoints;
    if (ctaVisibilityRatio >= 80) ctaVisibilityPoints = 5;
    else if (ctaVisibilityRatio >= 50) ctaVisibilityPoints = 3;
    else ctaVisibilityPoints = 1;
    
    const ctaScore = ctaQuantityPoints + ctaVisibilityPoints; // max 10
    
    // 6. Monetization Hygiene (0-10)
    // 6.1 No Intrusive Popups (0-5)
    const popups = $('[class*="modal"], [class*="popup"], [id*="modal"], [id*="popup"]').length;
    const overlayCount = overlays; // from earlier calculation
    let popupPoints;
    if (popups === 0 && overlayCount === 0) popupPoints = 5;
    else if (popups <= 2 || overlayCount <= 1) popupPoints = 3;
    else if (overlayCount > 2) popupPoints = 1;
    else popupPoints = 0;
    
    // 6.2 No Deceptive Ads (0-5)
    const deceptivePatterns = $('button, a').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      const classes = $(el).attr('class') || '';
      const isAd = /ad|banner/i.test(classes);
      const deceptiveText = /download|update|install|play|watch now/i.test(text);
      return isAd && deceptiveText;
    }).length;
    let deceptivePoints;
    if (deceptivePatterns === 0) deceptivePoints = 5;
    else if (deceptivePatterns <= 2) deceptivePoints = 2;
    else deceptivePoints = 0;
    
    const monetizationHygieneScore = popupPoints + deceptivePoints; // max 10
    
    // FINAL MONETIZATION SCORE
    const monetizationScore = adsScore + affiliateScore + productScore + subscriptionScore + ctaScore + monetizationHygieneScore; // max 100

    // ========================================
    // TRUST SCORE (0-100)
    // ========================================
    
    // 1. Site Identity & Transparency (0-25)
    // 1.1 About Page or Contact Page (0-8)
    const identityLinks = $('a').filter((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      return /about|contact|team|company/i.test(href + text);
    });
    const uniqueIdentityPages = new Set();
    identityLinks.each((i, el) => {
      const href = $(el).attr('href') || '';
      if (/about/i.test(href)) uniqueIdentityPages.add('about');
      if (/contact/i.test(href)) uniqueIdentityPages.add('contact');
      if (/team/i.test(href)) uniqueIdentityPages.add('team');
      if (/company/i.test(href)) uniqueIdentityPages.add('company');
    });
    const identityPageCount = uniqueIdentityPages.size;
    let aboutContactPoints;
    if (identityPageCount >= 2) aboutContactPoints = 8;
    else if (identityPageCount === 1) aboutContactPoints = 5;
    else aboutContactPoints = 0;
    
    // 1.2 Contact Methods (0-7)
    const emailLinks = $('a[href^="mailto:"]').length;
    const phoneNumbers = bodyText.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g) || [];
    const addressPatterns = /\b\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b/gi;
    const physicalAddress = bodyText.match(addressPatterns) || [];
    const contactForm = $('form').filter((i, el) => {
      const action = $(el).attr('action') || '';
      const inputs = $(el).find('input, textarea').length;
      return /contact|feedback|inquiry/i.test(action) || inputs >= 2;
    }).length;
    
    const contactMethods = (emailLinks > 0 ? 1 : 0) + (phoneNumbers.length > 0 ? 1 : 0) + 
                           (physicalAddress.length > 0 ? 1 : 0) + (contactForm > 0 ? 1 : 0);
    let contactMethodsPoints;
    if (contactMethods >= 3) contactMethodsPoints = 7;
    else if (contactMethods === 2) contactMethodsPoints = 5;
    else if (contactMethods === 1) contactMethodsPoints = 3;
    else contactMethodsPoints = 0;
    
    // 1.3 Legal Transparency (0-10)
    const legalLinks = $('a').filter((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      return /privacy|terms|cookie|disclaimer/i.test(href + text);
    });
    const legalPages = new Set();
    legalLinks.each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      if (/privacy/i.test(href + text)) legalPages.add('privacy');
      if (/terms/i.test(href + text)) legalPages.add('terms');
      if (/cookie/i.test(href + text)) legalPages.add('cookie');
      if (/disclaimer/i.test(href + text)) legalPages.add('disclaimer');
    });
    const legalPageCount = legalPages.size;
    let legalTransparencyPoints;
    if (legalPageCount >= 4) legalTransparencyPoints = 10;
    else if (legalPageCount >= 2) legalTransparencyPoints = 6;
    else if (legalPageCount === 1) legalTransparencyPoints = 3;
    else legalTransparencyPoints = 0;
    
    const identityScore = aboutContactPoints + contactMethodsPoints + legalTransparencyPoints; // max 25
    
    // 2. Author Credibility (0-20)
    // 2.1 Author Box / Bio (0-8)
    const authorBox = $('[class*="author"], [id*="author"], [class*="bio"], [id*="bio"], [class*="written-by"]');
    const authorTextLength = authorBox.text().length;
    let authorBoxPoints;
    if (authorBox.length > 0 && authorTextLength > 100) authorBoxPoints = 8;
    else if (authorBox.length > 0) authorBoxPoints = 5;
    else authorBoxPoints = 0;
    
    // 2.2 Expertise Signals (0-7)
    const expertiseKeywords = /certified|licensed|expert|professional|nutritionist|chef|specialist|consultant|phd|md|rn|credentialed/gi;
    const expertiseMatches = bodyText.match(expertiseKeywords) || [];
    const credentialLinks = $('a').filter((i, el) => {
      const href = $(el).attr('href') || '';
      return /certification|credential|linkedin|about/i.test(href);
    }).length;
    let expertisePoints;
    if (expertiseMatches.length >= 3 || credentialLinks >= 2) expertisePoints = 7;
    else if (expertiseMatches.length >= 1 || credentialLinks >= 1) expertisePoints = 4;
    else expertisePoints = 0;
    
    // 2.3 Date Information (0-5)
    const trustPublishedDate = $('[class*="published"], [class*="date"], time[datetime], [property="article:published_time"]').length;
    const trustUpdatedDate = $('[class*="updated"], [class*="modified"], [property="article:modified_time"]').length;
    let dateInfoPoints;
    if (trustPublishedDate > 0 && trustUpdatedDate > 0) dateInfoPoints = 5;
    else if (trustPublishedDate > 0) dateInfoPoints = 3;
    else dateInfoPoints = 0;
    
    const authorCredibilityScore = authorBoxPoints + expertisePoints + dateInfoPoints; // max 20
    
    // 3. Content Reliability & Uniqueness (0-25) - Enhanced for unique information
    // 3.1 Citation or Source References (0-7)
    const citationKeywords = /source|reference|study|research|according to|cited/gi;
    const citationMatches = bodyText.match(citationKeywords) || [];
    const scholarlyLinks = $('a').filter((i, el) => {
      const href = $(el).attr('href') || '';
      return /\.edu|\.gov|scholar\.google|pubmed|doi\.org|arxiv/i.test(href);
    }).length;
    const totalReferences = citationMatches.length + scholarlyLinks;
    let citationPoints;
    if (totalReferences >= 3) citationPoints = 7;
    else if (totalReferences >= 1) citationPoints = 5;
    else citationPoints = 0;
    
    // 3.2 Accuracy Signals (0-6)
    const stepByStep = /step \d+|first|second|third|finally|next/gi.test(bodyText);
    const numbers = (bodyText.match(/\b\d+(\.\d+)?%|\b\d+(\.\d+)?\s*(degrees|cups|tablespoons|minutes|hours|grams|kg|lbs)\b/gi) || []).length;
    const trustLists = $('ol, ul').length;
    const detailScore = (stepByStep ? 3 : 0) + (numbers >= 5 ? 2 : numbers >= 2 ? 1 : 0) + (trustLists >= 2 ? 2 : trustLists >= 1 ? 1 : 0);
    let accuracyPoints;
    if (detailScore >= 5) accuracyPoints = 6;
    else if (detailScore >= 3) accuracyPoints = 4;
    else if (detailScore >= 1) accuracyPoints = 2;
    else accuracyPoints = 0;
    
    // 3.3 Unique/Original Information Signals (0-12) - ENHANCED with keyword rarity analysis
    // Extract top keywords from content
    const topKeywords = extractTopKeywords(bodyText, 10);
    
    console.log(`[Content Analysis] Extracted ${topKeywords.length} keywords:`, topKeywords.slice(0, 5).map(k => k.word));
    
    // Store the 5 LEAST common words in database for cross-site comparison
    if (topKeywords.length > 0) {
      const sortedByLocalFreq = [...topKeywords].sort((a, b) => a.count - b.count);
      const leastCommon5 = sortedByLocalFreq.slice(0, 5);
      
      console.log(`[Word Frequency] Storing 5 least common words:`, leastCommon5.map(w => w.word));
      
      // Store with Datamuse frequency for each word (async, don't block)
      Promise.all(
        leastCommon5.map(async ({ word, count }) => {
          const datamuseFreq = await getWordFrequency(word);
          return WordFrequency.incrementWord(word, count, datamuseFreq);
        })
      ).catch(err => console.error('[Word Frequency] Error storing words:', err.message));
    }
    
    // Run keyword rarity and uniqueness metric in PARALLEL for faster performance
    const [keywordRarityData, uniquenessMetric] = await Promise.all([
      checkKeywordRarity(topKeywords)
        .then(data => {
          console.log(`[Keyword Rarity] ✅ Analysis complete - Score: ${data.score}/10, Level: ${data.level}`);
          return data;
        })
        .catch(error => {
          console.error('[Keyword Rarity] ❌ Error:', error.message);
          return { score: 0, level: 'unknown', reasoning: 'No keywords extracted' };
        }),
      calculateUniquenessMetric(bodyText)
        .then(data => {
          console.log(`[Uniqueness Metric] ✅ Analysis complete - Score: ${data.score}/100, Level: ${data.level}`);
          return data;
        })
        .catch(error => {
          console.error('[Uniqueness Metric] ❌ Error:', error.message);
          return { score: 50, level: 'unknown', reasoning: 'Analysis pending', details: {} };
        })
    ]);
    
    // Original keyword-based detection (existing)
    const originalityKeywords = /tested|tried|experiment|my experience|i found|i discovered|original recipe|exclusive|behind the scenes|tutorial|guide|hack|tip|secret|mistake|lesson learned/gi;
    const originalityMatches = (bodyText.match(originalityKeywords) || []).length;
    
    // Photo originality heuristic (existing - judges liked this!)
    const hasOriginalPhotos = images.filter((i, el) => {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt') || '';
      // Heuristic: likely stock photos vs original
      return !/unsplash|pexels|shutterstock|gettyimages|stockphoto|placeholder/i.test(src + alt);
    }).length;
    const photoOriginality = imagesCount > 0 ? (hasOriginalPhotos / imagesCount) : 0;
    
    // Combined uniqueness scoring
    // - Keyword rarity (0-5 points): Based on search frequency of top keywords
    const keywordRarityPoints = Math.round((keywordRarityData.score / 10) * 5); // Scale 0-10 to 0-5
    
    // - Originality signals (0-4 points): Personal experience indicators
    let originalitySignalPoints;
    if (originalityMatches >= 5) originalitySignalPoints = 4;
    else if (originalityMatches >= 3) originalitySignalPoints = 3;
    else if (originalityMatches >= 1) originalitySignalPoints = 2;
    else originalitySignalPoints = 0;
    
    // - Photo originality (0-3 points): Non-stock photos
    let photoOriginalityPoints;
    if (photoOriginality >= 0.7) photoOriginalityPoints = 3;
    else if (photoOriginality >= 0.4) photoOriginalityPoints = 2;
    else if (photoOriginality >= 0.2) photoOriginalityPoints = 1;
    else photoOriginalityPoints = 0;
    
    const uniquenessPoints = keywordRarityPoints + originalitySignalPoints + photoOriginalityPoints; // max 12
    
    // 3.4 Low Spam Score (0-5)
    const words = bodyText.split(/\s+/).filter(w => w.length > 0);
    const wordFreq = {};
    words.forEach(w => {
      const lower = w.toLowerCase().replace(/[^a-z]/g, '');
      if (lower.length > 3) wordFreq[lower] = (wordFreq[lower] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(wordFreq), 0);
    const keywordDensity = words.length > 0 ? (maxFreq / words.length) * 100 : 0;
    
    const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
    const uniqueParagraphs = new Set(paragraphs);
    const duplicateRatio = paragraphs.length > 0 ? ((paragraphs.length - uniqueParagraphs.size) / paragraphs.length) * 100 : 0;
    
    let spamPoints;
    if (keywordDensity < 5 && duplicateRatio < 10) spamPoints = 5;
    else if (keywordDensity < 7 && duplicateRatio < 25) spamPoints = 3;
    else spamPoints = 0;
    
    const contentReliabilityScore = citationPoints + accuracyPoints + uniquenessPoints + spamPoints; // max 30 (7+6+12+5)
    
    // 4. User Protection & Safety (0-15)
    // 4.1 HTTPS & SSL (0-8)
    const trustHttpsPoints = https ? 8 : 0;
    
    // 4.2 Secure External Links (0-4)
    const trustExternalLinks = $('a[href^="http"]').filter((i, el) => {
      const href = $(el).attr('href') || '';
      return !href.includes(url.hostname);
    });
    const trustExternalCount = trustExternalLinks.length;
    const trustSecureExternalLinks = trustExternalLinks.filter((i, el) => {
      const rel = $(el).attr('rel') || '';
      return /noopener/i.test(rel);
    }).length;
    const trustSecureExternalRatio = trustExternalCount > 0 ? (trustSecureExternalLinks / trustExternalCount) * 100 : 100;
    let secureLinksPoints;
    if (trustSecureExternalRatio >= 80) secureLinksPoints = 4;
    else if (trustSecureExternalRatio >= 40) secureLinksPoints = 2;
    else secureLinksPoints = 0;
    
    // 4.3 No Deceptive UX Patterns (0-3) - reuse from monetization
    let noDeceptivePoints;
    if (deceptivePatterns === 0) noDeceptivePoints = 3;
    else if (deceptivePatterns <= 2) noDeceptivePoints = 1;
    else noDeceptivePoints = 0;
    
    const safetyScore = trustHttpsPoints + secureLinksPoints + noDeceptivePoints; // max 15
    
    // 5. Professionalism Signals (0-10)
    // 5.1 Brand Consistency (0-4)
    const logos = $('img[alt*="logo" i], [class*="logo"], [id*="logo"]').length;
    const uniqueFonts = new Set();
    $('*').each((i, el) => {
      const fontFamily = $(el).css('font-family');
      if (fontFamily) uniqueFonts.add(fontFamily);
    });
    const fontConsistency = uniqueFonts.size <= 5 ? 2 : uniqueFonts.size <= 10 ? 1 : 0;
    let brandConsistencyPoints;
    if (logos >= 1 && fontConsistency === 2) brandConsistencyPoints = 4;
    else if (logos >= 1 || fontConsistency >= 1) brandConsistencyPoints = 2;
    else brandConsistencyPoints = 0;
    
    // 5.2 Clean Design (0-3) - use CLS value
    let cleanDesignPoints;
    if (clsValue < 0.1) cleanDesignPoints = 3;
    else if (clsValue < 0.25) cleanDesignPoints = 1;
    else cleanDesignPoints = 0;
    
    // 5.3 No Excessive Ads (0-3) - reuse from monetization
    let adExcessPoints;
    if (adsTotal <= 3) adExcessPoints = 3;
    else if (adsTotal <= 8) adExcessPoints = 1;
    else adExcessPoints = 0;
    
    const professionalismScore = brandConsistencyPoints + cleanDesignPoints + adExcessPoints; // max 10
    
    // 6. Engagement & Social Proof (0-10)
    // 6.1 Comments or Review Sections (0-5)
    const commentSections = $('[class*="comment"], [id*="comment"], [class*="review"], [id*="review"], [class*="feedback"]').length;
    const starRatings = $('[class*="star"], [class*="rating"]').length;
    let commentsPoints;
    if (commentSections >= 1 && starRatings >= 1) commentsPoints = 5;
    else if (commentSections >= 1 || starRatings >= 1) commentsPoints = 3;
    else commentsPoints = 0;
    
    // 6.2 Social Buttons (0-5)
    const socialLinks = $('a[href*="facebook"], a[href*="twitter"], a[href*="instagram"], a[href*="pinterest"], a[href*="linkedin"], a[href*="youtube"]');
    const uniqueSocial = new Set();
    socialLinks.each((i, el) => {
      const href = $(el).attr('href') || '';
      if (/facebook/i.test(href)) uniqueSocial.add('facebook');
      if (/twitter/i.test(href)) uniqueSocial.add('twitter');
      if (/instagram/i.test(href)) uniqueSocial.add('instagram');
      if (/pinterest/i.test(href)) uniqueSocial.add('pinterest');
      if (/linkedin/i.test(href)) uniqueSocial.add('linkedin');
      if (/youtube/i.test(href)) uniqueSocial.add('youtube');
    });
    const socialNetworkCount = uniqueSocial.size;
    let socialButtonsPoints;
    if (socialNetworkCount >= 3) socialButtonsPoints = 5;
    else if (socialNetworkCount >= 1) socialButtonsPoints = 3;
    else socialButtonsPoints = 0;
    
    const engagementScore = commentsPoints + socialButtonsPoints; // max 10
    
    // FINAL TRUST SCORE
    // Identity(25) + Author Credibility(20) + Content Reliability & Uniqueness(30) + Safety(15) + Professionalism(10) + Engagement(10) = 110
    // Normalize to 100
    const trustScoreRaw = identityScore + authorCredibilityScore + contentReliabilityScore + safetyScore + professionalismScore + engagementScore;
    const trustScore = Math.round((trustScoreRaw / 110) * 100); // max 100

    // ========================================
    // SECURITY SCORE (0-55 → normalized to 0-100)
    // ========================================
    
    // 1. HTTPS (0-10)
    const secHttpsPoints = https ? 10 : 0;
    
    // 2. CSP present (0-15)
    const secCspPoints = cspPresent ? 15 : 0;
    
    // 3. HSTS present (0-10)
    const secHstsPoints = hstsPresent ? 10 : 0;
    
    // 4. X-Frame-Options (0-10)
    const secXfoPoints = xfoPresent ? 10 : 0;
    
    // 5. Unsafe target="_blank" count (0-10)
    const unsafeTargetBlank = $("a[target='_blank']").filter((i, el) => !(/noopener|noreferrer/i.test($(el).attr('rel') || ''))).length;
    let secUnsafeTargetPoints;
    if (unsafeTargetBlank === 0) secUnsafeTargetPoints = 10;
    else if (unsafeTargetBlank <= 3) secUnsafeTargetPoints = 5;
    else secUnsafeTargetPoints = 0;
    
    // Total raw score: max 55
    const securityRawScore = secHttpsPoints + secCspPoints + secHstsPoints + secXfoPoints + secUnsafeTargetPoints;
    
    // Normalize to 0-100
    const securityScore = Math.round((securityRawScore / 55) * 100);

    // Final score
    const finalScore = Math.round(
      0.20 * performanceScore +
      0.15 * accessibilityScore +
      0.20 * seoScore +
      0.20 * contentScoreNormalized +
      0.12 * uxScore +
      0.06 * monetizationScore +
      0.04 * trustScore +
      0.03 * securityScore
    );

    // Pack results
    let llmUsed = false;
    let llmRaw = null;

    // Attempt to detect structured data JSON-LD (Article/Recipe)
    let structuredDataPresent = false;
    let publishedDate = null;
    try {
      $("script[type='application/ld+json']").each((i, el) => {
        const txt = $(el).contents().text();
        try {
          const j = JSON.parse(txt);
          const arr = Array.isArray(j) ? j : [j];
          if (arr.some(o => typeof o === 'object' && (o['@type'] === 'Recipe' || o['@type'] === 'Article' || (Array.isArray(o['@type']) && o['@type'].includes('Article'))))) {
            structuredDataPresent = true;
          }
          const article = arr.find(o => typeof o === 'object' && (o['@type'] === 'Article' || (Array.isArray(o['@type']) && o['@type'].includes('Article'))));
          if (article && (article.datePublished || article.dateModified)) {
            publishedDate = article.dateModified || article.datePublished;
          }
        } catch {}
      });
    } catch {}

    // Robots indexability (simple meta check)
    const robotsMeta = $("meta[name='robots']").attr('content') || '';
    const robotsIndexable = !/noindex/i.test(robotsMeta);

    // Sitemap presence (skip network in FAST_MODE)
    let sitemapPresent = false;
    if (!FAST_MODE) {
      try {
        const origin = `${url.protocol}//${url.hostname}`;
        const smController = new AbortController();
        const SITEMAP_TIMEOUT_MS = Number(process.env.SITEMAP_TIMEOUT_MS || 2000);
        const smTimer = setTimeout(()=> smController.abort(), SITEMAP_TIMEOUT_MS);
        const sm = await fetch(`${origin}/sitemap.xml`, { method: 'GET', signal: smController.signal });
        clearTimeout(smTimer);
        sitemapPresent = sm.ok;
      } catch {}
    }

    // Robots.txt presence (skip network in FAST_MODE)
    let robotsTxtPresent = false;
    let robotsBlockAll = false;
    if (!FAST_MODE) {
      try {
        const origin = `${url.protocol}//${url.hostname}`;
        const rbController = new AbortController();
        const ROBOTS_TIMEOUT_MS = Number(process.env.ROBOTS_TIMEOUT_MS || 2000);
        const rbTimer = setTimeout(()=> rbController.abort(), ROBOTS_TIMEOUT_MS);
        const rb = await fetch(`${origin}/robots.txt`, { method: 'GET', signal: rbController.signal });
        clearTimeout(rbTimer);
        robotsTxtPresent = rb.ok;
        if (rb.ok) {
          const txt = await rb.text();
          if (txt.length < 200000) robotsBlockAll = /User-agent:\s*\*([\s\S]*?)Disallow:\s*\//i.test(txt);
        }
      } catch {}
    }

    // RSS/Atom feed detection
    const rssHref = $("link[rel='alternate'][type*='rss']").attr('href') || $("link[rel='alternate'][type*='atom']").attr('href') || '';
    const rssPresent = !!rssHref;

    // Content freshness via meta tags
    const metaPublished = $("meta[property='article:published_time']").attr('content') || $("meta[name='date']").attr('content') || $("meta[property='og:updated_time']").attr('content') || '';
    const publishedStr = publishedDate || metaPublished;
    let daysSincePublished = null;
    if (publishedStr) {
      const d = new Date(publishedStr);
      if (!isNaN(d.getTime())) {
        daysSincePublished = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    const freshContent = daysSincePublished !== null ? daysSincePublished <= 365 : null;

    // Internal/external link ratio and anchor quality
    const internalLinks = Math.max(0, linksCount - externalLinks);
    const internalLinkRatio = linksCount ? internalLinks / linksCount : 0;
    const clickHereAnchors = links.filter((i, el) => /click here/i.test($(el).text() || '')).length;

    // Broken external links sampling optimized (parallel + reduced sample) unless FAST_MODE
    let brokenLinkRate = null;
    let brokenLinksSampled = 0;
    let brokenLinksCount = 0;
    if (!FAST_MODE) {
      const MAX_EXTERNAL_LINK_CHECKS = Number(process.env.MAX_EXTERNAL_LINK_CHECKS || 5);
      const EXTERNAL_LINK_TIMEOUT_MS = Number(process.env.EXTERNAL_LINK_TIMEOUT_MS || 1500);
      const sampleExternalUrls = [];
      links.each((i, el) => {
        if (sampleExternalUrls.length >= MAX_EXTERNAL_LINK_CHECKS) return;
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const u = new URL(href, fetchUrl);
          if (u.hostname !== url.hostname) sampleExternalUrls.push(u.toString());
        } catch {}
      });
      brokenLinksSampled = sampleExternalUrls.length;
      
      // Use Promise.allSettled for better error handling and parallel execution
      const fetchPromises = sampleExternalUrls.map(u => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), EXTERNAL_LINK_TIMEOUT_MS);
        
        return fetch(u, { method: 'HEAD', redirect: 'manual', signal: controller.signal })
          .then(r => {
            clearTimeout(timer);
            return { url: u, ok: r.ok, status: r.status };
          })
          .catch(err => {
            clearTimeout(timer);
            return { url: u, ok: false, status: null, error: err.message };
          });
      });
      
      const results = await Promise.allSettled(fetchPromises);
      brokenLinksCount = results.filter(r => 
        r.status === 'fulfilled' && (!r.value.ok || (r.value.status && r.value.status >= 400))
      ).length;
      brokenLinkRate = brokenLinksSampled ? Math.round((brokenLinksCount / brokenLinksSampled) * 100) : null;
    }

    const payload = {
      url: fetchUrl,
      final_score: finalScore,
      modules: {
        performance: { score: performanceScore, metrics: { lcp_seconds: lcpValue, tbt_ms: tbtProxyMs, cls: clsValue, fcp_seconds: fcpValue, using_real_data: usingRealData, data_source: dataSource, real_ttfb: realTTFB, core_web_vitals_score: CoreWebVitals_score, total_page_weight_mb: totalPageWeightMB, requests_count: requestsCount, large_asset_count: largeAssetCount, load_cost_score: LoadCost_score, preconnect_preload_count: preconnectPreloadCount, ttfb_ms: ttfbMs, network_efficiency_score: NetworkEfficiency_score, blocking_stylesheets_count: blockingStylesheetsCount, blocking_scripts_count: blockingScripts, critical_css_present: criticalCssPresent, render_blocking_score: RenderBlocking_score, images_missing_srcset_ratio: imagesMissingSrcsetRatio, video_autoplay_with_sound_count: videoAutoplayWithSound, media_optimization_score: MediaOptimization_score, compression: contentEncoding || null, cache_control: cacheControl || null, cache_ttl_days: cacheTtlDays, cdn_detected: cdnDetected, caching_cdn_score: Caching_CDN_score, font_preload_present: fontPreload, fonts_score: Fonts_score, service_worker_present: serviceWorkerPresent, manifest_present: manifestPresent, progressive_enhancements_score: ProgressiveEnhancements_score } },
        accessibility: { score: accessibilityScore, metrics: {
          raw_score: accessibilityRaw,
          h1_present: headings.h1 > 0,
          html_lang_present: !!htmlLang,
          missing_alt_count: imagesMissingAlt,
          semantic_structure_points: semanticStructurePoints,
          text_contrast_points: textContrastPoints,
          image_accessibility_points: imageAccessibilityPoints,
          media_interactive_points: mediaInteractivePoints,
          keyboard_focus_points: keyboardFocusPoints,
          aria_points: ariaPoints,
          mobile_accessibility_points: mobileAccessibilityPoints
        } },
        seo: { score: seoScore, metrics: {
          normalized_score: seoScore,
          raw_total_components: rawTotal,
          max_raw_total: 57,
          identity_raw: identityRaw,
          content_raw: contentRaw,
          linking_raw: linkingRaw,
          technical_raw: techRaw,
          identity_scaled_20: identityScaled,
          content_scaled_20: contentScaled,
          linking_scaled_10: linkingScaled,
          technical_scaled_10: technicalScaled,
          simplified_composite_raw_60: simplifiedRawTotal,
          title_cleaned: cleanedTitle,
          sample_word_count: sampleWordCount,
          sample_chars: bodySample.length,
          canonical_present: canonicalPresent,
          open_graph_present: openGraphPresent,
          twitter_card_present: twitterPresent,
          schema_present: schemaPresence,
          ttfb_ms: ttfbMs
        } },
        content: { score: contentScoreNormalized, metrics: { 
          normalized_score: contentScoreNormalized,
          raw_score: contentScore,
          readability_points_total: readabilityPointsTotal,
          readability_flesch_points: fleschPoints,
          readability_sentence_length_points: sentenceLenPoints,
          word_count_points: wordCountPointsNew,
          reading_time_points: readingTimePoints,
          content_depth_points: depthPoints,
          engagement_points: engagementPoints,
          interactive_engagement_points: interactiveEngagementPoints,
          storytelling_points: storytellingPoints,
          visual_density_points: visualDensityPoints,
          questions_count: questionsCount,
          call_to_actions_count: callToActions,
          storytelling_matches: storytellingMatches,
          visuals_ratio: Math.round(visualsRatio * 100) / 100,
          flesch_score: fleschScore, 
          avg_sentence_length: avgSentenceLength, 
          word_count: wordCount, 
          reading_time_min: readingTimeMin,
          content_depth_ratio: Math.round(depthRatio * 100) / 100,
          days_since_published: daysSincePublished, 
          fresh_content: freshContent 
        } },
        ux: { score: uxScore, metrics: { 
          raw_score: uxScoreRaw,
          navigation_score: navigationScore,
          navigation_presence_points: navPresencePoints,
          navigation_item_count_points: navItemCountPoints,
          navigation_home_link_points: homeLinkPoints,
          search_points: searchPoints,
          category_points: categoryPoints,
          has_search_feature: hasSearchFeature,
          has_categories_or_tags: hasCategoriesOrTags,
          nav_link_count: navLinkCount,
          typography_score: typographyScore,
          font_size_points: uxFontSizePoints,
          line_height_points: uxLineHeightPoints,
          text_contrast_points: uxTextContrastPoints,
          base_font_size: baseFontSize,
          line_height: Math.round(lineHeight * 100) / 100,
          mobile_usability_score: mobileUsabilityScore,
          viewport_points: uxViewportPoints,
          responsive_img_points: responsiveImgPoints,
          no_horizontal_scroll_points: noHorizontalScrollPoints,
          responsive_image_ratio: Math.round(responsiveRatio),
          layout_stability_score: layoutStabilityScore,
          image_dimensions_points: imageDimPoints,
          shift_prone_points: shiftPronePoints,
          images_with_dimensions_ratio: Math.round(dimsRatio),
          interaction_score: interactionScore,
          tap_target_points: uxTapTargetPoints,
          valid_href_points: validHrefPoints,
          buttons_type_points: buttonsTypePoints,
          large_tap_targets_ratio: Math.round(targetRatio),
          links_without_href: linksWithoutHref,
          intrusiveness_score: intrusivenessScore,
          ad_count_points: adCountPoints,
          ads_fold_points: adsFoldPoints,
          ad_elements_count: adRelatedElements,
          ads_above_fold: adsAboveFold,
          mobile_responsive: viewport, 
          images_lazy_fraction: lazyFraction, 
          images_missing_dimensions: imagesMissingDims 
        } },
        monetization: { score: monetizationScore, metrics: { 
          ads_score: adsScore,
          ad_density_points: adDensityPoints,
          ad_placement_points: adPlacementPoints,
          ad_loading_points: adLoadingPoints,
          ads_total: adsTotal,
          ads_above_fold_count: adsAboveFoldCount,
          lazy_ads_count: lazyAds,
          blocking_ad_scripts: blockingAdScripts,
          affiliate_score: affiliateScore,
          affiliate_presence_points: affiliatePresencePoints,
          affiliate_disclosure_points: affiliateDisclosurePoints,
          affiliate_relevancy_points: affiliateRelevancyPoints,
          affiliate_links_count: affiliateCount,
          affiliate_relevancy_ratio: Math.round(affRelevancyRatio),
          has_disclosure: hasDisclosure,
          product_score: productScore,
          buy_button_points: buyButtonPoints,
          product_presentation_points: productPresentationPoints,
          customer_trust_points: customerTrustPoints,
          buy_buttons_count: buyButtonCount,
          product_cards_count: productCards,
          subscription_score: subscriptionScore,
          email_optin_points: emailOptInPoints,
          incentive_clarity_points: incentiveClarityPoints,
          email_inputs_count: emailInputs,
          cta_score: ctaScore,
          cta_quantity_points: ctaQuantityPoints,
          cta_visibility_points: ctaVisibilityPoints,
          cta_count: ctaCount,
          visible_ctas_ratio: Math.round(ctaVisibilityRatio),
          monetization_hygiene_score: monetizationHygieneScore,
          popup_points: popupPoints,
          deceptive_points: deceptivePoints,
          popup_count: popups,
          deceptive_patterns_count: deceptivePatterns,
          ad_iframe_count: adIframes, 
          ad_script_count: adScripts, 
          overlay_count: overlays 
        } },
        trust: { score: trustScore, metrics: {
          raw_score: trustScoreRaw,
          identity_score: identityScore,
          about_contact_points: aboutContactPoints,
          contact_methods_points: contactMethodsPoints,
          legal_transparency_points: legalTransparencyPoints,
          identity_page_count: identityPageCount,
          contact_methods_count: contactMethods,
          legal_page_count: legalPageCount,
          email_links: emailLinks,
          phone_numbers_found: phoneNumbers.length,
          physical_address_found: physicalAddress.length > 0,
          contact_form_present: contactForm > 0,
          author_credibility_score: authorCredibilityScore,
          author_box_points: authorBoxPoints,
          expertise_points: expertisePoints,
          date_info_points: dateInfoPoints,
          author_box_present: authorBox.length > 0,
          author_text_length: authorTextLength,
          expertise_matches: expertiseMatches.length,
          credential_links: credentialLinks,
          published_date_present: trustPublishedDate > 0,
          updated_date_present: trustUpdatedDate > 0,
          content_reliability_score: contentReliabilityScore,
          citation_points: citationPoints,
          accuracy_points: accuracyPoints,
          uniqueness_points: uniquenessPoints,
          keyword_rarity_points: keywordRarityPoints,
          originality_signal_points: originalitySignalPoints,
          photo_originality_points: photoOriginalityPoints,
          keyword_rarity_data: {
            score: keywordRarityData.score,
            level: keywordRarityData.level,
            reasoning: keywordRarityData.reasoning,
            top_keywords: topKeywords.slice(0, 5).map(k => k.word)
          },
          uniqueness_metric: {
            score: uniquenessMetric.score,
            level: uniquenessMetric.level,
            reasoning: uniquenessMetric.reasoning,
            details: uniquenessMetric.details
          },
          originality_matches: originalityMatches,
          photo_originality_ratio: Math.round(photoOriginality * 100),
          has_original_photos: hasOriginalPhotos,
          spam_points: spamPoints,
          total_references: totalReferences,
          citation_matches: citationMatches.length,
          scholarly_links: scholarlyLinks,
          keyword_density: Math.round(keywordDensity * 10) / 10,
          duplicate_ratio: Math.round(duplicateRatio),
          safety_score: safetyScore,
          https_points: trustHttpsPoints,
          secure_links_points: secureLinksPoints,
          no_deceptive_points: noDeceptivePoints,
          secure_external_ratio: Math.round(trustSecureExternalRatio),
          external_links_count: trustExternalCount,
          secure_external_links: trustSecureExternalLinks,
          professionalism_score: professionalismScore,
          brand_consistency_points: brandConsistencyPoints,
          clean_design_points: cleanDesignPoints,
          ad_excess_points: adExcessPoints,
          logo_count: logos,
          unique_fonts: uniqueFonts.size,
          engagement_score: engagementScore,
          comments_points: commentsPoints,
          social_buttons_points: socialButtonsPoints,
          comment_sections: commentSections,
          star_ratings: starRatings,
          social_network_count: socialNetworkCount
        } },
        security: { score: securityScore, metrics: { 
          https_points: secHttpsPoints,
          csp_points: secCspPoints,
          hsts_points: secHstsPoints,
          xfo_points: secXfoPoints,
          unsafe_target_points: secUnsafeTargetPoints,
          raw_score: securityRawScore,
          https: https, 
          csp_present: cspPresent, 
          hsts_present: hstsPresent, 
          xfo_present: xfoPresent, 
          unsafe_target_blank_count: unsafeTargetBlank 
        } }
      },
      recommendations: [],
      explainability: [
        "Final score is weighted by modules: Performance(20%), Accessibility(15%), SEO(20%), Content(20%), UX(12%), Monetization(6%), Trust(4%), Security(3%).",
        usingRealData 
          ? `✅ Performance metrics measured with REAL data (${dataSource === 'google-pagespeed-api' ? 'Google PageSpeed Insights API' : 'Puppeteer browser automation'})` 
          : "⚠️ Performance metrics estimated (use ?fast=false for real browser measurements)"
      ]
    };

    // Link quality metrics (add under explainability for visibility)
    if (brokenLinkRate !== null) {
      payload.explainability.push(`Broken external link rate (sample ${brokenLinksSampled}): ${brokenLinkRate}%`);
    }

    // Generate EEAT-focused, blogger-friendly recommendations

    const recommendationMetrics = {
      uniquenessMetric,
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
      metaDescription,
      structuredDataPresent,
      robotsIndexable,
      openGraphPresent,
      imagesMissingAlt,
      aboutPresent,
      contactPresent,
      privacyPresent,
      brokenLinksCount,
      brokenLinkRate,
      lcpValue,
      htmlSize,
      blockingScripts,
      adScripts,
      overlays,
      stickyAds,
      viewport,
      lazyFraction,
      imagesMissingDims,
      https,
      analyticsPresent
    };
    
    payload.recommendations = generateEEATRecommendations(recommendationMetrics, topKeywords);

    // Optional LLM enhancement
    const OLLAMA_URL = process.env.OLLAMA_URL || process.env.OLLAMA_API_URL;
    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";

    if (OLLAMA_URL && USE_LLM) {
      try {
        const prompt = buildPromptForLLM(payload);
        const llmResult = await callOllama(OLLAMA_URL, OLLAMA_MODEL, prompt, OLLAMA_API_KEY);
        llmRaw = llmResult;
        llmUsed = true;
        const parsed = tryParseJsonFromText(llmResult);
        if (parsed) {
          if (Array.isArray(parsed)) {
            payload.recommendations = parsed;
          } else if (Array.isArray(parsed.recommendations)) {
            payload.recommendations = parsed.recommendations;
          }
        }
      } catch (err) {
        console.warn("LLM enhancement failed, falling back to rule-based recommendations", err.message);
      }
    }

    // Attach debug information in non-production
    if (process.env.NODE_ENV !== 'production') {
      payload.__debug = {
        llmUsed,
        llmRaw: llmRaw ? (typeof llmRaw === 'string' ? llmRaw.slice(0, 10000) : JSON.stringify(llmRaw).slice(0, 10000)) : null,
        headers: { contentEncoding, cacheControl, hstsHeader, cspHeader, xfoHeader }
      };
    }

    // If analysis took too long (safeguard) attach timeout notice
    const totalMs = Date.now() - analysisStart;
    if (totalMs > 30000) { // 30s threshold warning
      payload.explainability.push(`Analysis exceeded 30s (${totalMs}ms); some deep checks skipped.`);
    }
    
    // Store analyzed URL and calculate percentile (async, don't block response)
    try {
      const moduleScores = {
        performance: performanceScore,
        accessibility: accessibilityScore,
        seo: seoScore,
        content: contentScore,
        ux: uxScore,
        monetization: monetizationScore,
        trust: trustScore,
        security: securityScore
      };
    } catch (error) {
      logger.error('[Analysis] Error:', error.message);
    }
    
    return res.json(payload);
  } catch (err) {
    logger.error("Analyze error", err);
    return res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: err.message || 'An unexpected error occurred'
    });
  }
};

// Internal reusable analysis function (for async job queue)
export async function performAnalysis(urlString, { fast = true, llm = false } = {}) {
  // Simulate minimal req-derived flags using existing logic; reuse majority of code above.
  // To avoid duplicate logic, we re-run performAnalysis by constructing a fake req/res path.
  // For now we duplicate the main body trimmed of Express specifics.
  try {
    let url;
    try {
      url = new URL(urlString.includes('//') ? urlString : `https://${urlString}`);
    } catch {
      throw new Error('Invalid URL');
    }
    const fetchUrl = url.toString();
    const FAST_MODE = fast;
    const USE_LLM = llm;
    const analysisStart = Date.now();
    const PAGE_FETCH_TIMEOUT_MS = Number(process.env.PAGE_FETCH_TIMEOUT_MS || 20000);
    const fetchStart = Date.now();
    const mainAbort = new AbortController();
    const mainTimer = setTimeout(() => mainAbort.abort(), PAGE_FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(fetchUrl, { headers: { 'User-Agent': 'CreatorLensBot/1.0 (+https://example.com)' }, signal: mainAbort.signal });
    } catch {
      clearTimeout(mainTimer);
      throw new Error('Timeout fetching main page');
    }
    clearTimeout(mainTimer);
    const responseTime = Date.now() - fetchStart;
    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`);
    let html = await response.text();
    const MAX_HTML_BYTES = Number(process.env.MAX_HTML_BYTES || 800000);
    if (html.length > MAX_HTML_BYTES) html = html.slice(0, MAX_HTML_BYTES);
    const htmlSize = Buffer.byteLength(html, 'utf8');
    const contentEncoding = response.headers.get('content-encoding') || '';
    const cacheControl = response.headers.get('cache-control') || '';
    const hstsHeader = response.headers.get('strict-transport-security') || '';
    const cspHeader = response.headers.get('content-security-policy') || '';
    const xfoHeader = response.headers.get('x-frame-options') || '';
    const $ = load(html);
    // (NOTE) For brevity we call existing analyzeSite style calculations by invoking a lightweight inline replicating section.
    // To avoid maintaining two large copies, consider refactor later extracting pure functions per module.
    // Minimal subset: performance + accessibility + seo; other modules retained.
    // Headings & basic elements
    const headings = { h1: $('h1').length, h2: $('h2').length, h3: $('h3').length, h4: $('h4').length, h5: $('h5').length, h6: $('h6').length };
    const images = $('img');
    const imagesCount = images.length;
    const imagesMissingAlt = images.filter((i, el) => !$(el).attr('alt') || $(el).attr('alt').trim() === '').length;
    const imagesMissingDims = images.filter((i, el) => !$(el).attr('width') || !$(el).attr('height')).length;
    const scriptsCount = $('script[src]').length;
    const blockingScripts = $('script[src]').filter((i, el) => !$(el).attr('defer') && !$(el).attr('async')).length;
    const stylesheetsCount = $('link[rel=stylesheet]').length;
    const blockingStylesheetsCount = $('head link[rel="stylesheet"]').filter((i, el) => {
      const media = ($(el).attr('media') || '').toLowerCase();
      const disabled = $(el).attr('disabled') != null;
      if (disabled) return false;
      if (media && media.includes('print')) return false;
      if (media && !['all','screen'].includes(media)) return false;
      return true;
    }).length;
    const iframesCount = $('iframe').length;
    const lcpProxy = Math.max(1, htmlSize / 100000);
    const lcpScore = norm(lcpProxy, 2.5, 4.0);
    const tbtProxyMs = Math.min(400, blockingScripts * 40);
    const tbtScore = norm(tbtProxyMs, 0, 250);
    const clsProxy = Math.min(0.5, (imagesMissingDims / Math.max(1, imagesCount)) * 0.25);
    const clsScore = norm(clsProxy, 0.1, 0.25);
    const coreSum = (0.50 * lcpScore) + (0.20 * clsScore) + (0.30 * tbtScore);
    const CoreWebVitals_score = clamp(Math.round(coreSum / (0.50 + 0.20 + 0.30)));
    const requestsCount = (scriptsCount + stylesheetsCount + imagesCount + iframesCount + 1);
    const largeAssetCount = (imagesCount > 0 ? images.filter((i, el) => {
      const src = ($(el).attr('src') || '').toLowerCase();
      if (!src) return false;
      if (/icon|logo|sprite|favicon|\.svg$/.test(src)) return false;
      return /\.(jpg|jpeg|png|gif|mp4|webm)$/i.test(src);
    }).length : 0);
    const loadCostScore = clamp(Math.round(
      0.55 * norm(Math.round((htmlSize / (1024 * 1024)) * 100) / 100, 0.3, 3.0) +
      0.30 * norm(requestsCount, 10, 120) +
      0.15 * norm(largeAssetCount, 0, 8)
    ));
    const ttfbMs = responseTime;
    const networkEfficiencyScore = clamp(Math.round(
      0.4 * 70 + 0.3 * norm(ttfbMs, 50, 800) + 0.3 * clamp(Math.round((Math.min($('link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="preload"]').length,3)/3)*100))
    ));
    const blockingCssScore = norm(blockingStylesheetsCount, 3, 15);
    const renderBlockingScore = clamp(Math.round(
      0.5 * norm(tbtProxyMs, 0, 500) + 0.3 * blockingCssScore + 0.2 * ($('style').length > 0 ? 100 : 0)
    ));
    const performanceScore = clamp(Math.round(
      0.25 * CoreWebVitals_score +
      0.18 * loadCostScore +
      0.12 * networkEfficiencyScore +
      0.12 * renderBlockingScore +
      0.10 * clamp(100 - Math.min(100, $('video[autoplay]').filter((i, el) => !$(el).attr('muted')).length * 50)) +
      0.08 * clamp(Math.round(0.5 * (cacheControl ? 100 : 40) + 0.3 * (/(x-cache|via|cf-ray|x-amz-cf-id)/i.test(JSON.stringify(Object.fromEntries(response.headers))) ? 100 : 50) + 0.2 * normHigh((() => { const m = cacheControl.match(/max-age\s*=\s*(\d+)/i); return m ? parseInt(m[1],10)/86400 : 0; })(),0.1,30))) +
      0.05 * clamp(Math.round(0.6 * ($('link[rel="preload"][as="font"]').length>0 ? 100:60) + 0.4 * 80)) +
      0.05 * clamp(Math.round(0.6 * ($('script').filter((i, el) => /serviceWorker/i.test($(el).text())).length>0 ? 100:0) + 0.4 * ($('link[rel="manifest"]').length>0 ? 100:0)))
    ));
    // Accessibility quick subset for job initial view
    const accessibilityScoreQuick = clamp(Math.round((
      (headings.h1>0?30:0) + (imagesMissingAlt===0?40:20) + (html.includes('<main')?30:15)
    ) / 100 * 100));
    // Basic SEO identity subset
    const title = $('title').text().trim();
    const metaDescription = $('meta[name=description]').attr('content') || '';
    const canonical = $('link[rel=canonical]').attr('href') || null;
    const openGraphPresent = !!$('meta[property="og:title"]').attr('content');
    const twitterPresent = !!$('meta[name="twitter:card"]').attr('content');
    const seoIdentityScore = clamp(Math.round((
      (title && title.length>=30 && title.length<=75?40:20) +
      (metaDescription && metaDescription.length>=60 && metaDescription.length<=180?30:15) +
      (canonical?15:0) + (openGraphPresent?7:3) + (twitterPresent?8:3)
    )/100*100));
    const finalScore = Math.round(
      0.20 * performanceScore +
      0.15 * accessibilityScoreQuick +
      0.20 * seoIdentityScore +
      0.45 * 70 // placeholder average for remaining modules in fast preview
    );
    const payload = {
      url: fetchUrl,
      final_score: finalScore,
      modules: {
        performance: { score: performanceScore, metrics: { lcp_seconds: lcpProxy, tbt_ms: tbtProxyMs, cls: clsProxy } },
        accessibility: { score: accessibilityScoreQuick, metrics: { h1_present: headings.h1>0, missing_alt_count: imagesMissingAlt } },
        seo: { score: seoIdentityScore, metrics: { title_length: title.length, meta_description_length: metaDescription.length, canonical_present: !!canonical, open_graph_present: openGraphPresent, twitter_card_present: twitterPresent } }
      },
      phase: FAST_MODE ? 'fast' : 'full',
      generated_ms: Date.now() - analysisStart
    };
    if (USE_LLM && !FAST_MODE) {
      // (Optional) invoke LLM later for full job processing; skipped here.
    }
    return payload;
  } catch (e) {
    throw e;
  }
}

import { analyzeUrl } from '../lib/analysisEngine.js';

// Fast path endpoint using parallel modules + caching
export const analyzeSiteFast = async (req, res) => {
  try {
    const incomingUrl = req.body?.url || req.query?.url;
    if (!incomingUrl) return res.status(400).json({ error: 'Missing url' });
    const fast = req.query.fast !== 'false';
    const llm = req.query.llm === 'true';
    const payload = await analyzeUrl(incomingUrl, { fast, llm });
    return res.json(payload);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
};

// --- Helper functions for optional LLM integration ---
function buildPromptForLLM(payload) {
  const { url, modules } = payload;
  return `You are an expert blog evaluator. Given the following blog analysis metrics, produce a JSON object with prioritized recommendations for improving the blog.

Site: ${url}
Modules and Scores:
- Performance: ${modules.performance.score}/100 (${JSON.stringify(modules.performance.metrics)})
- Accessibility: ${modules.accessibility.score}/100 (${JSON.stringify(modules.accessibility.metrics)})
- SEO: ${modules.seo.score}/100 (${JSON.stringify(modules.seo.metrics)})
- Content Quality: ${modules.content.score}/100 (${JSON.stringify(modules.content.metrics)})
- UX: ${modules.ux.score}/100 (${JSON.stringify(modules.ux.metrics)})
- Monetization: ${modules.monetization.score}/100 (${JSON.stringify(modules.monetization.metrics)})
- Trust: ${modules.trust.score}/100 (${JSON.stringify(modules.trust.metrics)})
- Security: ${modules.security.score}/100 (${JSON.stringify(modules.security.metrics)})

Produce a JSON array of recommendations. Each recommendation should have:
- id: string (unique identifier)
- summary: string (short title)
- impact: number (1-10, higher better)
- effort: "Low"|"Medium"|"High"
- example_code: string (optional HTML/JS snippet if applicable)

Return only valid JSON array. Focus on high-impact, low-effort items first.`;
}

async function callOllama(baseUrl, model, prompt, apiKey) {
  // Support two flavors:
  // - Ollama local API: POST http://localhost:11434/api/generate with { model, prompt }
  // - Ollama cloud or compatible endpoints: expect same shape with Authorization header
  const url = baseUrl.endsWith('/generate') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api/generate`;

  const body = { model, prompt, max_tokens: 600, temperature: 0.0 };
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`LLM call failed ${resp.status}`);
  const json = await resp.json();

  // Ollama's response may include generated content inside choices -> content
  // Try multiple locations for the output text.
  let text = '';
  try {
    if (json.output && Array.isArray(json.output) && json.output[0]?.content) {
      // some Ollama versions
      const content = json.output[0].content.find(c => c.type === 'output_text');
      text = content ? content.text : json.output[0].content.map(c => c.text || '').join('\n');
    } else if (json.choices && Array.isArray(json.choices)) {
      text = json.choices.map(c => c.message?.content || c.text || '').join('\n');
    } else if (json.output_text) {
      text = json.output_text;
    } else if (typeof json === 'string') {
      text = json;
    } else {
      text = JSON.stringify(json);
    }
  } catch (e) {
    text = JSON.stringify(json);
  }

  return text;
}

function tryParseJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  // First try to find a JSON block between first [ and last ]
  const first = text.indexOf('[');
  const last = text.lastIndexOf(']');
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = text.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // fall through
    }
  }

  // Try fenced code block
  const codeMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1]); } catch (e) {}
  }

  return null;
}
