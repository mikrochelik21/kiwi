# 🔍 Keyword Uniqueness Feature - Testing Guide

## How It Works

When you analyze a blog URL, the system:

1. **Extracts Keywords** - Gets top 10 meaningful keywords from content (filters out stop words)
2. **Checks MongoDB Cache** - Looks for previously analyzed keyword combinations
3. **Calls Datamuse API** - If cache miss, gets real word frequency data (100% free!)
4. **Stores in MongoDB** - Caches results for 30 days to avoid re-processing
5. **Calculates Uniqueness Score** - Scores 0-10 based on search frequency

## Console Logs to Watch For

When you analyze a URL with the backend running, you'll see:

```
[Content Analysis] Extracted 10 keywords: ['recipe', 'pumpkin', 'soup', 'ingredients', 'cooking']
[Keyword Rarity] Cache miss for: "cooking ingredients pumpkin recipe soup", querying external API...
[Keyword Rarity] "cooking ingredients pumpkin recipe soup" - Avg freq: 25.43, Estimated: 45,231
[Keyword Rarity] 💾 Stored in MongoDB - ID: 674..., Count: 45,231
[Keyword Rarity] ✅ Analysis complete - Score: 4/10, Level: somewhat-unique
```

**Next time** you analyze similar content:
```
[Keyword Rarity] Cache hit for: "cooking ingredients pumpkin recipe soup"
[Keyword Rarity] ✅ Analysis complete - Score: 4/10, Level: somewhat-unique
```

## New Diagnostic Endpoints

### 1. Check Stored Keywords (ENHANCED!)
```bash
GET http://localhost:5001/api/diagnostic/keywords
```

Now returns:
```json
{
  "success": true,
  "total": 15,
  "summary": {
    "mostCommon": [
      {
        "keywords": "chocolate cookies dessert recipe sugar",
        "searchCount": 450000,
        "score": { "score": 1, "level": "common" }
      }
    ],
    "leastCommon": [
      {
        "keywords": "fermented grandmother homemade kimchi recipe",
        "searchCount": 850,
        "score": { "score": 10, "level": "very-unique" }
      }
    ]
  },
  "recentAnalyses": [...]
}
```

**Shows you:**
- **Top 5 Most Common** keywords (highest search count) - these are generic topics
- **Top 5 Least Common** keywords (lowest search count) - MOST UNIQUE content!
- **Recent 20 analyses** with full details

### 2. Health Check
```bash
GET http://localhost:5001/api/diagnostic/health
```

Quick status check - shows if keyword caching is working.

### 3. Clear Cache (for testing)
```bash
DELETE http://localhost:5001/api/diagnostic/keywords/clear
```

Removes all cached keywords (useful for testing).

## Testing Steps

### Option 1: Browser (Easy)
1. Start your backend: `npm run dev`
2. Open browser: `http://localhost:5001/api/diagnostic/health`
3. Check `totalKeywordEntries` - should be 0 initially
4. Analyze a blog URL (use your frontend or Postman)
5. Refresh diagnostic endpoint - count should increase!

### Option 2: Postman/Thunder Client
1. `GET http://localhost:5001/api/diagnostic/health` - check status
2. `POST http://localhost:5001/api/analyze` with body:
   ```json
   {
     "url": "https://pinchofyum.com/recipes/pumpkin"
   }
   ```
3. Check console logs for keyword extraction
4. `GET http://localhost:5001/api/diagnostic/keywords` - view stored data

### Option 3: Command Line Script
```bash
node src/scripts/checkKeywords.js
```

## Uniqueness Scoring

| Search Count | Score | Level | Example |
|--------------|-------|-------|---------|
| < 1,000 | 10 | very-unique | "homemade fermented kimchi recipes grandmother" |
| 1,000 - 10,000 | 7 | moderately-unique | "sourdough starter troubleshooting tips" |
| 10,000 - 100,000 | 4 | somewhat-unique | "pumpkin soup recipe ingredients" |
| > 100,000 | 1 | common | "chocolate chip cookies recipe" |

## What Gets Stored in MongoDB

```javascript
{
  _id: ObjectId("674..."),
  keywords: "cooking ingredients pumpkin recipe soup", // sorted alphabetically
  searchCount: 45231,
  source: "manual", // 'manual' means Datamuse-based estimation
  lastChecked: ISODate("2025-11-28T..."),
  metadata: {
    topUrls: [],
    relatedSearches: [],
    queryTime: 1732809600000
  },
  createdAt: ISODate("2025-11-28T..."),
  updatedAt: ISODate("2025-11-28T...")
}
```

## Cache Behavior

- **TTL (Time To Live)**: 30 days - entries automatically deleted after
- **Cache Key**: Keywords sorted alphabetically (e.g., "cooking ingredients pumpkin recipe soup")
- **Reuse**: Same keywords analyzed again = instant cache hit, no API call!

## Troubleshooting

### No data being stored?
1. Check MongoDB connection in `.env` file
2. Look for errors in server console
3. Run: `GET http://localhost:5001/api/diagnostic/health`

### Cache not working?
1. Keywords might be slightly different (order matters before sorting)
2. Check `lastChecked` date - entries expire after 30 days
3. Clear cache and try again: `DELETE /api/diagnostic/keywords/clear`

### Want fresh data?
Cache automatically expires after 30 days, or you can clear it manually.

## Performance Impact

- **First Analysis**: ~500-1000ms (Datamuse API calls + MongoDB write)
- **Cached Analysis**: ~5-10ms (MongoDB read only)
- **MongoDB Storage**: ~200 bytes per keyword entry
- **Datamuse API**: 100% FREE, no rate limits

## Future Enhancements

Replace Datamuse estimation with **Google Custom Search API** for REAL search counts:
- Current: Estimates based on word frequency
- Future: Actual Google search result counts
- Free tier: 100 queries/day
- Would change `source: "manual"` to `source: "google"`
