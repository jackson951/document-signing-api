// src/config/swagger.js
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const dotenv = require("dotenv");

dotenv.config();

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Enterprise Document Signing API",
      version: "1.0.0",
      description: `
**Enterprise Document Signing API**

This API provides endpoints for:
- Authentication (JWT & API Keys)
- Document Upload & Management
- Signature Workflows
- Webhooks & Notifications
- Analytics & Reports

Built with Express + Prisma ORM.`,
      contact: {
        name: "DocSign API Support",
        email: "support@docsign.com",
        url: process.env.API_BASE_URL || "http://localhost:3000",
      },
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:3000/api/v1",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"], // auto-load route docs
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwaggerDocs(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("📘 Swagger Docs available at /api-docs");
}

module.exports = { setupSwaggerDocs, swaggerSpec };
