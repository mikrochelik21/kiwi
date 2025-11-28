import mongoose from 'mongoose';

/**
 * WordFrequency Model
 * Stores individual word frequencies from analyzed content
 * Helps identify most/least common words across all analyzed blogs
 */
const wordFrequencySchema = new mongoose.Schema({
  // The word (normalized, lowercase)
  word: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Total count across all analyzed pages
  totalCount: {
    type: Number,
    required: true,
    default: 1
  },
  
  // Number of different URLs where this word appeared
  urlCount: {
    type: Number,
    required: true,
    default: 1
  },
  
  // Average Datamuse frequency score (if available)
  dataumuseFrequency: {
    type: Number,
    default: null
  },
  
  // Estimated search volume (from Datamuse mapping)
  estimatedSearchVolume: {
    type: Number,
    default: null
  },
  
  // Last time this word was seen
  lastSeen: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
wordFrequencySchema.index({ totalCount: -1 }); // Most common words
wordFrequencySchema.index({ totalCount: 1 });  // Least common words
wordFrequencySchema.index({ urlCount: -1 });   // Most widespread words

/**
 * Static method to increment word count
 * @param {string} word - The word to increment
 * @param {number} count - How many times it appeared in this page
 * @param {number} datamuseFreq - Datamuse frequency score (optional)
 * @returns {Promise<Object>} - The word frequency document
 */
wordFrequencySchema.statics.incrementWord = async function(word, count = 1, datamuseFreq = null) {
  const update = {
    $inc: { 
      totalCount: count,
      urlCount: 1 
    },
    $set: { lastSeen: new Date() }
  };
  
  if (datamuseFreq !== null) {
    update.$set.datamuseFrequency = datamuseFreq;
  }
  
  return await this.findOneAndUpdate(
    { word },
    update,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

/**
 * Static method to get top N most common words
 * @param {number} limit - Number of words to return
 * @returns {Promise<Array>} - Array of most common words
 */
wordFrequencySchema.statics.getMostCommon = async function(limit = 5) {
  return await this.find()
    .sort({ totalCount: -1 })
    .limit(limit)
    .select('word totalCount urlCount');
};

/**
 * Static method to get top N least common words
 * @param {number} limit - Number of words to return
 * @returns {Promise<Array>} - Array of least common words
 */
wordFrequencySchema.statics.getLeastCommon = async function(limit = 5) {
  return await this.find()
    .sort({ totalCount: 1 })
    .limit(limit)
    .select('word totalCount urlCount');
};

export default mongoose.model('WordFrequency', wordFrequencySchema);
