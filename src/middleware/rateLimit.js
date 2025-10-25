// src/middleware/rateLimit.js
const rateLimit = require("express-rate-limit");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Simple in-memory cache for tenant limits (refresh every 5 mins)
const tenantRateLimitCache = new Map();
const TENANT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTenantLimit(organizationId) {
  const now = Date.now();
  const cache = tenantRateLimitCache.get(organizationId);

  if (cache && now - cache.timestamp < TENANT_CACHE_TTL) {
    return cache.limit;
  }

  try {
    const tenant = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { rateLimit: true }, // Make sure this field exists in your Prisma schema
    });

    const limit = tenant?.rateLimit || 100;
    tenantRateLimitCache.set(organizationId, { limit, timestamp: now });
    return limit;
  } catch (err) {
    console.error("Error fetching tenant rate limit:", err);
    return 100;
  }
}

/**
 * Basic global rate limiter
 */
const basicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    type: "https://api.example.com/errors/rate-limit-exceeded",
    title: "Rate Limit Exceeded",
    status: 429,
    detail: "Too many requests from this IP, please try again later",
  },
});

/**
 * Tenant-aware rate limiter middleware
 */
const tenantRateLimiter = async (req, res, next) => {
  if (!req.user || req.user.isApiKey) {
    return next();
  }

  const max = await getTenantLimit(req.user.organizationId);

  // Create a limiter instance dynamically but synchronously now
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    keyGenerator: (r) => r.user.organizationId,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      type: "https://api.example.com/errors/rate-limit-exceeded",
      title: "Rate Limit Exceeded",
      status: 429,
      detail: "Your organization has exceeded the API request limit",
    },
  });

  limiter(req, res, next);
};

module.exports = {
  basicRateLimiter,
  tenantRateLimiter,
};
