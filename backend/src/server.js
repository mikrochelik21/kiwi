import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import compression from "compression";
import helmet from "helmet";

import notesRoutes from "./routes/notesRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import analyzeRoutes from "./routes/analyzeRoutes.js";
import diagnosticRoutes from "./routes/diagnosticRoutes.js";
import { connectDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";
import validateEnv from "./config/validateEnv.js";
import logger from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

dotenv.config();

// Validate environment variables before starting
validateEnv();

const app = express();
const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to avoid breaking existing functionality
  crossOriginEmbedderPolicy: false
}));
app.use(compression()); // Compress all responses

// CORS configuration - must be before other middleware
if (process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:5001"],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 200
    })
  );
} else {
  // In production, allow same origin
  app.use(cors({
    credentials: false
  }));
}

// Body parser middleware
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Apply rate limiting only to API routes (not static files)
app.use("/api", rateLimiter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/analyze", analyzeRoutes);
app.use("/api/diagnostic", diagnosticRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// 404 handler for undefined routes (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.log("Server started on PORT:", PORT);
  });
});
