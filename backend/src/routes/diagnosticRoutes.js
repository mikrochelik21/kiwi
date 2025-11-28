import express from 'express';
import KeywordFrequency from '../models/KeywordFrequency.js';
import WordFrequency from '../models/WordFrequency.js';

const router = express.Router();

/**
 * GET /api/diagnostic/keywords
 * View all keyword frequency data in MongoDB
 */
router.get('/keywords', async (req, res) => {
  try {
    const count = await KeywordFrequency.countDocuments();
    const allKeywords = await KeywordFrequency.find()
      .sort({ lastChecked: -1 });
    
    const formatted = allKeywords.map(k => ({
      keywords: k.keywords,
      searchCount: k.searchCount,
      source: k.source,
      lastChecked: k.lastChecked,
      age: `${Math.round((Date.now() - k.lastChecked) / 1000 / 60)} min ago`,
      score: k.getUniquenessScore()
    }));
    
    // Get top 5 most common (highest search count)
    const mostCommon = [...allKeywords]
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, 5)
      .map(k => ({
        keywords: k.keywords,
        searchCount: k.searchCount,
        score: k.getUniquenessScore()
      }));
    
    // Get top 5 least common (lowest search count) - most unique!
    const leastCommon = [...allKeywords]
      .sort((a, b) => a.searchCount - b.searchCount)
      .slice(0, 5)
      .map(k => ({
        keywords: k.keywords,
        searchCount: k.searchCount,
        score: k.getUniquenessScore()
      }));
    
    res.json({
      success: true,
      total: count,
      summary: {
        mostCommon,
        leastCommon
      },
      recentAnalyses: formatted.slice(0, 20)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/diagnostic/words
 * View most and least common individual words
 */
router.get('/words', async (req, res) => {
  try {
    const totalWords = await WordFrequency.countDocuments();
    const mostCommon = await WordFrequency.getMostCommon(10);
    const leastCommon = await WordFrequency.getLeastCommon(10);
    
    res.json({
      success: true,
      total: totalWords,
      mostCommon: mostCommon.map(w => ({
        word: w.word,
        totalCount: w.totalCount,
        urlCount: w.urlCount,
        avgPerUrl: (w.totalCount / w.urlCount).toFixed(1)
      })),
      leastCommon: leastCommon.map(w => ({
        word: w.word,
        totalCount: w.totalCount,
        urlCount: w.urlCount,
        avgPerUrl: (w.totalCount / w.urlCount).toFixed(1)
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/diagnostic/keywords/clear
 * Clear all keyword frequency data (for testing)
 */
router.delete('/keywords/clear', async (req, res) => {
  try {
    const keywordResult = await KeywordFrequency.deleteMany({});
    const wordResult = await WordFrequency.deleteMany({});
    res.json({
      success: true,
      message: `Deleted ${keywordResult.deletedCount} keyword combinations and ${wordResult.deletedCount} individual words`,
      deletedKeywords: keywordResult.deletedCount,
      deletedWords: wordResult.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/diagnostic/health
 * Quick health check
 */
router.get('/health', async (req, res) => {
  try {
    const keywordCount = await KeywordFrequency.countDocuments();
    const wordCount = await WordFrequency.countDocuments();
    
    res.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      server: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5001
      },
      features: {
        keywordCaching: keywordCount > 0 ? 'active' : 'ready',
        wordTracking: wordCount > 0 ? 'active' : 'ready',
        totalKeywordCombinations: keywordCount,
        totalUniqueWords: wordCount
      },
      endpoints: {
        analyze: '/api/analyze',
        notes: '/api/notes',
        auth: '/api/auth',
        diagnostic: '/api/diagnostic'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/diagnostic/test-fetch
 * Test external website fetching capabilities
 */
router.get('/test-fetch', async (req, res) => {
  const testUrl = req.query.url || 'https://example.com';
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(testUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeout);
    
    res.json({
      success: true,
      url: testUrl,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      canFetch: response.ok
    });
  } catch (error) {
    res.json({
      success: false,
      url: testUrl,
      error: error.message,
      type: error.name,
      canFetch: false
    });
  }
});

export default router;
