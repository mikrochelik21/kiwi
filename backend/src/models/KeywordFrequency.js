import mongoose from 'mongoose';

/**
 * KeywordFrequency Model
 * Caches search frequency data for keyword combinations
 * Used to determine content uniqueness without repeatedly querying external APIs
 */
const keywordFrequencySchema = new mongoose.Schema({
  // The keyword combination (normalized, lowercase, sorted alphabetically)
  keywords: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Estimated number of search results for this keyword combination
  searchCount: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Source of the search data (e.g., 'google', 'bing', 'serpapi')
  source: {
    type: String,
    required: true,
    enum: ['google', 'bing', 'serpapi', 'manual'],
    default: 'google'
  },
  
  // When this data was last checked/updated
  lastChecked: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Additional metadata
  metadata: {
    // Top competing URLs for these keywords
    topUrls: [{
      url: String,
      title: String,
      snippet: String
    }],
    
    // Related search terms
    relatedSearches: [String],
    
    // Query took to get results (for performance monitoring)
    queryTime: Number
  }
}, {
  timestamps: true
});

// TTL index - automatically delete entries older than 30 days
// This keeps the cache fresh and prevents stale data
keywordFrequencySchema.index(
  { lastChecked: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
);

// Compound index for faster lookups
keywordFrequencySchema.index({ keywords: 1, source: 1 });

/**
 * Static method to find or create a keyword frequency entry
 * @param {string} keywords - Normalized keyword string
 * @param {number} searchCount - Search result count
 * @param {string} source - Data source
 * @returns {Promise<Object>} - The keyword frequency document
 */
keywordFrequencySchema.statics.upsertKeywords = async function(keywords, searchCount, source = 'google', metadata = {}) {
  return await this.findOneAndUpdate(
    { keywords },
    {
      keywords,
      searchCount,
      source,
      lastChecked: new Date(),
      metadata
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

/**
 * Static method to get cached result or return null if expired/missing
 * @param {string} keywords - Normalized keyword string
 * @returns {Promise<Object|null>} - Cached data or null
 */
keywordFrequencySchema.statics.getCached = async function(keywords) {
  const cacheMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  const result = await this.findOne({ keywords });
  
  if (!result) return null;
  
  // Check if cache is still valid
  const ageInMs = Date.now() - new Date(result.lastChecked).getTime();
  if (ageInMs > cacheMaxAge) {
    return null; // Expired
  }
  
  return result;
};

/**
 * Instance method to determine uniqueness score based on search count
 * @returns {Object} - Score and reasoning
 */
keywordFrequencySchema.methods.getUniquenessScore = function() {
  const count = this.searchCount;
  
  if (count < 1000) {
    return {
      score: 10,
      level: 'very-unique',
      reasoning: `Only ${count.toLocaleString()} results found - highly unique content`
    };
  } else if (count < 10000) {
    return {
      score: 7,
      level: 'moderately-unique',
      reasoning: `${count.toLocaleString()} results found - moderately unique content`
    };
  } else if (count < 100000) {
    return {
      score: 4,
      level: 'somewhat-unique',
      reasoning: `${count.toLocaleString()} results found - somewhat unique content`
    };
  } else {
    return {
      score: 1,
      level: 'common',
      reasoning: `${count.toLocaleString()}+ results found - common content topic`
    };
  }
};

export default mongoose.model('KeywordFrequency', keywordFrequencySchema);
