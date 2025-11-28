import ratelimit from "../config/upstash.js";
import logger from "../lib/logger.js";

const rateLimiter = async (req, res, next) => {
  try {
    const { success } = await ratelimit.limit("my-rate-limit");

    if (!success) {
      return res.status(429).json({
        message: "Too many requests, please try again later",
      });
    }

    next();
  } catch (error) {
    logger.error("Rate limit error", error);
    // Allow request to proceed if rate limiting fails (fail open)
    next();
  }
};

export default rateLimiter;
