import express from "express";
import { analyzeSite, analyzeSiteFast } from "../controllers/analyzeController.js";
import rateLimiter from "../middleware/rateLimiter.js";

const router = express.Router();

// POST /api/analyze  { url } - with rate limiting
router.post("/", rateLimiter, async (req, res) => {
  return analyzeSite(req, res);
});

// Optionally support GET /api/analyze?url=... - with rate limiting
router.get("/", rateLimiter, async (req, res) => {
  return analyzeSite(req, res);
});

// Fast cached parallel analysis endpoint
router.get("/fast", async (req, res) => {
  return analyzeSiteFast(req, res);
});
router.post("/fast", async (req, res) => {
  return analyzeSiteFast(req, res);
});

export default router;
