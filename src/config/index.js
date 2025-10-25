require("dotenv").config();

module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || "your_default_jwt_secret_here",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  },
  api: {
    baseUrl: process.env.API_BASE_URL || "http://localhost:3000",
  },
  database: {
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
};
