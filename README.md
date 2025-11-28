<h1 align="center">🥝 Kiwi - Blog Analysis Tool ✨</h1>

![Demo App](/frontend/public/screenshot-for-readme.png)

<p align="center">
  <strong>Comprehensive blog analysis powered by real metrics</strong><br>
  Analyze content quality, UX, performance, SEO, and more — all in one place.
</p>

---

## 🌟 Overview

**Kiwi** is a fullstack web application that provides in-depth analysis of any blog across 8 key modules. Perfect for creators and bloggers who want to improve their online presence with actionable insights.

### ✨ Key Features

- 🎯 **8 Comprehensive Analysis Modules**
  - Performance (20%) - Core Web Vitals, load times, optimization
  - Accessibility (15%) - WCAG compliance, semantic structure
  - SEO (20%) - Meta tags, keywords, structured data
  - Content Quality (20%) - Readability, engagement, uniqueness
  - UX (12%) - Navigation, searchability, mobile usability
  - Monetization (6%) - Ad placement, affiliate optimization
  - Trust (4%) - Author credibility, content reliability, social proof
  - Security (3%) - HTTPS, CSP, secure headers

- 🧠 **Smart Analysis Engine**
  - 200+ individual metrics per blog
  - Real PageSpeed metrics (LCP, CLS, FCP, TBT, TTFB) via Google PSI
  - Smart fallback to headless browser or heuristics when PSI is unavailable
  - Unique-topic detection via Datamuse-based keyword rarity + caches
  - Content engagement scoring (storytelling, interactivity, visuals)
  - Search & discovery optimization metrics

- 📊 **Actionable Recommendations**
  - Prioritized improvement suggestions
  - Impact and effort ratings (high/medium/low)
  - Code examples for quick implementation
  - Rule-based and LLM-enhanced insights

- 🎨 **Beautiful UI**
  - Kiwi-themed design with green gradients
  - Rotating kiwi loading animation
  - Responsive across all devices
  - Glass morphism and smooth animations

- ⚡ **Real-Time Analysis**
  - Synchronous analysis endpoint for instant results
  - Google PageSpeed Insights for real web vitals when available
  - Cheerio-based parsing with Puppeteer fallback and safe heuristics
  - Strict timeouts and size limits, parallel external calls
  - Upstash Redis rate limiting (3 requests/10 seconds)

---

## 🏗️ How It Works

### 1️⃣ **User Flow**

```
User enters blog URL → Kiwi analyzes (15-30 seconds) → Detailed results page
```

**Step-by-step:**
1. User visits landing page and clicks "Analyze"
2. Enters target blog URL (e.g., `minimalistbaker.com`)
3. Kiwi displays animated loading screen with rotating kiwi 🥝
4. Backend fetches HTML, analyzes 200+ metrics across 8 modules
5. Results page shows:
   - Overall score (0-100)
   - Individual module scores with breakdowns
   - Prioritized recommendations with code examples
   - Detailed metrics for each category

### 2️⃣ **Analysis Architecture**

```
Frontend (React) → Express API → Analysis Engine → MongoDB (caches only)
                ↓
             PageSpeed API → Puppeteer → Heuristics
                ↓
            8 Module Scoring Systems
```

**Backend Processing:**
- **Fetching & Parsing**: 20s timeout, max 800KB; Cheerio parsing with safe fallbacks
- **Performance Metrics**: Real LCP/CLS/FCP/TBT/TTFB via Google PSI when possible; Puppeteer or heuristics fallback
- **Content & Structure**: Readability, word count, headings, internal links, duplicates
- **Uniqueness**: Datamuse-based keyword rarity with 30-day Mongo cache
- **SEO & Accessibility**: Meta tags, JSON-LD, canonical, semantics, contrast
- **Trust & Security**: Author info, outbound links, HTTPS and key headers
- **Non-Blog Gating**: Early exit for home/search/portal pages or low content

- **Scoring**:
  - 0-100 per module with weighted aggregate
  - No percentile math; no analyzed-URL storage

- **Rate Limiting**: Upstash Redis (3 requests / 10s / IP)

### 3️⃣ **Tech Stack**

**Frontend:**
- React 18 with Vite
- React Router for navigation
- TailwindCSS + DaisyUI for styling
- Lucide React for icons
- React Hot Toast for notifications
- Zustand for auth state management

**Backend:**
- Node.js + Express
- MongoDB (via Mongoose) for lightweight caches (no results storage)
- Google PageSpeed Insights API (real vitals) + Puppeteer fallback
- Cheerio for fast HTML parsing
- Upstash Redis for rate limiting
- JWT authentication (optional)

---

## 🎨 Highlights

- 🥝 **Unique Kiwi Theme** - Consistent branding with green gradients and emoji
- 🔄 **Rotating Kiwi Loader** - Custom loading animation with circular progress ring
- 📱 **Fully Responsive** - Works seamlessly on mobile, tablet, and desktop
- 🎯 **Criteria-Aligned Scoring** - Readability, informativeness, engagement, uniqueness, searchability, layout, SEO
- 🧮 **Mathematically Sound** - All formulas verified, weights sum to 100%, proper normalization
- 🚀 **Production Ready** - Environment configs, error handling, CORS setup


### Frontend (`/frontend`)

```env
VITE_API_URL=http://localhost:5001
```

---

## 🔧 Run the Backend

```bash
cd backend
npm install
npm run dev
```

Server runs on `http://localhost:5001`

---

## 💻 Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## 📚 API Endpoints

### Analysis
- `POST /api/analyze` - Analyze a blog (blocks non-articles/low-content pages)
  - Body: `{ "url": "https://example.com" }`
  - Returns: Full analysis with scores, metrics, and recommendations

### Authentication (Optional)
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

---

## 🎯 Key Innovations

1. **Personalized Recommendations** - Short, blogger-friendly tips prioritized by impact
2. **Real Vitals Integration** - Uses PageSpeed data; falls back gracefully when needed
3. **Uniqueness Scoring** - Datamuse-based rarity with Mongo cache and diagnostics
4. **Non-Blog Gating** - Skips portals/homepages; focuses on real posts
5. **Parallelized & Timeboxed** - Faster evaluation with robust timeouts

---

## 🚀 Deployment Notes

- Set `NODE_ENV=production` in backend .env
- Configure MongoDB Atlas whitelist for production IPs
- Update `VITE_API_URL` to production backend URL
- Consider CDN for frontend assets
- Enable HTTPS in production

---

## 📄 License

MIT

---

<p align="center">Made with 🥝 for creators who care about quality</p>
