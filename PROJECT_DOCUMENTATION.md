# 🥝 Kiwi - Project Documentation

> **Comprehensive Blog Analysis Platform**  
> A full-stack MERN application that analyzes blogs across 8 key dimensions.

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [Setup & Installation](#setup--installation)
6. [Environment Configuration](#environment-configuration)
7. [API Endpoints](#api-endpoints)
8. [Deployment](#deployment)

---

## 🎯 Project Overview

Kiwi analyzes food blogs and content across **8 critical dimensions**:
- **Performance** (20%) - Core Web Vitals, load times
- **Content** (20%) - Readability, engagement, uniqueness  
- **SEO** (20%) - Meta tags, structured data
- **Accessibility** (15%) - WCAG compliance
- **User Experience** (12%) - Navigation, mobile usability
- **Monetization** (6%) - Ad optimization
- **Trust** (4%) - Author credibility
- **Security** (3%) - HTTPS, secure headers

**Key Capabilities:**
- Analyzes 200+ metrics per blog in 15-60 seconds
- Dual uniqueness scoring (web-wide vs food blog industry)
- Interactive metric explorer with 100+ definitions
- Actionable recommendations prioritized by impact
- Real performance data via Google PageSpeed Insights

---

## 🏗️ Architecture

**Client** (React + Vite) → **API** (Express) → **Analysis Engine** → **External APIs** (PageSpeed, Datamuse)
                                                   ↓
                                           **MongoDB** (cache only)
                                           **Redis** (rate limiting)

**Data Flow:**
1. User submits URL
2. Backend fetches HTML (20s timeout, 800KB max)
3. Parallel analysis across 8 modules
4. External API calls (PageSpeed for metrics, Datamuse for uniqueness)
5. Score calculation with weighted aggregate
6. Return results with recommendations

---

## ✨ Key Features

### 1. Comprehensive Analysis
- **8 Analysis Modules** with 200+ metrics
- **Real Performance Data** from Google PageSpeed Insights
- **Dual Uniqueness Scoring**:
  - Web uniqueness (vs general web using Datamuse API)
  - Industry uniqueness (vs food blog database)
  - Analyzes 5 least common keywords from 50 extracted

### 2. Interactive Metric Explorer
- **100+ metrics** organized by category
- **Two view modes**: Grid (module cards) & Explorer (searchable library)
- **Real-time search** and category filtering
- **Detailed explanations** for each metric (why it matters, calculation, ideal range)

### 3. Smart Recommendations
- Prioritized by impact (high/medium/low)
- Effort estimation
- Human-friendly, actionable advice

### 4. User Experience
- Kiwi-themed design with animations
- One-page PDF export
- Share functionality
- Fully responsive

---

## 🔧 Technology Stack

**Frontend:**
- React 18 + Vite
- React Router 7
- TailwindCSS
- Lucide Icons
- Zustand (state)
- Axios

**Backend:**
- Node.js + Express
- MongoDB + Mongoose (caching only)
- Puppeteer (headless browser)
- Cheerio (HTML parsing)
- JWT authentication
- Bcrypt (passwords)

**External Services:**
- Google PageSpeed Insights API
- Datamuse API (word frequency)
- Upstash Redis (rate limiting: 3 req/10s)

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- Upstash Redis account

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your credentials

npm run dev
# Runs on http://localhost:5001
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5001" > .env

npm run dev
# Runs on http://localhost:5173
```

---

## 🔐 Environment Configuration

### Backend (.env)

```bash
# Required
MONGO_URI=mongodb://localhost:27017/kiwi
JWT_SECRET=your-secret-key-min-32-chars
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Optional
NODE_ENV=development
PORT=5001
PAGESPEED_API_KEY=your-google-api-key
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:5001
```

---

## 🔌 API Endpoints

### Analysis

**POST** `/api/analyze`
```json
Request:
{
  "url": "https://example.com/blog-post"
}

Response (200):
{
  "url": "...",
  "final_score": 87,
  "modules": {
    "performance": { "score": 85, "metrics": {...} },
    "content": { "score": 92, "metrics": {...} },
    "seo": { "score": 88, "metrics": {...} },
    // ... 5 more modules
  },
  "recommendations": [...]
}

Errors:
400 - Insufficient content (< 100 words)
429 - Rate limit exceeded
500 - Server error
```

### Authentication (Optional)

- **POST** `/api/auth/register` - Create account
- **POST** `/api/auth/login` - Login (sets JWT cookie)
- **POST** `/api/auth/logout` - Logout
- **GET** `/api/auth/me` - Get current user

---

## 🚀 Deployment

### Backend (Railway/Render)

1. **Set environment variables** in platform dashboard
2. **Deploy** from GitHub repository
3. **Update** `CLIENT_URL` to production frontend URL

### Frontend (Vercel/Netlify)

1. **Connect** GitHub repository
2. **Build settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
3. **Set** `VITE_API_URL` environment variable
4. **Deploy**

### Database (MongoDB Atlas)

1. Create cluster
2. Create database user
3. Whitelist IP (0.0.0.0/0 for cloud platforms)
4. Update `MONGO_URI` in backend

---

<p align="center">
  <strong>Made with 🥝 for creators who care about quality</strong>
</p>
