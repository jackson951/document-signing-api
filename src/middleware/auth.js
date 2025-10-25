const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../config");

/**
 * Authentication middleware - verifies JWT token or API key
 */
const authenticate = async (req, res, next) => {
  try {
    // Check for API key first
    const apiKey = req.headers["x-api-key"];
    if (apiKey) {
      const keyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        include: {
          organization: true,
          user: true,
        },
      });

      if (!keyRecord) {
        return res.status(401).json({
          type: "https://api.example.com/errors/invalid-api-key",
          title: "Invalid API Key",
          status: 401,
          detail: "The provided API key is invalid",
        });
      }

      // Check if API key is expired
      if (keyRecord.expiresAt && new Date() > new Date(keyRecord.expiresAt)) {
        return res.status(401).json({
          type: "https://api.example.com/errors/api-key-expired",
          title: "API Key Expired",
          status: 401,
          detail: "The provided API key has expired",
        });
      }

      // Attach user and organization to request
      req.user = {
        id: keyRecord.user?.id || null,
        email: keyRecord.user?.email || null,
        role: keyRecord.user?.role || "DEVELOPER",
        organizationId: keyRecord.organizationId,
        apiKey: keyRecord.key,
        isApiKey: true,
      };

      return next();
    }

    // Check for JWT token
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        type: "https://api.example.com/errors/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "No authentication token provided",
      });
    }

    // Verify JWT token
    jwt.verify(token, config.jwt.secret, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          type: "https://api.example.com/errors/invalid-token",
          title: "Invalid Token",
          status: 403,
          detail: "Invalid or expired authentication token",
        });
      }

      // Fetch user from database to ensure it still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { organization: true },
      });

      if (!user) {
        return res.status(404).json({
          type: "https://api.example.com/errors/user-not-found",
          title: "User Not Found",
          status: 404,
          detail: "User associated with this token no longer exists",
        });
      }

      // Attach user and organization to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: decoded.organizationId,
        isApiKey: false,
      };

      next();
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware - checks user role
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        type: "https://api.example.com/errors/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "You do not have permission to perform this action",
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
