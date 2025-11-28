// Comprehensive list of English stop words to filter out common/meaningless words
// These words don't contribute to content uniqueness analysis

const stopWords = new Set([
  // Articles
  'a', 'an', 'the',
  
  // Pronouns
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  
  // Conjunctions
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'because', 'although', 'though',
  'while', 'if', 'unless', 'until', 'when', 'where', 'whether',
  
  // Prepositions
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'at',
  'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'by',
  'down', 'during', 'except', 'from', 'in', 'inside', 'into', 'near', 'of', 'off',
  'on', 'onto', 'out', 'outside', 'over', 'through', 'to', 'toward', 'under',
  'underneath', 'up', 'upon', 'with', 'within', 'without',
  
  // Common verbs
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'should', 'could',
  'may', 'might', 'must', 'can', 'shall', 'get', 'got', 'getting', 'go', 'going',
  'gone', 'went', 'make', 'made', 'making', 'take', 'took', 'taken', 'taking',
  
  // Common adjectives/adverbs
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also',
  'then', 'there', 'here', 'now', 'how', 'what', 'who', 'whom', 'whose', 'which',
  'this', 'that', 'these', 'those', 'much', 'many', 'little', 'less', 'least',
  'more', 'most', 'better', 'best', 'worse', 'worst', 'well', 'good', 'bad',
  
  // Numbers
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'first', 'second', 'third', 'fourth', 'fifth',
  
  // Other common words
  'yes', 'no', 'ok', 'okay', 'please', 'thanks', 'thank', 'welcome', 'hello',
  'hi', 'hey', 'bye', 'goodbye', 'see', 'look', 'find', 'found', 'use', 'used',
  'using', 'like', 'want', 'need', 'know', 'think', 'feel', 'seem', 'come',
  'came', 'say', 'said', 'tell', 'told', 'ask', 'asked', 'give', 'gave', 'given',
  'put', 'keep', 'kept', 'let', 'begin', 'began', 'seem', 'seemed', 'become',
  'became', 'show', 'showed', 'shown', 'hear', 'heard', 'leave', 'left', 'feel',
  'felt', 'bring', 'brought', 'hold', 'held', 'write', 'wrote', 'written',
  'stand', 'stood', 'run', 'ran', 'move', 'moved', 'live', 'lived', 'believe',
  'believed', 'happen', 'happened', 'appear', 'appeared', 'continue', 'continued',
  'set', 'help', 'helped', 'talk', 'talked', 'turn', 'turned', 'start', 'started',
  'might', 'next', 'still', 'back', 'even', 'new', 'old', 'long', 'great', 'little',
  'own', 'another', 'every', 'right', 'left', 'last', 'early', 'late', 'different',
  'sure', 'certain', 'possible', 'able', 'since', 'during', 'without', 'however',
  'therefore', 'thus', 'hence', 'indeed', 'moreover', 'furthermore', 'nevertheless',
  'otherwise', 'meanwhile', 'finally', 'perhaps', 'maybe', 'probably', 'likely',
  
  // Web/blog common words (less meaningful)
  'blog', 'post', 'article', 'page', 'site', 'website', 'read', 'reading', 'click',
  'here', 'link', 'share', 'comment', 'comments', 'subscribe', 'follow', 'home',
  'menu', 'search', 'contact', 'about', 'privacy', 'policy', 'terms', 'cookie',
  'cookies', 'copyright', 'reserved', 'rights',
  
  // Common food/cooking blog words (very generic)
  'recipe', 'recipes', 'cook', 'cooking', 'cooked', 'bake', 'baking', 'baked',
  'ingredient', 'ingredients', 'food', 'foods', 'dish', 'dishes', 'meal', 'meals',
  'serve', 'serving', 'servings', 'prep', 'prepare', 'preparation', 'prepared',
  'mix', 'mixed', 'mixing', 'blend', 'blended', 'blending', 'stir', 'stirred',
  'stirring', 'heat', 'heated', 'heating', 'boil', 'boiled', 'boiling', 'simmer',
  'simmered', 'simmering', 'fry', 'fried', 'frying', 'grill', 'grilled', 'grilling',
  'roast', 'roasted', 'roasting', 'taste', 'tasting', 'tastes', 'flavor', 'flavors',
  'season', 'seasoned', 'seasoning', 'salt', 'pepper', 'oil', 'butter', 'water',
  'minute', 'minutes', 'hour', 'hours', 'cup', 'cups', 'tablespoon', 'tablespoons',
  'teaspoon', 'teaspoons', 'tbsp', 'tsp', 'oz', 'ounce', 'ounces', 'pound', 'pounds',
  'gram', 'grams', 'liter', 'liters', 'pinch', 'dash', 'add', 'added', 'adding',
  'pour', 'poured', 'pouring', 'slice', 'sliced', 'slicing', 'chop', 'chopped',
  'chopping', 'cut', 'cutting', 'dice', 'diced', 'dicing', 'mince', 'minced',
  'mincing', 'peel', 'peeled', 'peeling', 'fresh', 'dried', 'frozen', 'canned',
  'organic', 'raw', 'optional', 'desired', 'according', 'instructions', 'step',
  'steps', 'method', 'methods', 'technique', 'techniques', 'tip', 'tips', 'note',
  'notes', 'variation', 'variations', 'substitute', 'substitutes', 'easy', 'simple',
  'quick', 'delicious', 'tasty', 'yummy', 'perfect', 'best', 'homemade', 'healthy',
  'enjoy', 'enjoyed', 'enjoying'
]);

/**
 * Check if a word is a stop word
 * @param {string} word - The word to check
 * @returns {boolean} - True if stop word, false otherwise
 */
function isStopWord(word) {
  return stopWords.has(word.toLowerCase());
}

/**
 * Filter stop words from an array of words
 * @param {string[]} words - Array of words
 * @returns {string[]} - Array with stop words removed
 */
function filterStopWords(words) {
  return words.filter(word => !isStopWord(word));
}

export {
  stopWords,
  isStopWord,
  filterStopWords
};
