# 🥝 Kiwi - Complete Project Documentation

> **Comprehensive Blog Analysis Platform**  
> A full-stack MERN application that analyzes blogs across 8 key dimensions, providing actionable insights for content creators.

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Features & Capabilities](#features--capabilities)
4. [Technology Stack](#technology-stack)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Analysis Engine](#analysis-engine)
8. [Frontend Components](#frontend-components)
9. [Scoring System](#scoring-system)
10. [Setup & Installation](#setup--installation)
11. [Environment Configuration](#environment-configuration)
12. [Deployment Guide](#deployment-guide)
13. [Performance Optimization](#performance-optimization)
14. [Security & Rate Limiting](#security--rate-limiting)
15. [Error Handling](#error-handling)
16. [Future Enhancements](#future-enhancements)

---

## 🎯 Project Overview

### Purpose
Kiwi is designed to help food bloggers and content creators improve their online presence by analyzing their content across 8 critical dimensions: **Performance**, **Accessibility**, **SEO**, **Content Quality**, **User Experience**, **Monetization**, **Trust**, and **Security**.

### Target Users
- Food bloggers looking to improve their content quality
- Content creators wanting better SEO performance
- Publishers needing comprehensive site audits
- Digital marketers analyzing competitor content

### Key Value Propositions
1. **Comprehensive Analysis** - 200+ metrics analyzed per blog
2. **Real Performance Data** - Integration with Google PageSpeed Insights
3. **Actionable Recommendations** - Prioritized by impact and effort
4. **Dual Uniqueness Metrics** - Web-wide and industry-specific uniqueness scoring
5. **Interactive Metric Explorer** - 100+ metrics with detailed explanations
6. **Beautiful UX** - Kiwi-themed design with smooth animations

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Landing Page │  │ Analyze Page │  │ Results Page │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                    React Router (SPA)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Axios Client  │
                    └────────┬────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                        API LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Routes  │  │Analyze Routes│  │ Notes Routes │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                   Express Middleware                             │
│         (CORS, Auth, Error Handler, Rate Limiter)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Controllers   │
                    └────────┬────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Analysis Engine (Core)                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │ Performance │  │ Content     │  │ SEO         │      │   │
│  │  │ Analyzer    │  │ Analyzer    │  │ Analyzer    │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │ UX          │  │ Trust       │  │ Security    │      │   │
│  │  │ Analyzer    │  │ Analyzer    │  │ Analyzer    │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │  ┌─────────────┐  ┌─────────────┐                        │   │
│  │  │ Monetization│  │Accessibility│                        │   │
│  │  │ Analyzer    │  │ Analyzer    │                        │   │
│  │  └─────────────┘  └─────────────┘                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Recommendation Engine                             │   │
│  │  - E-E-A-T Recommendations                               │   │
│  │  - Performance Recommendations                           │   │
│  │  - SEO Recommendations                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬───────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼────────┐   ┌──────▼──────┐
│   MongoDB     │   │ Google PSI API  │   │ Datamuse API│
│   (Cache)     │   │ (Performance)   │   │ (Uniqueness)│
└───────────────┘   └─────────────────┘   └─────────────┘
        │
┌───────▼───────┐
│ Upstash Redis │
│(Rate Limiting)│
└───────────────┘
```

### Data Flow

1. **User Request** → Frontend (React)
2. **API Call** → Express Server (Rate Limited)
3. **HTML Fetch** → Target Blog URL (20s timeout)
4. **Parallel Analysis**:
   - PageSpeed Insights API (Performance metrics)
   - Datamuse API (Word frequency for uniqueness)
   - Content parsing (Cheerio/Puppeteer)
5. **Scoring** → 8 Module Scores + Overall Score
6. **Recommendations** → Impact-prioritized suggestions
7. **Cache Storage** → MongoDB (keyword frequencies only)
8. **Response** → JSON with scores, metrics, recommendations

---

## ✨ Features & Capabilities

### Core Features

#### 1. **Comprehensive Blog Analysis**
- **8 Analysis Modules** weighted by importance
- **200+ Individual Metrics** per blog
- **Real-time Processing** with 15-60 second analysis time
- **Smart Content Detection** to filter non-blog pages

#### 2. **Dual Uniqueness Analysis**
- **Web Uniqueness** - Comparison against general web using Datamuse API
- **Industry Uniqueness** - Comparison against food blog database
- Analyzes 5 least common keywords from 50 extracted terms
- 30-day MongoDB cache for keyword frequencies

#### 3. **Interactive Results Dashboard**
- **Overview Tab** - Quick summary with module breakdowns
- **Recommendations Tab** - Prioritized action items with impact scores
- **Module Details Tab** - Two view modes:
  - **Grid View**: Traditional module cards with metrics
  - **Explorer View**: Searchable metric library with 100+ definitions

#### 4. **Metric Explorer**
100+ metrics organized by category:
- **Performance** (30 metrics) - LCP, CLS, FCP, TBT, TTFB, page weight, etc.
- **Content** (12 metrics) - Word count, readability, engagement, freshness
- **SEO** (6 metrics) - Meta tags, structured data, social sharing
- **Accessibility** (3 metrics) - Headings, alt text, language tags
- **User Experience** (17 metrics) - Navigation, mobile, typography, layout
- **Trust** (4 metrics) - Identity pages, contact methods, legal pages
- **Security** (1 metric) - HTTPS encryption
- **Monetization** (11 metrics) - Ads, affiliates, CTAs, disclosures

Each metric includes:
- Clear description
- Why it matters (business impact)
- How it's calculated (methodology)
- Ideal range (benchmarks)
- Custom icon and color coding

#### 5. **Smart Recommendations**
- **Prioritized by Impact** - High/Medium/Low priority levels
- **Effort Estimation** - Shows expected implementation difficulty
- **Human-Friendly Language** - Conversational, actionable advice
- **Category-Based** - Organized by module for easy navigation

#### 6. **Export & Share**
- **PDF Export** - Clean one-page summary with overall and module scores
- **Share Functionality** - Native Web Share API support
- **Print-Optimized** - Special styling for physical printing

#### 7. **Performance Optimizations**
- **Parallel API Calls** - Simultaneous external requests
- **Smart Caching** - 30-day cache for keyword frequencies
- **Graceful Degradation** - Fallbacks for failed API calls
- **Rate Limiting** - 3 requests per 10 seconds per IP

### User Experience Features

#### Visual Design
- **Kiwi Theme** - Consistent green gradient branding
- **Animated Elements**:
  - Rotating kiwi loading screen
  - Falling kiwi particles (memoized for performance)
  - Shimmer effects on hover
  - Progress bar animations
  - Fade-in transitions
- **Glass Morphism** - Backdrop blur effects
- **Responsive Layout** - Mobile-first design

#### Interactive Elements
- **Searchable Metrics** - Real-time filtering across 100+ metrics
- **Category Filters** - Filter by Content, Performance, SEO, UX, Trust
- **View Mode Toggle** - Switch between Grid and Explorer views
- **Metric Details Modal** - Deep-dive into any metric with:
  - Why it matters
  - Calculation methodology
  - Ideal benchmarks
  - Current score

#### Accessibility
- **Keyboard Navigation** - Full keyboard support
- **Screen Reader Friendly** - Semantic HTML structure
- **Color Contrast** - WCAG compliant color schemes
- **Responsive Text** - Scalable font sizes

---

## 🔧 Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **Vite** | 6.0.3 | Build tool & dev server |
| **React Router** | 7.1.1 | Client-side routing |
| **TailwindCSS** | 3.4.17 | Utility-first CSS |
| **Lucide React** | 0.468.0 | Icon library |
| **Axios** | 1.7.9 | HTTP client |
| **Zustand** | 5.0.2 | State management |
| **React Hot Toast** | 2.4.1 | Notifications |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20+ | Runtime environment |
| **Express** | 4.21.2 | Web framework |
| **MongoDB** | - | Database (caching) |
| **Mongoose** | 8.9.3 | MongoDB ODM |
| **Puppeteer** | 23.11.1 | Headless browser |
| **Cheerio** | 1.0.0 | HTML parsing |
| **JWT** | 9.0.2 | Authentication |
| **Bcrypt** | 5.1.1 | Password hashing |

### External APIs

| Service | Purpose |
|---------|---------|
| **Google PageSpeed Insights** | Real Core Web Vitals data |
| **Datamuse API** | Word frequency for uniqueness scoring |
| **Upstash Redis** | Rate limiting (3 req/10s) |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Nodemon** | Auto-restart dev server |
| **PostCSS** | CSS processing |
| **Autoprefixer** | CSS vendor prefixes |

---

## 💾 Database Schema

### MongoDB Collections

#### 1. **User Collection**
```javascript
{
  _id: ObjectId,
  email: String (required, unique),
  password: String (hashed, required),
  name: String (required),
  createdAt: Date (default: now),
  updatedAt: Date (default: now)
}
```

#### 2. **Note Collection**
```javascript
{
  _id: ObjectId,
  title: String (required),
  content: String (required),
  userId: ObjectId (ref: 'User', required),
  isPinned: Boolean (default: false),
  createdAt: Date (default: now),
  updatedAt: Date (default: now)
}
```

#### 3. **WordFrequency Collection** (Cache)
```javascript
{
  _id: ObjectId,
  word: String (required, unique, lowercase),
  totalCount: Number (default: 0),
  urlCount: Number (default: 0), // Max blogs this word appeared in
  datamuseFrequency: Number (optional), // From Datamuse API
  lastUpdated: Date (default: now),
  createdAt: Date (default: now)
}

// Indexes
word: 1 (unique)
lastUpdated: 1 (for TTL or cleanup)
```

**Purpose**: 30-day cache for keyword analysis
- `word`: Lowercase keyword
- `totalCount`: Total occurrences across all analyzed blogs
- `urlCount`: Number of unique blogs containing this word
- `datamuseFrequency`: Frequency score from Datamuse API
- `lastUpdated`: Last cache update timestamp

#### 4. **KeywordFrequency Collection** (Legacy - unused)
```javascript
{
  _id: ObjectId,
  url: String,
  keywords: [{
    word: String,
    count: Number,
    datamuseFrequency: Number
  }],
  createdAt: Date
}
```

---

## 🔌 API Documentation

### Base URL
```
Development: http://localhost:5001/api
Production: https://your-domain.com/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}

Response: 200 OK
{
  "message": "User registered successfully",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response: 200 OK
{
  "message": "Login successful",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
// Sets HTTP-only cookie with JWT
```

#### Logout
```http
POST /auth/logout

Response: 200 OK
{
  "message": "Logout successful"
}
```

#### Get Current User
```http
GET /auth/me
Cookie: token=<jwt>

Response: 200 OK
{
  "_id": "...",
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Analysis Endpoints

#### Analyze Blog
```http
POST /analyze
Content-Type: application/json

{
  "url": "https://minimalistbaker.com/best-vegan-brownies/"
}

Response: 200 OK
{
  "url": "https://minimalistbaker.com/best-vegan-brownies/",
  "final_score": 87,
  "modules": {
    "performance": {
      "score": 85,
      "metrics": {
        "lcp_seconds": 2.1,
        "cls": 0.05,
        "fcp_seconds": 1.2,
        "tbt_ms": 150,
        "ttfb_ms": 450,
        "total_page_weight_mb": 1.8,
        "requests_count": 42,
        // ... 30+ performance metrics
      }
    },
    "content": {
      "score": 92,
      "metrics": {
        "word_count": 1850,
        "flesch_score": 68,
        "avg_sentence_length": 16,
        "reading_time_min": 8,
        "questions_count": 4,
        // ... 12+ content metrics
      }
    },
    "seo": {
      "score": 88,
      "metrics": {
        "title_cleaned": "Best Vegan Brownies",
        "canonical_present": true,
        "open_graph_present": true,
        "schema_present": true,
        // ... 6+ SEO metrics
      }
    },
    "accessibility": {
      "score": 90,
      "metrics": {
        "h1_present": true,
        "html_lang_present": true,
        "missing_alt_count": 2,
        // ... 3+ accessibility metrics
      }
    },
    "ux": {
      "score": 85,
      "metrics": {
        "mobile_responsive": true,
        "nav_link_count": 6,
        "has_search_feature": true,
        "base_font_size": 16,
        // ... 17+ UX metrics
      }
    },
    "monetization": {
      "score": 78,
      "metrics": {
        "ads_total": 4,
        "affiliate_links_count": 8,
        "has_disclosure": true,
        // ... 11+ monetization metrics
      }
    },
    "trust": {
      "score": 85,
      "metrics": {
        "identity_page_count": 2,
        "contact_methods_count": 3,
        "legal_page_count": 2,
        // ... 4+ trust metrics
      }
    },
    "security": {
      "score": 100,
      "metrics": {
        "https": true
      }
    }
  },
  "recommendations": [
    {
      "id": "perf-lcp",
      "title": "Optimize Largest Contentful Paint",
      "description": "Your LCP is 2.1s. Try preloading hero images and using a CDN.",
      "priority": "high",
      "impact": 8,
      "effort": "medium",
      "category": "performance"
    },
    // ... more recommendations
  ]
}

// Error Responses

// Insufficient Content
Response: 400 Bad Request
{
  "error": "Insufficient content for analysis",
  "message": "This page has only 45 content words. We need at least 100 words...",
  "wordCount": 45,
  "minimumRequired": 100,
  "suggestions": [
    "Ensure the URL points to a blog post or article with substantial text content",
    "Avoid homepages, search results, or landing pages with minimal text",
    "Check that the page is publicly accessible without login"
  ]
}

// Connection Failed
Response: 500 Internal Server Error
{
  "error": "Connection Failed",
  "message": "Unable to connect to the analysis server. Please try again...",
  "suggestions": [
    "Check if the backend server is running on http://localhost:5001",
    "Verify your internet connection",
    "Make sure CORS is properly configured"
  ]
}

// Rate Limit Exceeded
Response: 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 10 seconds.",
  "retryAfter": 10
}
```

### Notes Endpoints (Optional Feature)

#### Create Note
```http
POST /notes
Content-Type: application/json
Cookie: token=<jwt>

{
  "title": "My Note",
  "content": "Note content here"
}
```

#### Get All Notes
```http
GET /notes
Cookie: token=<jwt>
```

#### Update Note
```http
PUT /notes/:id
Content-Type: application/json
Cookie: token=<jwt>

{
  "title": "Updated Title",
  "content": "Updated content",
  "isPinned": true
}
```

#### Delete Note
```http
DELETE /notes/:id
Cookie: token=<jwt>
```

---

## 🧮 Analysis Engine

### Core Analysis Flow

```javascript
// analyzeController.js - Main Flow
async function analyzeUrl(url) {
  // 1. Validate URL
  validateUrl(url);
  
  // 2. Fetch HTML (20s timeout, 800KB max)
  const html = await fetchHtml(url);
  
  // 3. Parse with Cheerio
  const $ = cheerio.load(html);
  
  // 4. Extract content
  const content = extractMainContent($);
  
  // 5. Early exit check (minimum 100 words)
  if (content.wordCount < 100) {
    return insufficientContentError();
  }
  
  // 6. Parallel external API calls
  const [pageSpeedData, keywordData] = await Promise.all([
    fetchPageSpeedInsights(url),
    analyzeKeywords(content.keywords)
  ]);
  
  // 7. Run 8 module analyzers
  const performance = analyzePerformance($, pageSpeedData);
  const content = analyzeContent($, content);
  const seo = analyzeSEO($, html);
  const accessibility = analyzeAccessibility($);
  const ux = analyzeUX($);
  const monetization = analyzeMonetization($);
  const trust = analyzeTrust($);
  const security = analyzeSecurity(url);
  
  // 8. Calculate weighted final score
  const finalScore = calculateFinalScore({
    performance: performance.score * 0.20,
    accessibility: accessibility.score * 0.15,
    seo: seo.score * 0.20,
    content: content.score * 0.20,
    ux: ux.score * 0.12,
    monetization: monetization.score * 0.06,
    trust: trust.score * 0.04,
    security: security.score * 0.03
  });
  
  // 9. Generate recommendations
  const recommendations = generateRecommendations({
    performance,
    content,
    seo,
    // ... all modules
  });
  
  // 10. Return results
  return {
    url,
    final_score: finalScore,
    modules: { performance, content, seo, ... },
    recommendations
  };
}
```

### Module Analyzers

#### 1. Performance Analyzer
```javascript
// Core Web Vitals from PageSpeed Insights
const performance = {
  lcp_seconds: 2.1,      // Largest Contentful Paint (< 2.5s good)
  cls: 0.05,             // Cumulative Layout Shift (< 0.1 good)
  fcp_seconds: 1.2,      // First Contentful Paint (< 1.8s good)
  tbt_ms: 150,           // Total Blocking Time (< 300ms good)
  ttfb_ms: 450,          // Time to First Byte (< 600ms good)
  
  // Resource optimization
  total_page_weight_mb: 1.8,
  requests_count: 42,
  large_asset_count: 2,
  
  // Caching & CDN
  compression: 'gzip',
  cache_ttl_days: 365,
  cdn_detected: true,
  
  // Scoring (0-100)
  core_web_vitals_score: 85,
  load_cost_score: 78,
  network_efficiency_score: 82,
  caching_cdn_score: 90
};
```

#### 2. Content Analyzer
```javascript
const content = {
  // Basic metrics
  word_count: 1850,
  flesch_score: 68,          // Readability (60-70 is conversational)
  avg_sentence_length: 16,
  reading_time_min: 8,
  
  // Engagement
  questions_count: 4,
  call_to_actions_count: 3,
  storytelling_matches: 7,
  visuals_ratio: 1.5,       // Images per 500 words
  
  // Freshness
  days_since_published: 45,
  fresh_content: true,
  
  // Uniqueness (dual metrics)
  web_uniqueness: {
    score: 85,
    level: 'high-uniqueness',
    reasoning: 'Contains several rare culinary terms',
    details: {
      veryRareWords: ['aquafaba', 'tempeh', 'miso'],
      rareWords: ['umami', 'tahini'],
      uncommonWords: ['cashew', 'maple']
    }
  },
  database_uniqueness: {
    score: 72,
    level: 'moderate-uniqueness',
    reasoning: 'Moderately unique in food blog context',
    details: {
      veryRareWords: ['aquafaba'],
      rareWords: ['tempeh', 'miso'],
      uncommonWords: ['tahini', 'umami']
    }
  }
};
```

#### 3. SEO Analyzer
```javascript
const seo = {
  // Meta tags
  title_cleaned: 'Best Vegan Brownies',
  canonical_present: true,
  
  // Social sharing
  open_graph_present: true,
  twitter_card_present: true,
  
  // Structured data
  schema_present: true,  // JSON-LD recipe schema
  
  // Technical
  ttfb_ms: 450,
  sample_word_count: 165
};
```

#### 4. Accessibility Analyzer
```javascript
const accessibility = {
  // Semantic structure
  h1_present: true,
  html_lang_present: true,
  
  // Images
  missing_alt_count: 2,
  
  // Scoring components
  semantic_structure_points: 18,
  text_contrast_points: 15,
  image_accessibility_points: 12,
  aria_points: 10,
  keyboard_focus_points: 8
};
```

#### 5. UX Analyzer
```javascript
const ux = {
  // Mobile
  mobile_responsive: true,
  viewport_points: 20,
  responsive_image_ratio: 85,
  
  // Navigation
  nav_link_count: 6,
  has_search_feature: true,
  has_categories_or_tags: true,
  
  // Typography
  base_font_size: 16,
  line_height: 1.6,
  
  // Interaction
  large_tap_targets_ratio: 92,
  links_without_href: 0,
  
  // Ads
  ad_elements_count: 4,
  ads_above_fold: 1
};
```

#### 6. Monetization Analyzer
```javascript
const monetization = {
  // Ads
  ads_total: 4,
  ads_above_fold_count: 1,
  
  // Affiliates
  affiliate_links_count: 8,
  has_disclosure: true,
  affiliate_relevancy_ratio: 85,
  
  // Products
  buy_buttons_count: 2,
  product_cards_count: 3,
  
  // Email
  email_inputs_count: 1,
  
  // CTAs
  cta_count: 5,
  visible_ctas_ratio: 80,
  
  // Quality
  popup_count: 1,
  deceptive_patterns_count: 0
};
```

#### 7. Trust Analyzer
```javascript
const trust = {
  // Identity
  identity_page_count: 2,  // About, Author pages
  
  // Contact
  contact_methods_count: 3, // Email, form, social
  email_links: 2,
  
  // Legal
  legal_page_count: 2  // Privacy, Terms
};
```

#### 8. Security Analyzer
```javascript
const security = {
  https: true  // Always should be true
};
```

### Uniqueness Analysis Algorithm

```javascript
// Dual-layer uniqueness scoring
async function analyzeUniqueness(keywords) {
  // 1. Extract 50 keywords from content
  const keywords = extractKeywords(content, 50);
  
  // 2. Sort by frequency (ascending) to find least common
  const sortedKeywords = keywords.sort((a, b) => a.count - b.count);
  
  // 3. Take 5 least common keywords
  const targetKeywords = sortedKeywords.slice(0, 5);
  
  // 4. Parallel API calls for both metrics
  const [webScores, dbScores] = await Promise.all([
    analyzeWebUniqueness(targetKeywords),    // Datamuse API
    analyzeDatabaseUniqueness(targetKeywords) // MongoDB cache
  ]);
  
  // 5. Calculate web uniqueness (0-100)
  const webUniqueness = {
    score: calculateWebScore(webScores),
    level: getUniquenessLevel(score),
    details: {
      veryRareWords: webScores.filter(s => s.freq < 0.5),
      rareWords: webScores.filter(s => s.freq >= 0.5 && s.freq < 2),
      uncommonWords: webScores.filter(s => s.freq >= 2 && s.freq < 10)
    }
  };
  
  // 6. Calculate database uniqueness (0-100)
  const dbUniqueness = {
    score: calculateDbScore(dbScores),
    level: getUniquenessLevel(score),
    details: {
      veryRareWords: dbScores.filter(s => s.urlCount <= 2),
      rareWords: dbScores.filter(s => s.urlCount > 2 && s.urlCount <= 5),
      uncommonWords: dbScores.filter(s => s.urlCount > 5 && s.urlCount <= 15)
    }
  };
  
  // 7. Store in cache for future analyses
  await storeKeywordFrequencies(targetKeywords, webScores, dbScores);
  
  return { webUniqueness, dbUniqueness };
}

// Thresholds
Web Uniqueness (Datamuse frequency):
- Very Rare: < 0.5
- Rare: 0.5 - 2.0
- Uncommon: 2.0 - 10.0
- Common: > 10.0

Database Uniqueness (Blog count):
- Very Rare: ≤ 2 blogs
- Rare: 3-5 blogs
- Uncommon: 6-15 blogs
- Common: > 15 blogs
```

---

## 🎨 Frontend Components

### Page Components

#### 1. **LandingPage.jsx**
```jsx
// Main landing page for the application
// Features:
// - Hero section with kiwi theme
// - Feature highlights
// - CTA to analyze page
// - Particle animation background
```

#### 2. **AnalyzePage.jsx**
```jsx
// URL input and loading screen
// Features:
// - URL input form with validation
// - Animated rotating kiwi loader
// - Falling kiwi particles (memoized)
// - Progress ring animation
// - Real-time status updates
```

#### 3. **ResultsPage.jsx**
```jsx
// Main results dashboard
// Features:
// - Overall score card with circular progress
// - Module score cards (4 categories)
// - Tabbed interface:
//   - Overview: Quick module summaries
//   - Recommendations: Prioritized action items
//   - Module Details: Interactive metric explorer
// - Export PDF functionality
// - Share functionality
// - Error states for connection/content issues
```

#### 4. **HomePage.jsx**
```jsx
// Authenticated home page (optional)
// Features:
// - User dashboard
// - Saved notes
// - Quick analyze access
```

### Feature Components

#### 1. **ModuleDetails.jsx** (Main Innovation)
```jsx
// Interactive metric explorer with dual view modes
// Features:

// View Modes:
// - Grid View: Traditional module cards
// - Explorer View: Searchable metric library

// Search & Filter:
// - Real-time search across 100+ metrics
// - Category filters (Content, Performance, SEO, UX, Trust)
// - Instant filtering

// Metric Cards:
// - Icon, category, description
// - Current score/value
// - Gradient backgrounds
// - Hover effects

// Metric Detail Modal:
// - Why it matters (business impact)
// - How it's calculated (methodology)
// - Ideal range (benchmarks)
// - Category badge
// - Current value display

// Database:
const metricDatabase = {
  lcp_seconds: {
    name: 'Largest Contentful Paint',
    category: 'Performance',
    description: 'Time until main content is visible',
    why: 'Fast loading keeps visitors engaged...',
    calculation: 'Measures when the largest image...',
    ideal: 'Under 2.5 seconds',
    icon: '⚡',
    color: 'from-yellow-500 to-orange-500'
  },
  // ... 100+ more metrics
};
```

#### 2. **Navbar.jsx**
```jsx
// Navigation component
// Features:
// - Logo with kiwi
// - Navigation links
// - User authentication state
// - Mobile responsive menu
```

#### 3. **Footer.jsx**
```jsx
// Footer component
// Features:
// - Branding
// - Social links
// - Copyright
// - Kiwi emoji theming
```

#### 4. **ParticleCanvas.jsx**
```jsx
// Animated background particles
// Features:
// - Falling kiwi emojis
// - Randomized positions and speeds
// - CSS animations
// - Performance optimized
```

#### 5. **FloatingAnalyzeButton.jsx**
```jsx
// Fixed CTA button
// Features:
// - Sticky positioning
// - Gradient background
// - Hover animations
// - Quick access to analyze
```

#### 6. **NoteCard.jsx**
```jsx
// Individual note display (optional feature)
// Features:
// - Note content preview
// - Pin/unpin functionality
// - Edit/delete actions
```

### Utility Components

#### 1. **PageContainer.jsx**
```jsx
// Layout wrapper
// Features:
// - Consistent padding
// - Max-width container
// - Responsive spacing
```

#### 2. **NotesNotFound.jsx**
```jsx
// Empty state for notes
```

#### 3. **RateLimitedUI.jsx**
```jsx
// Rate limit error display
// Features:
// - Countdown timer
// - Retry button
// - User-friendly messaging
```

### Custom Hooks

#### 1. **useScrollAnimation.js**
```jsx
// Scroll-based animations
export const useScrollAnimation = () => {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return scrollY;
};
```

### State Management

#### 1. **authStore.js** (Zustand)
```javascript
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
  setCheckingAuth: (isChecking) => set({ isCheckingAuth: isChecking })
}));
```

---

## 📊 Scoring System

### Overall Score Calculation

```javascript
// Weighted aggregate score
finalScore = Math.round(
  (performance * 0.20) +      // 20%
  (accessibility * 0.15) +    // 15%
  (seo * 0.20) +              // 20%
  (content * 0.20) +          // 20%
  (ux * 0.12) +               // 12%
  (monetization * 0.06) +     // 6%
  (trust * 0.04) +            // 4%
  (security * 0.03)           // 3%
);  // Total: 100%
```

### Module Weight Rationale

| Module | Weight | Reasoning |
|--------|--------|-----------|
| **Performance** | 20% | Critical for user experience and SEO rankings |
| **Content** | 20% | Core value proposition of a blog |
| **SEO** | 20% | Essential for discoverability and traffic |
| **Accessibility** | 15% | Important for reach and compliance |
| **UX** | 12% | Affects engagement and conversions |
| **Monetization** | 6% | Important for creators but shouldn't dominate |
| **Trust** | 4% | Foundation for credibility |
| **Security** | 3% | Table stakes (HTTPS is standard) |

### Score Ranges

| Range | Label | Color | Meaning |
|-------|-------|-------|---------|
| 90-100 | Excellent | Green | Outstanding performance |
| 70-89 | Good | Teal | Solid performance |
| 50-69 | Fair | Yellow | Needs improvement |
| 30-49 | Poor | Orange | Significant issues |
| 0-29 | Critical | Red | Major problems |

### Uniqueness Scoring

#### Web Uniqueness (Datamuse-based)
```javascript
// Based on word frequency in general web corpus
Score Calculation:
- Very rare words (freq < 0.5): 25 points each
- Rare words (0.5-2): 15 points each
- Uncommon words (2-10): 10 points each
- Common words (>10): 5 points each

Maximum: 100 points (5 very rare words = 125, capped at 100)

Levels:
- 85-100: Very High Uniqueness
- 70-84: High Uniqueness
- 50-69: Moderate Uniqueness
- 30-49: Low Uniqueness
- 0-29: Very Low Uniqueness
```

#### Database Uniqueness (Food Blog Context)
```javascript
// Based on frequency in analyzed food blogs
Score Calculation:
- Very rare (≤2 blogs): 25 points each
- Rare (3-5 blogs): 15 points each
- Uncommon (6-15 blogs): 10 points each
- Common (>15 blogs): 5 points each

Maximum: 100 points (capped)

Levels: Same as web uniqueness
```

---

## ⚙️ Setup & Installation

### Prerequisites
- **Node.js** 20+ and npm
- **MongoDB** (local or Atlas)
- **Google PageSpeed Insights API Key** (optional but recommended)
- **Upstash Redis** account (for rate limiting)

### Backend Setup

1. **Clone Repository**
```bash
git clone https://github.com/yourusername/kiwi.git
cd kiwi
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Configure Environment Variables**
```bash
# backend/.env
NODE_ENV=development
PORT=5001

# MongoDB
MONGO_URI=mongodb://localhost:27017/kiwi
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/kiwi

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google PageSpeed Insights (Optional)
PAGESPEED_API_KEY=your-api-key-here

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token-here

# CORS
CLIENT_URL=http://localhost:5173
```

4. **Start Backend Server**
```bash
npm run dev
# Server runs on http://localhost:5001
```

### Frontend Setup

1. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

2. **Configure Environment Variables**
```bash
# frontend/.env
VITE_API_URL=http://localhost:5001
```

3. **Start Frontend Dev Server**
```bash
npm run dev
# Frontend runs on http://localhost:5173
```

### Database Setup

MongoDB will automatically create collections on first use. No manual setup required.

**Optional**: Create indexes for performance
```javascript
// In MongoDB shell or Compass
db.wordfrequencies.createIndex({ word: 1 }, { unique: true })
db.wordfrequencies.createIndex({ lastUpdated: 1 })
```

---

## 🔐 Environment Configuration

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment mode |
| `PORT` | No | 5001 | Server port |
| `MONGO_URI` | **Yes** | - | MongoDB connection string |
| `JWT_SECRET` | **Yes** | - | JWT signing secret |
| `PAGESPEED_API_KEY` | No | - | Google PSI API key |
| `UPSTASH_REDIS_REST_URL` | **Yes** | - | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | **Yes** | - | Upstash Redis token |
| `CLIENT_URL` | No | http://localhost:5173 | Frontend URL for CORS |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | http://localhost:5001 | Backend API URL |

### Production Environment Setup

#### Backend (.env.production)
```bash
NODE_ENV=production
PORT=5001
MONGO_URI=mongodb+srv://prod-user:password@cluster.mongodb.net/kiwi-prod
JWT_SECRET=complex-production-secret-minimum-32-characters
PAGESPEED_API_KEY=your-production-api-key
UPSTASH_REDIS_REST_URL=https://prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=production-token
CLIENT_URL=https://kiwi.yourdomain.com
```

#### Frontend (.env.production)
```bash
VITE_API_URL=https://api.kiwi.yourdomain.com
```

---

## 🚀 Deployment Guide

### Backend Deployment (Railway/Render/Heroku)

#### Using Railway

1. **Create Railway Account** at railway.app

2. **Create New Project**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Set environment variables
railway variables set MONGO_URI="mongodb+srv://..."
railway variables set JWT_SECRET="..."
railway variables set UPSTASH_REDIS_REST_URL="..."
railway variables set UPSTASH_REDIS_REST_TOKEN="..."
railway variables set CLIENT_URL="https://kiwi.yourdomain.com"

# Deploy
railway up
```

3. **Configure Custom Domain** (Optional)
- Add domain in Railway dashboard
- Update CLIENT_URL to match

#### Using Render

1. **Create Web Service**
- Connect GitHub repository
- Select `backend` directory
- Build Command: `npm install`
- Start Command: `npm start`

2. **Set Environment Variables** in Render dashboard

3. **Deploy** automatically on git push

### Frontend Deployment (Vercel/Netlify)

#### Using Vercel

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
cd frontend
vercel

# Follow prompts:
# - Root directory: frontend
# - Build command: npm run build
# - Output directory: dist
```

3. **Set Environment Variables**
```bash
vercel env add VITE_API_URL production
# Enter: https://api.kiwi.yourdomain.com
```

4. **Deploy Production**
```bash
vercel --prod
```

#### Using Netlify

1. **Build Locally**
```bash
cd frontend
npm run build
```

2. **Deploy to Netlify**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

3. **Set Environment Variables** in Netlify dashboard

### Database Deployment (MongoDB Atlas)

1. **Create MongoDB Atlas Account**

2. **Create Cluster**
- Choose cloud provider (AWS/GCP/Azure)
- Select region closest to backend server
- Choose tier (M0 Free tier for testing)

3. **Create Database User**
- Username: `kiwi-prod`
- Password: Generate strong password
- Permissions: Read/Write

4. **Configure Network Access**
- Add IP: `0.0.0.0/0` (allow all) for Railway/Render
- OR add specific IPs if known

5. **Get Connection String**
```
mongodb+srv://kiwi-prod:password@cluster.mongodb.net/kiwi-prod?retryWrites=true&w=majority
```

6. **Update Backend MONGO_URI**

### Post-Deployment Checklist

- [ ] Backend health check: `https://api.yourdomain.com/health`
- [ ] Frontend loads without errors
- [ ] Can analyze a blog successfully
- [ ] Rate limiting works (test 4 requests rapidly)
- [ ] CORS configured correctly
- [ ] HTTPS enabled on both frontend and backend
- [ ] Environment variables secured (not in code)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Error logging enabled (consider Sentry)
- [ ] Performance monitoring (consider New Relic)

---

## ⚡ Performance Optimization

### Backend Optimizations

#### 1. **Parallel API Calls**
```javascript
// Instead of sequential:
const pageSpeed = await fetchPageSpeed();
const keywords = await analyzeKeywords();

// Use parallel:
const [pageSpeed, keywords] = await Promise.all([
  fetchPageSpeed(),
  analyzeKeywords()
]);
```

#### 2. **Smart Caching**
```javascript
// 30-day cache for keyword frequencies
const cachedWord = await WordFrequency.findOne({
  word: keyword.toLowerCase(),
  lastUpdated: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
});

if (cachedWord) {
  return cachedWord.datamuseFrequency;
}
```

#### 3. **Timeouts & Limits**
```javascript
// HTML fetch with timeout
const response = await axios.get(url, {
  timeout: 20000,  // 20 seconds
  maxContentLength: 800 * 1024,  // 800KB
  maxRedirects: 5
});
```

#### 4. **Graceful Degradation**
```javascript
// PageSpeed Insights with fallback
let performanceData;
try {
  performanceData = await fetchPageSpeedInsights(url);
} catch (error) {
  logger.warn('PSI failed, using heuristics');
  performanceData = estimatePerformanceMetrics($);
}
```

### Frontend Optimizations

#### 1. **useMemo for Expensive Computations**
```jsx
// Prevent re-computation on every render
const kiwiPositions = useMemo(() => {
  return Array.from({ length: 15 }, () => ({
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${8 + Math.random() * 4}s`
  }));
}, []); // Empty deps = compute once
```

#### 2. **Code Splitting**
```jsx
// Lazy load heavy components
const ModuleDetails = lazy(() => import('./components/ModuleDetails'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <ModuleDetails results={results} />
</Suspense>
```

#### 3. **Image Optimization**
```jsx
// Use modern formats
<img 
  src="image.webp" 
  alt="Description"
  loading="lazy"
  width="800"
  height="600"
/>
```

#### 4. **Debounced Search**
```jsx
// Debounce search input
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useMemo(
  () => debounce((value) => setSearchTerm(value), 300),
  []
);
```

### Database Optimizations

#### 1. **Indexes**
```javascript
// Create indexes for frequent queries
wordSchema.index({ word: 1 }, { unique: true });
wordSchema.index({ lastUpdated: 1 });
```

#### 2. **Projection**
```javascript
// Only fetch needed fields
const user = await User.findById(id).select('name email');
```

#### 3. **Lean Queries**
```javascript
// Skip Mongoose overhead for read-only
const words = await WordFrequency.find({ word: { $in: keywords } }).lean();
```

---

## 🔒 Security & Rate Limiting

### Rate Limiting (Upstash Redis)

```javascript
// rateLimiter.js
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, '10 s'),  // 3 requests per 10 seconds
  analytics: true
});

export const rateLimiter = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again in 10 seconds.',
      retryAfter: Math.ceil((reset - Date.now()) / 1000)
    });
  }
  
  res.set({
    'X-RateLimit-Limit': limit,
    'X-RateLimit-Remaining': remaining,
    'X-RateLimit-Reset': new Date(reset).toISOString()
  });
  
  next();
};
```

### Authentication (JWT)

```javascript
// auth.js middleware
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};
```

### Password Security

```javascript
// User model
import bcrypt from 'bcryptjs';

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

### CORS Configuration

```javascript
// cors.js
export const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### Input Validation

```javascript
// validateEnv.js
import { z } from 'zod';

const envSchema = z.object({
  MONGO_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.string().regex(/^\d+$/),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1)
});

export const validateEnv = () => {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
};
```

### Security Best Practices

1. **HTTPS Only** - Always use HTTPS in production
2. **HTTP-Only Cookies** - Prevent XSS attacks
3. **Helmet.js** - Set security headers
4. **Input Sanitization** - Clean user inputs
5. **SQL/NoSQL Injection Prevention** - Use parameterized queries
6. **Rate Limiting** - Prevent abuse
7. **CORS** - Restrict origins
8. **Secrets Management** - Never commit .env files
9. **Dependency Updates** - Regular `npm audit`
10. **Error Messages** - Don't leak sensitive info

---

## 🐛 Error Handling

### Global Error Handler

```javascript
// errorHandler.js
export const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // MongoDB duplicate key
  if (err.code === 11000) {
    return res.status(400).json({ error: 'Duplicate entry' });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

### Frontend Error Handling

```jsx
// Error boundary
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// Axios error handling
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait.');
    } else if (error.response?.status === 500) {
      toast.error('Server error. Please try again.');
    }
    return Promise.reject(error);
  }
);
```

---

## 🚀 Future Enhancements

### Planned Features

1. **Historical Tracking**
   - Save analysis history per user
   - Track score improvements over time
   - Visualize trends with charts

2. **Competitor Analysis**
   - Compare multiple blogs side-by-side
   - Identify gaps and opportunities
   - Benchmark against industry leaders

3. **Automated Monitoring**
   - Schedule recurring analyses
   - Email alerts for score drops
   - Weekly/monthly reports

4. **AI-Enhanced Recommendations**
   - GPT-4 integration for personalized tips
   - Context-aware suggestions
   - Code generation for fixes

5. **Team Collaboration**
   - Multi-user accounts
   - Shared workspaces
   - Task assignment
   - Comment threads

6. **API Access**
   - RESTful API for integrations
   - Webhooks for automation
   - SDKs for popular languages

7. **Advanced Metrics**
   - Custom metric definitions
   - Weighted scoring customization
   - Industry-specific benchmarks

8. **Integration Ecosystem**
   - WordPress plugin
   - Chrome extension
   - Slack notifications
   - Zapier/Make.com connectors

### Technical Debt & Improvements

1. **Testing**
   - Unit tests (Jest/Vitest)
   - Integration tests
   - E2E tests (Playwright)
   - 80%+ coverage goal

2. **Documentation**
   - API documentation (Swagger/OpenAPI)
   - Component documentation (Storybook)
   - Video tutorials
   - Migration guides

3. **Performance**
   - Server-side caching (Redis)
   - CDN for static assets
   - Image optimization pipeline
   - Bundle size reduction

4. **Monitoring**
   - APM (New Relic/Datadog)
   - Error tracking (Sentry)
   - Analytics (Mixpanel/Amplitude)
   - Uptime monitoring

5. **Scalability**
   - Horizontal scaling
   - Load balancing
   - Database sharding
   - Microservices architecture

---

## 📞 Support & Contact

### Documentation
- **GitHub**: https://github.com/yourusername/kiwi
- **Docs**: https://docs.kiwi.dev (coming soon)

### Community
- **Discord**: Join our community (coming soon)
- **Twitter**: @KiwiAnalyze (coming soon)

### Commercial Support
- **Email**: support@kiwi.dev
- **Enterprise**: enterprise@kiwi.dev

---

## 📄 License

MIT License

Copyright (c) 2025 Kiwi Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

<p align="center">
  <strong>Made with 🥝 for creators who care about quality</strong><br>
  <em>Analyze. Improve. Succeed.</em>
</p>
