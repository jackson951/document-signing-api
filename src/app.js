// app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { setupSwaggerDocs } = require("./config/swagger");

// Load environment variables
dotenv.config();

const app = express();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);
app.use(
  helmet({
    contentSecurityPolicy: false, // adjust for production
  })
);

// ==========================
// Rate Limiting
// ==========================
const rateLimit = require("express-rate-limit");
const {
  basicRateLimiter,
  tenantRateLimiter,
} = require("./middleware/rateLimit");

// Global basic rate limiter (applied to all requests)
app.use(basicRateLimiter);

// Serve uploaded files (dev only — use signed URLs in prod)
app.use("/uploads", express.static(uploadDir));

// Swagger documentation
setupSwaggerDocs(app);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==========================
// API Routes (versioned)
// ==========================
const apiRouter = express.Router();

// Auth routes (public)
const authRoutes = require("./routes/auth.routes");
apiRouter.use("/auth", authRoutes);

// Import authenticate middleware
const { authenticate } = require("./middleware/auth");

// Protected routes with tenant-aware rate limiting
const documentRoutes = require("./routes/document.routes");
apiRouter.use("/documents", authenticate, tenantRateLimiter, documentRoutes);

const envelopeRoutes = require("./routes/envelope.routes");
apiRouter.use("/envelopes", authenticate, tenantRateLimiter, envelopeRoutes);

const templateRoutes = require("./routes/template.routes");
apiRouter.use("/templates", authenticate, tenantRateLimiter, templateRoutes);

const signerRoutes = require("./routes/signer.routes");
apiRouter.use("/signers", authenticate, tenantRateLimiter, signerRoutes);

const webhookRoutes = require("./routes/webhook.routes");
apiRouter.use("/webhooks", authenticate, tenantRateLimiter, webhookRoutes);

const signatureFieldRoutes = require("./routes/signatureField.routes");
apiRouter.use(
  "/signature-fields",
  authenticate,
  tenantRateLimiter,
  signatureFieldRoutes
);

// Mount API under /api/v1
app.use("/api/v1", apiRouter);

// ==========================
// Background Jobs
// ==========================
if (process.env.RUN_JOBS === "true") {
  require("./jobs");
  console.log("📅 Background jobs initialized...");
}

// ==========================
// Global Error Handler
// ==========================
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    type: "https://api.example.com/errors/internal-server-error",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred",
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    type: "https://api.example.com/errors/not-found",
    title: "Not Found",
    status: 404,
    detail: "Endpoint not found",
  });
});

module.exports = app;
